import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { canTradeWith } from '../../shared/tradeAccess.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { friendUserId } = await req.json();
    if (!friendUserId) return Response.json({ error: 'Missing friendUserId' }, { status: 400 });

    const allowed = await canTradeWith(base44, user.id, friendUserId);
    if (!allowed) return Response.json({ error: 'You can only trade with friends or recent opponents' }, { status: 403 });

    const cards = await base44.asServiceRole.entities.Card.filter({ ownerId: friendUserId });
    const slim = cards.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      tier: c.tier,
      attack: c.attack,
      defense: c.defense,
      bonusDamage: c.bonusDamage || 0,
      isHybrid: !!c.isHybrid,
      imageUrl: c.imageUrl,
    }));

    return Response.json({ cards: slim });
  } catch (error) {
    console.error('getFriendCards error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});