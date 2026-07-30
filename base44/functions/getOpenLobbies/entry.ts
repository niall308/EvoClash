import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Lists publicly open offline lobbies (excluding the caller's own) along with
// the host's rank points and win/loss record, so a player can preview a host
// before deciding to join.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const lobbies = await base44.entities.GameLobby.filter({ status: 'open', matchType: 'offline' }, '-created_date', 30);
    const others = lobbies.filter((l) => l.created_by_id !== user.id);

    const hosts = await Promise.all(
      others.map((l) => base44.asServiceRole.entities.User.filter({ id: l.created_by_id }))
    );

    const openLobbies = others.map((l, i) => {
      const host = hosts[i][0];
      return {
        id: l.id,
        code: l.code,
        hostName: l.hostName || host?.username || host?.full_name || 'Player',
        rankPoints: host?.rankPoints || 0,
        wins: host?.wins || 0,
        losses: host?.losses || 0,
      };
    });

    return Response.json({ lobbies: openLobbies });
  } catch (error) {
    console.error('getOpenLobbies error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});