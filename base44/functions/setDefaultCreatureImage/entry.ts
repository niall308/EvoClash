import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { logCreatureEvent, validateTier } from '../../shared/creatureImages.ts';

// POST { imageId, tier? }
// Sets a default image. Two modes:
//  - `tier` provided: sets this image as the default GUIDE for that creature +
//    tier (isDefaultForTier). Clears isDefaultForTier on every other same-tier
//    image for the creature. The image must be an approved guide.
//  - `tier` omitted: sets this image as the creature-level default reference
//    (isDefault), mirrors its url onto Creature.referenceImageUrl (the field the
//    card-art generator reads), and clears isDefault on every other image for
//    the creature. The image must be approved with a url.
// Returns { image, creature }.
//
// Admin-only.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { imageId, tier } = await req.json().catch(() => ({}));
    if (!imageId) return Response.json({ error: 'imageId is required' }, { status: 400 });

    const image = await base44.asServiceRole.entities.CreatureImage.get(imageId).catch(() => null);
    if (!image) return Response.json({ error: 'image not found' }, { status: 404 });
    if (image.status !== 'approved' || !image.url) {
      return Response.json({ error: 'only approved images can be set as default' }, { status: 409 });
    }

    if (tier !== undefined) {
      const tv = validateTier(tier);
      if (!tv.ok) return Response.json({ error: tv.error }, { status: 400 });
      const tierVal = tv.value;
      if (!image.isGuide) {
        return Response.json({ error: 'only approved guides can be set as the tier default' }, { status: 409 });
      }
      const all = await base44.asServiceRole.entities.CreatureImage.filter({ creatureId: image.creatureId });
      await Promise.all(
        all.map((c) => {
          if (c.id === imageId) {
            return base44.asServiceRole.entities.CreatureImage.update(c.id, { isDefaultForTier: true });
          }
          if ((c.tier || 1) === tierVal && c.isDefaultForTier) {
            return base44.asServiceRole.entities.CreatureImage.update(c.id, { isDefaultForTier: false });
          }
          return Promise.resolve();
        })
      );
      await logCreatureEvent(base44, {
        creatureId: image.creatureId,
        imageId,
        action: 'set_default',
        userId: user.id,
        userName: user.fullName || user.email || '',
        note: `tier ${tierVal}`,
        tier: tierVal,
      });
      return Response.json({ image });
    }

    // creature-level default (existing behaviour)
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