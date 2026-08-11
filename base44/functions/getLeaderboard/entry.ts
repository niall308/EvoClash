import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  getBotsForWinsLeaderboard,
  getBotsForStreakLeaderboard,
  getBotsForWeeklyLeaderboard,
} from '../../shared/leaderboardBots.ts';

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
      const users = await base44.asServiceRole.entities.User.list('-maxPvpWinStreak', 200);
      const real = users
        .filter((u) => u.role !== 'admin')
        .map((u) => ({ full_name: u.username || u.full_name || 'Anonymous', streak: u.maxPvpWinStreak || 0 }));
      const leaderboard = [...real, ...getBotsForStreakLeaderboard()]
        .sort((a, b) => b.streak - a.streak)
        .slice(0, 50);
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
      const candidateUserIds = Object.entries(winsByUser).sort((a, b) => b[1] - a[1]);

      const candidateUsers = await Promise.all(
        candidateUserIds.map(([userId]) => base44.asServiceRole.entities.User.filter({ id: userId }, undefined, 1))
      );
      const real = candidateUserIds
        .map(([userId, wins], i) => ({ user: candidateUsers[i]?.[0], wins }))
        .filter(({ user }) => user?.role !== 'admin')
        .map(({ user, wins }) => ({ full_name: user?.username || user?.full_name || 'Anonymous', wins }));
      const leaderboard = [...real, ...getBotsForWeeklyLeaderboard()]
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 50);
      return Response.json({ leaderboard });
    }

    const users = await base44.asServiceRole.entities.User.list('-pvpWins', 200);
    const real = users
      .filter((u) => u.role !== 'admin')
      .map((u) => ({
        full_name: u.username || u.full_name || 'Anonymous',
        wins: u.pvpWins || 0,
        losses: u.pvpLosses || 0,
      }));
    const leaderboard = [...real, ...getBotsForWinsLeaderboard()]
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 50);
    return Response.json({ leaderboard });
  } catch (error) {
    console.error('getLeaderboard error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});