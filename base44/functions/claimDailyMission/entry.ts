import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getEstDateString } from '../../shared/dailyRewards.ts';

// Server-authoritative daily-mission claim. The client used to grant coins and
// mark the mission claimed via base44.auth.updateMe. This re-verifies, against
// the authoritative server state, that the mission is actually completed (from
// the server-stored baseline) and not yet claimed today, then grants the coin
// reward server-side. Also ensures the daily baseline is fresh before checking.
// Mission definitions are mirrored server-side — never trusted from the client.
const MISSIONS = [
  { id: 'dailyWinThree', metric: 'wins', target: 3, coinReward: 300 },
  { id: 'dailyEvolveOne', metric: 'creaturesEvolved', target: 1, coinReward: 500 },
  { id: 'dailyPlayFive', metric: 'gamesPlayed', target: 5, coinReward: 200 },
];
const MISSION_METRICS = ['wins', 'creaturesEvolved', 'gamesPlayed'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { missionId } = await req.json().catch(() => ({}));
    const mission = MISSIONS.find((m) => m.id === missionId);
    if (!mission) return Response.json({ error: 'Invalid mission' }, { status: 400 });

    // Ensure today's baseline server-side before evaluating completion.
    let baseline: any = user.dailyMissionsBaseline || {};
    let claimed: string[] = Array.isArray(user.dailyMissionsClaimed) ? user.dailyMissionsClaimed : [];
    const today = getEstDateString();
    let dateUpdate: any = null;
    if (user.dailyMissionsDate !== today) {
      baseline = {};
      MISSION_METRICS.forEach((m) => { baseline[m] = (user as any)[m] || 0; });
      dateUpdate = { dailyMissionsDate: today, dailyMissionsBaseline: baseline, dailyMissionsClaimed: [] };
      claimed = [];
    }

    if (claimed.includes(mission.id)) {
      return Response.json({ error: 'Mission already claimed' }, { status: 400 });
    }
    const progress = Math.max(0, ((user as any)[mission.metric] || 0) - (baseline[mission.metric] || 0));
    if (progress < mission.target) {
      return Response.json({ error: 'Mission not completed' }, { status: 400 });
    }

    const update: any = {
      ...(dateUpdate || {}),
      coins: (user.coins || 0) + mission.coinReward,
      dailyMissionsClaimed: [...claimed, mission.id],
    };
    await base44.asServiceRole.entities.User.update(user.id, update);

    const fresh = await base44.auth.me();
    return Response.json({ user: fresh, coins: mission.coinReward });
  } catch (error) {
    console.error('claimDailyMission error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});