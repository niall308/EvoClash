import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// All three leaderboards are PvP-only (online + offline matches) — AI battle
// stats never feed into them.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const type = body?.type || 'wins';

    if (type === 'streak') {
      const users = await base44.asServiceRole.entities.User.list('-maxPvpWinStreak', 50);
      const leaderboard = users.map((u) => ({
        full_name: u.username || u.full_name || 'Anonymous',
        streak: u.maxPvpWinStreak || 0,
      }));
      return Response.json({ leaderboard });
    }

    if (type === 'weekly') {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const recentPvpWins = await base44.asServiceRole.entities.BattleHistory.filter(
        { source: 'pvp', outcome: 'win', created_date: { $gte: oneWeekAgo } },
        '-created_date',
        5000
      );

      const winsByUser = {};
      for (const record of recentPvpWins) {
        winsByUser[record.created_by_id] = (winsByUser[record.created_by_id] || 0) + 1;
      }
      const topUserIds = Object.entries(winsByUser)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50);

      const users = await Promise.all(
        topUserIds.map(([userId]) => base44.asServiceRole.entities.User.filter({ id: userId }, undefined, 1))
      );
      const leaderboard = topUserIds.map(([userId, wins], i) => {
        const u = users[i]?.[0];
        return { full_name: u?.username || u?.full_name || 'Anonymous', wins };
      });
      return Response.json({ leaderboard });
    }

    const users = await base44.asServiceRole.entities.User.list('-pvpWins', 50);
    const leaderboard = users.map((u) => ({
      full_name: u.username || u.full_name || 'Anonymous',
      wins: u.pvpWins || 0,
      losses: u.pvpLosses || 0,
    }));
    return Response.json({ leaderboard });
  } catch (error) {
    console.error('getLeaderboard error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});