import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { logCreatureEvent } from '../../shared/creatureImages.ts';

// POST { imageId }
// Sets a previously-approved guide image as the default for its tier: clears
// isDefaultForTier on every other image for the same (creature, tier), sets it
// on this one, and mirrors the url onto Creature.referenceImageUrl so the
// card-art generator uses it as the anatomy reference. Returns { image, creature }.
//
// Admin-only. The target image must be an approved guide with a url.
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
    if (image.status !== 'approved' || !image.isGuide || !image.url) {
      return Response.json({ error: 'only approved guide images can be set as default for a tier' }, { status: 409 });
    }

    const all = await base44.asServiceRole.entities.CreatureImage.filter({ creatureId: image.creatureId });
    await Promise.all(
      all.map((c) => {
        if (c.id === imageId) {
          return base44.asServiceRole.entities.CreatureImage.update(c.id, { isDefaultForTier: true, isDefault: true });
        }
        if (c.tier === image.tier && c.isDefaultForTier) {
          return base44.asServiceRole.entities.CreatureImage.update(c.id, { isDefaultForTier: false });
        }
        if (c.isDefault) {
          return base44.asServiceRole.entities.CreatureImage.update(c.id, { isDefault: false });
        }
        return Promise.resolve();
      })
    );
    const creature = await base44.asServiceRole.entities.Creature.update(image.creatureId, {
      referenceImageUrl: image.url,
    });
    await logCreatureEvent(base44, {
      creatureId: image.creatureId,
      imageId,
      action: 'set_default_tier',
      userId: user.id,
      userName: user.fullName || user.email || '',
      note: `tier ${image.tier}`,
    });
    return Response.json({ image, creature });
  } catch (error) {
    console.error('setDefaultCreatureImage error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});