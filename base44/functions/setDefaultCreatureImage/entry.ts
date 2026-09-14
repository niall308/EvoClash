import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { logCreatureEvent } from '../../shared/creatureImages.ts';

// POST { imageId }
// Sets a previously-approved image as the creature's default reference image:
// clears isDefault on every other image for the creature, sets it on this one,
// and mirrors the url onto Creature.referenceImageUrl. Returns { image, creature }.
//
// Admin-only. The target image must be approved and have a url.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { imageId } = await req.json().catch(() => ({}));
    if (!imageId) return Response.json({ error: 'imageId is required' }, { status: 400 });

    const image = await base44.asServiceRole.entities.CreatureImage.get(imageId).catch(() => null);
    if (!image) return Response.json({ error: 'image not found' }, { status: 404 });
    if (image.status !== 'approved' || !image.url) {
      return Response.json({ error: 'only approved images can be set as default' }, { status: 409 });
    }

    const all = await base44.asServiceRole.entities.CreatureImage.filter({ creatureId: image.creatureId });
    await Promise.all(
      all.map((c) =>
        c.id === imageId
          ? base44.asServiceRole.entities.CreatureImage.update(c.id, { isDefault: true })
          : c.isDefault
          ? base44.asServiceRole.entities.CreatureImage.update(c.id, { isDefault: false })
          : Promise.resolve()
      )
    );
    const creature = await base44.asServiceRole.entities.Creature.update(image.creatureId, {
      referenceImageUrl: image.url,
    });
    await logCreatureEvent(base44, {
      creatureId: image.creatureId,
      imageId,
      action: 'default_changed',
      userId: user.id,
      userName: user.fullName || user.email || '',
    });
    return Response.json({ image, creature });
  } catch (error) {
    console.error('setDefaultCreatureImage error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});