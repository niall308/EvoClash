import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getEstDateString } from '../../shared/dailyRewards.ts';

// Server-authoritative daily-mission baseline reset. The client used to write
// dailyMissionsDate / dailyMissionsBaseline / dailyMissionsClaimed directly via
// base44.auth.updateMe — client-writable progression counters that gate coin
// rewards. This recomputes the baseline server-side from the authoritative
// lifetime metrics, so a client can't forge a baseline to make missions appear
// completed or clear the claimed list to re-claim rewards.
const MISSION_METRICS = ['wins', 'creaturesEvolved', 'gamesPlayed'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const today = getEstDateString();
    if (user.dailyMissionsDate === today) {
      return Response.json({ user, reset: false });
    }

    const baseline: any = {};
    MISSION_METRICS.forEach((m) => { baseline[m] = (user as any)[m] || 0; });
    await base44.asServiceRole.entities.User.update(user.id, {
      dailyMissionsDate: today,
      dailyMissionsBaseline: baseline,
      dailyMissionsClaimed: [],
    });

    const fresh = await base44.auth.me();
    return Response.json({ user: fresh, reset: true });
  } catch (error) {
    console.error('ensureDailyMissions error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});