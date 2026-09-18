import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Returns a player's public profile (username, avatar, rank, win/loss record)
// plus the caller's head-to-head record against them. Works for ANY player —
// friend or not — so it can back the player-profile modal on every PvP screen.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { playerUserId } = await req.json();
    if (!playerUserId) return Response.json({ error: 'Missing playerUserId' }, { status: 400 });

    const [player] = await base44.asServiceRole.entities.User.filter({ id: playerUserId }, undefined, 1);
    if (!player) return Response.json({ error: 'Player not found' }, { status: 404 });

    const [matchesAsP1, matchesAsP2] = await Promise.all([
      base44.asServiceRole.entities.PvpMatch.filter({ player1Id: user.id, player2Id: playerUserId, status: 'finished' }),
      base44.asServiceRole.entities.PvpMatch.filter({ player1Id: playerUserId, player2Id: user.id, status: 'finished' }),
    ]);
    const headToHeadMatches = [...matchesAsP1, ...matchesAsP2];
    const myWins = headToHeadMatches.filter((m) => m.winnerId === user.id).length;
    const opponentWins = headToHeadMatches.filter((m) => m.winnerId === playerUserId).length;

    return Response.json({
      username: player.username || player.full_name || 'Player',
      profilePictureUrl: player.profilePictureUrl || '',
      rankPoints: player.rankPoints || 0,
      wins: player.wins || 0,
      losses: player.losses || 0,
      headToHead: {
        myWins,
        opponentWins,
        totalGames: headToHeadMatches.length,
      },
    });
  } catch (error) {
    console.error('getPlayerProfile error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});