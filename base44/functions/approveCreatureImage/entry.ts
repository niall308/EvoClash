import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { logCreatureEvent } from '../../shared/creatureImages.ts';

// POST { imageId, setDefaultForTier, note }
// Approves a CreatureImage AS A GUIDE for the card generator: sets status=
// 'approved' and isGuide=true. When setDefaultForTier is true, also clears
// isDefaultForTier on every other same-creature+same-tier image and sets it on
// this one (at most one default guide per creature per tier). Does NOT create
// or alter any card. Returns { image }.
//
// Admin-only. Rejects with 409 if the image is still pending generation (no url).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { imageId, setDefaultForTier, note } = await req.json().catch(() => ({}));
    if (!imageId) return Response.json({ error: 'imageId is required' }, { status: 400 });

    const image = await base44.asServiceRole.entities.CreatureImage.get(imageId).catch(() => null);
    if (!image) return Response.json({ error: 'image not found' }, { status: 404 });
    if (!image.url) return Response.json({ error: 'image is still generating' }, { status: 409 });

    const notes = [image.notes, note ? `approved as guide: ${note}` : 'approved as guide'].filter(Boolean).join(' | ');
    const updated = await base44.asServiceRole.entities.CreatureImage.update(imageId, {
      status: 'approved',
      isGuide: true,
      notes,
    });

    if (setDefaultForTier) {
      const tierVal = image.tier || 1;
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
    }
    await logCreatureEvent(base44, {
      creatureId: image.creatureId,
      imageId,
      action: 'approve_guide',
      userId: user.id,
      userName: user.fullName || user.email || '',
      note: note || '',
      tier: image.tier || 1,
    });
    return Response.json({ image: updated });
  } catch (error) {
    console.error('approveCreatureImage error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});