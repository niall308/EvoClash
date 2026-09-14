import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { validateTier } from '../../shared/creatureImages.ts';

// POST { creatureId, tier? }
// Returns the approved guide images (status='approved', isGuide=true, has url)
// for a creature, optionally filtered to a single tier. Used by the card
// generator's Choose Guide step — only approved guides are returned, so
// pending/rejected images are never selectable. Read-only; any authenticated
// user may call it (CreatureImage read RLS is public).
//
// Returns { guides }.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const creatureId = body?.creatureId;
    const tier = body?.tier;
    if (!creatureId) return Response.json({ error: 'creatureId is required' }, { status: 400 });

    const all = await base44.asServiceRole.entities.CreatureImage.filter({ creatureId }, '-created_date');
    let guides = all.filter((i) => i.status === 'approved' && i.isGuide && !!i.url);
    if (tier != null && tier !== '') {
      let t;
      try { t = validateTier(tier); }
      catch (e) { return Response.json({ error: (e as Error).message }, { status: 400 }); }
      guides = guides.filter((i) => i.tier === t);
    }
    return Response.json({ guides });
  } catch (error) {
    console.error('getGuideImages error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});