import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { pickReward, getEstDateString } from '../../shared/dailyRewards.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const today = getEstDateString();
    if (user.lastDailyRewardClaimedAt === today) {
      return Response.json({ error: 'You already claimed your daily reward today' }, { status: 400 });
    }

    const reward = pickReward();
    const newTotal = (user.coins || 0) + reward;

    await base44.auth.updateMe({
      coins: newTotal,
      lastDailyRewardClaimedAt: today,
    });

    return Response.json({ reward, newTotal });
  } catch (error) {
    console.error('claimDailyReward error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});