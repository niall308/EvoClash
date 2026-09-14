import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  getImageProvider,
  buildCreatureImagePrompt,
  logCreatureEvent,
  MAX_GENERATE_COUNT,
  DEFAULT_STYLE_PRESET,
} from '../../shared/creatureImages.ts';

// POST { creatureId, prompt, count, style }
// Generates 1–5 images for an existing creature WITHOUT creating any card.
// Creates a pending CreatureImage record per requested image, calls the image
// provider, and fills in each record's url. Per-image failures are kept as
// pending records with errorMessage populated so the admin can see which failed.
// Returns { images: CreatureImage[] }.
//
// Admin-only. The generation is synchronous here (the platform GenerateImage
// integration returns a URL within seconds); records start at status 'pending'
// so an admin must explicitly approve before an image becomes selectable.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { creatureId, prompt, count, style } = await req.json().catch(() => ({}));
    if (!creatureId) return Response.json({ error: 'creatureId is required' }, { status: 400 });
    const promptText = (prompt || '').trim();
    if (!promptText) return Response.json({ error: 'prompt is required' }, { status: 400 });
    const n = Math.max(1, Math.min(MAX_GENERATE_COUNT, Math.round(Number(count) || 1)));
    const stylePreset = style || DEFAULT_STYLE_PRESET;

    const creature = await base44.entities.Creature.get(creatureId).catch(() => null);
    if (!creature) return Response.json({ error: 'creature not found' }, { status: 404 });

    const provider = getImageProvider();
    const fullPrompt = buildCreatureImagePrompt(creature, promptText, stylePreset);

    // 1. Create pending records up-front so the admin UI can show them immediately.
    const records = await Promise.all(
      Array.from({ length: n }, () =>
        base44.asServiceRole.entities.CreatureImage.create({
          creatureId,
          url: '',
          storageKey: '',
          status: 'pending',
          generatedBy: provider.name,
          authorId: user.id,
          authorName: user.fullName || user.email || '',
          prompt: promptText,
          stylePreset,
          isDefault: false,
        })
      )
    );
    await logCreatureEvent(base44, {
      creatureId,
      action: 'generate_requested',
      userId: user.id,
      userName: user.fullName || user.email || '',
      note: `${n} image(s), style=${stylePreset}, provider=${provider.name}`,
    });

    // 2. Generate each image in parallel and fill its record. A failure marks
    //    the record with errorMessage but keeps it (pending) for audit.
    await Promise.all(
      records.map((rec) =>
        provider
          .generateImages(base44, fullPrompt, 1)
          .then(async (out) => {
            const img = out[0];
            if (!img?.url) throw new Error('provider returned no url');
            await base44.asServiceRole.entities.CreatureImage.update(rec.id, {
              url: img.url,
              storageKey: img.storageKey || img.url,
            });
            await logCreatureEvent(base44, {
              creatureId,
              imageId: rec.id,
              action: 'generate_completed',
              userId: user.id,
              userName: user.fullName || user.email || '',
            });
          })
          .catch(async (err) => {
            await base44.asServiceRole.entities.CreatureImage.update(rec.id, {
              errorMessage: String(err?.message || err),
            });
            await logCreatureEvent(base44, {
              creatureId,
              imageId: rec.id,
              action: 'generate_failed',
              userId: user.id,
              userName: user.fullName || user.email || '',
              note: String(err?.message || err),
            });
          })
      )
    );

    const finalImages = await base44.asServiceRole.entities.CreatureImage.filter({ creatureId });
    return Response.json({ images: finalImages });
  } catch (error) {
    console.error('generateCreatureImages error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});