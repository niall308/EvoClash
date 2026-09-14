import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { logCreatureEvent, validateTier } from '../../shared/creatureImages.ts';

// POST { creatureId, url, tier, prompt, style }
// Records a manually-uploaded image (the client uploads the file via the
// UploadPublicFile integration first, then passes the resulting url here).
// `tier` defaults to 1 (clamped 1–4); optional prompt/style are stored for
// traceability. Creates a pending CreatureImage with generatedBy='manual' and
// isGuide=false. Does NOT create a card. Returns { image }.
//
// Admin-only.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { creatureId, url, tier, prompt, style } = await req.json().catch(() => ({}));
    if (!creatureId) return Response.json({ error: 'creatureId is required' }, { status: 400 });
    const imageUrl = (url || '').trim();
    if (!imageUrl) return Response.json({ error: 'url is required' }, { status: 400 });
    const tv = validateTier(tier === undefined ? 1 : tier);
    if (!tv.ok) return Response.json({ error: tv.error }, { status: 400 });
    const tierVal = tv.value;

    const creature = await base44.entities.Creature.get(creatureId).catch(() => null);
    if (!creature) return Response.json({ error: 'creature not found' }, { status: 404 });

    const image = await base44.asServiceRole.entities.CreatureImage.create({
      creatureId,
      tier: tierVal,
      url: imageUrl,
      storageKey: imageUrl,
      status: 'pending',
      isGuide: false,
      isDefaultForTier: false,
      generatedBy: 'manual',
      authorId: user.id,
      authorName: user.fullName || user.email || '',
      prompt: (prompt || '').trim(),
      stylePreset: style || '',
      isDefault: false,
    });
    await logCreatureEvent(base44, {
      creatureId,
      imageId: image.id,
      action: 'image_uploaded',
      userId: user.id,
      userName: user.fullName || user.email || '',
      note: `tier ${tierVal}`,
      tier: tierVal,
    });
    return Response.json({ image });
  } catch (error) {
    console.error('uploadCreatureImage error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});