import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allUsers = await base44.asServiceRole.entities.User.list('-wins', 500);
    const now = Date.now();

    const players = allUsers
      .map((u, index) => ({ u, rank: index + 1 }))
      .filter(({ u }) => u.id !== user.id)
      .slice(0, 30)
      .map(({ u, rank }) => ({
        id: u.id,
        full_name: u.full_name || 'Anonymous',
        wins: u.wins || 0,
        rank,
        online: u.lastSeenAt ? now - new Date(u.lastSeenAt).getTime() < ONLINE_WINDOW_MS : false,
      }));

    return Response.json({ players });
  } catch (error) {
    console.error('getLobbyPlayers error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});