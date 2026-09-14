import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { logCreatureEvent } from '../../shared/creatureImages.ts';

// POST { imageId }
// Permanently deletes a CreatureImage record. If the deleted image was the
// creature's default reference (isDefault), clears Creature.referenceImageUrl
// so the card-art generator does not point at a dead URL. Logs an
// `image_deleted` audit event. Admin-only. Returns { creature }.
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
        note: 'cleared (previous default deleted)',
      });
    }

    await base44.asServiceRole.entities.CreatureImage.delete(imageId);
    await logCreatureEvent(base44, {
      creatureId: image.creatureId,
      imageId,
      action: 'image_deleted',
      userId: user.id,
      userName: user.fullName || user.email || '',
      note: `tier ${image.tier || 1} · ${image.generatedBy || 'base44-core'}`,
    });
    return Response.json({ creature });
  } catch (error) {
    console.error('deleteCreatureImage error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});