import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { friendUserId } = await req.json();
    if (!friendUserId) return Response.json({ error: 'Missing friendUserId' }, { status: 400 });

    const friendship = await base44.entities.Friend.filter({ created_by_id: user.id, friendUserId });
    if (friendship.length === 0) return Response.json({ error: 'Not friends with this player' }, { status: 403 });

    const cards = await base44.asServiceRole.entities.Card.filter({ created_by_id: friendUserId });
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