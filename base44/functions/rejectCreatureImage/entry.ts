import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { logCreatureEvent } from '../../shared/creatureImages.ts';

// POST { imageId, note }
// Rejects a CreatureImage: status=rejected, isGuide=false, isDefaultForTier=
// false, isDefault=false. The image is kept in history (not deleted) but is no
// longer a guide for the card generator. If the rejected image was the creature
// default, clears Creature.referenceImageUrl. Returns { image, creature }.
//
// Admin-only.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { imageId, note } = await req.json().catch(() => ({}));
    if (!imageId) return Response.json({ error: 'imageId is required' }, { status: 400 });

    const image = await base44.asServiceRole.entities.CreatureImage.get(imageId).catch(() => null);
    if (!image) return Response.json({ error: 'image not found' }, { status: 404 });

    const notes = [image.notes, note ? `rejected: ${note}` : 'rejected'].filter(Boolean).join(' | ');
    const updated = await base44.asServiceRole.entities.CreatureImage.update(imageId, {
      status: 'rejected',
      isGuide: false,
      isDefaultForTier: false,
      isDefault: false,
      notes,
    });

    let creature = null;
    if (image.isDefault) {
      creature = await base44.asServiceRole.entities.Creature.update(image.creatureId, {
        referenceImageUrl: '',
      });
      await logCreatureEvent(base44, {
        creatureId: image.creatureId,
        imageId,
        action: 'default_changed',
        userId: user.id,
        userName: user.fullName || user.email || '',
        note: 'cleared (previous default rejected)',
      });
    }
    await logCreatureEvent(base44, {
      creatureId: image.creatureId,
      imageId,
      action: 'reject_image',
      userId: user.id,
      userName: user.fullName || user.email || '',
      note: note || '',
    });
    return Response.json({ image: updated, creature });
  } catch (error) {
    console.error('rejectCreatureImage error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});