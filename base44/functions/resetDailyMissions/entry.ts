import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getEstDateString } from '../../shared/dailyRewards.ts';

// Metrics tracked by DAILY_MISSIONS in src/lib/gameConstants.js — keep in sync.
const MISSION_METRICS = ['wins', 'creaturesEvolved', 'gamesPlayed'];

// Resets every user's daily mission progress. Runs on a schedule at midnight EST.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const user = await base44.auth.me().catch(() => null);
    const isAdmin = user && user.role === 'admin';
    const cronSecret = Deno.env.get('CRON_SECRET');
    const isAuthorizedCron = !!cronSecret && body?.cronToken === cronSecret;
    if (!isAdmin && !isAuthorizedCron) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = getEstDateString();
    const allUsers = await base44.asServiceRole.entities.User.list();

    const updates = allUsers.map((u) => {
      const baseline = {};
      MISSION_METRICS.forEach((metric) => {
        baseline[metric] = u[metric] || 0;
      });
      return { id: u.id, dailyMissionsDate: today, dailyMissionsBaseline: baseline, dailyMissionsClaimed: [] };
    });

    if (updates.length) {
      await base44.asServiceRole.entities.User.bulkUpdate(updates);
    }

    return Response.json({ resetCount: updates.length });
  } catch (error) {
    console.error('resetDailyMissions error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});