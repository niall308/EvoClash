import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import JSZip from 'npm:jszip@3.10.2';

// Admin-only bulk operation: replaces the egg-hatchling card art stored on
// Creature entities with cleaned images supplied in a zip. The zip must follow
// the same structure produced by the admin "Download All Images" button:
//   <sanitizedBaseName>/<baby|good|evil>/<index>.png
// Each image positionally replaces the matching entry in the creature's
// eggBabyImages / eggUpgradedGoodImages / eggUpgradedEvilImages arrays (index is
// 1-based, matching the download layout). Images at indices beyond the zip's
// range are preserved. New images are uploaded to public storage so the
// entity stores a permanent URL.
//
// POST { zipUrl: string }
const sanitize = (s) => String(s || '').replace(/[^a-zA-Z0-9_-]+/g, '_');

const SLOTS = {
  baby: 'eggBabyImages',
  good: 'eggUpgradedGoodImages',
  evil: 'eggUpgradedEvilImages',
};

const MIME = (name) => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  return 'image/png';
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const { zipUrl } = await req.json().catch(() => ({}));
    if (!zipUrl) return Response.json({ error: 'zipUrl is required' }, { status: 400 });

    const zipBuf = await fetch(zipUrl).then((r) => r.arrayBuffer());
    const zip = await JSZip.loadAsync(zipBuf);

    // Collect all image paths grouped by creature folder + slot.
    const entries = [];
    zip.forEach((path, entry) => {
      if (entry.dir) return;
      const parts = path.split('/');
      if (parts.length < 3) return;
      const folder = parts[0];
      const slot = parts[1];
      const fileName = parts.slice(2).join('/');
      if (!SLOTS[slot]) return;
      const idx = parseInt(fileName.split('.')[0], 10);
      if (!Number.isFinite(idx) || idx < 1) return;
      entries.push({ path, folder, slot, fileName, idx });
    });

    if (entries.length === 0) {
      return Response.json({ error: 'No matching images found in zip' }, { status: 400 });
    }

    // Load all creatures and index by sanitized baseName.
    const allCreatures = await base44.asServiceRole.entities.Creature.list('-created_date', 500);
    const byFolder = new Map();
    for (const c of allCreatures) {
      byFolder.set(sanitize(c.baseName), c);
    }

    // Group entries by creature folder.
    const byCreature = new Map();
    for (const e of entries) {
      if (!byCreature.has(e.folder)) byCreature.set(e.folder, []);
      byCreature.get(e.folder).push(e);
    }

    const results = [];
    for (const [folder, items] of byCreature) {
      const creature = byFolder.get(folder);
      if (!creature) {
        results.push({ folder, status: 'not_found' });
        continue;
      }

      const updates = {};
      for (const slotKey of Object.keys(SLOTS)) {
        updates[SLOTS[slotKey]] = Array.from(creature[SLOTS[slotKey]] || []);
      }

      for (const e of items) {
        const bytes = await zip.file(e.path).async('arraybuffer');
        const file = new File([bytes], e.fileName, { type: MIME(e.fileName) });
        const { file_url } = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file });
        const arr = updates[SLOTS[e.slot]];
        const i = e.idx - 1;
        while (arr.length < i) arr.push(arr[arr.length - 1] || '');
        if (i < arr.length) {
          arr[i] = file_url;
        } else {
          arr.push(file_url);
        }
      }

      await base44.asServiceRole.entities.Creature.update(creature.id, updates);
      results.push({
        folder,
        creature: creature.baseName,
        replaced: items.length,
        counts: {
          baby: updates.eggBabyImages.length,
          good: updates.eggUpgradedGoodImages.length,
          evil: updates.eggUpgradedEvilImages.length,
        },
      });
    }

    return Response.json({ totalImages: entries.length, results });
  } catch (error) {
    console.error('replaceEggImagesFromZip error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}