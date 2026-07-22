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

    const reciprocal = await base44.asServiceRole.entities.Friend.filter({ created_by_id: friendUserId, friendUserId: user.id });
    if (reciprocal.length === 0) return Response.json({ error: 'Not friends with this player' }, { status: 403 });

    const [friendUser] = await base44.asServiceRole.entities.User.filter({ id: friendUserId }, undefined, 1);
    if (!friendUser) return Response.json({ error: 'Player not found' }, { status: 404 });

    return Response.json({
      rankPoints: friendUser.rankPoints || 0,
      wins: friendUser.wins || 0,
      losses: friendUser.losses || 0,
    });
  } catch (error) {
    console.error('getFriendStats error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});