import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { logCreatureEvent, uniqueAttackSummary } from '../../shared/creatureImages.ts';

// POST { imageId }
// Returns the normalized "guide payload" the card generator is prefilled with
// when an admin chooses to use an approved guide image. Authoritative server-
// side guard: only images with status='approved' AND isGuide=true are accepted;
// a rejected/pending image returns 400 (the card generator cannot bypass this).
// Audits a 'guide_used' event. Returns { guide }.
//
// Admin-only.
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
    if (image.status !== 'approved' || !image.isGuide) {
      return Response.json({ error: 'image is not an approved guide' }, { status: 400 });
    }
    if (!image.url) return Response.json({ error: 'image has no url' }, { status: 409 });

    const creature = await base44.entities.Creature.get(image.creatureId).catch(() => null);
    const guide = {
      creatureId: image.creatureId,
      imageId: image.id,
      tier: image.tier || 1,
      imageUrl: image.url,
      promptText: image.prompt || '',
      stylePreset: image.stylePreset || '',
      uniqueAttackSummary: uniqueAttackSummary(creature),
    };
    await logCreatureEvent(base44, {
      creatureId: image.creatureId,
      imageId,
      action: 'guide_used',
      userId: user.id,
      userName: user.fullName || user.email || '',
      note: `tier ${image.tier || 1}`,
      tier: image.tier || 1,
    });
    return Response.json({ guide });
  } catch (error) {
    console.error('useGuideInCardGenerator error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});