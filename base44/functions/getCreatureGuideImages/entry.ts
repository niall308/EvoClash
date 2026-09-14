import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { uniqueAttackSummary } from '../../shared/creatureImages.ts';

// POST { creatureId, tier? }
// Returns the normalized list of approved GUIDE images for a creature (status=
// 'approved' AND isGuide=true), optionally filtered by tier. Each entry carries
// the guide payload the card generator consumes: { imageId, tier, imageUrl,
// promptText, stylePreset, isDefaultForTier, uniqueAttackSummary }. Read-only;
// any authenticated admin/user can call (used to populate the card-generator
// guide picker).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { creatureId, tier } = await req.json().catch(() => ({}));
    if (!creatureId) return Response.json({ error: 'creatureId is required' }, { status: 400 });

    const all = await base44.asServiceRole.entities.CreatureImage.filter(
      { creatureId, status: 'approved', isGuide: true },
      '-created_date'
    );
    const creature = await base44.entities.Creature.get(creatureId).catch(() => null);
    const ua = uniqueAttackSummary(creature);

    let guides = all;
    if (tier !== undefined && tier !== null && tier !== '') {
      const t = Number(tier);
      guides = all.filter((g) => (g.tier || 1) === t);
    }
    const payload = guides.map((g) => ({
      imageId: g.id,
      tier: g.tier || 1,
      imageUrl: g.url,
      promptText: g.prompt || '',
      stylePreset: g.stylePreset || '',
      isDefaultForTier: !!g.isDefaultForTier,
      uniqueAttackSummary: ua,
    }));
    return Response.json({ guides: payload });
  } catch (error) {
    console.error('getCreatureGuideImages error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});