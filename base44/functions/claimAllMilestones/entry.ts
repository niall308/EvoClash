import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Single server call that claims every milestone the user has earned but not
// yet claimed. Mirrors claimMilestone's server-authoritative logic but batches
// all milestones into one round trip so the client's "Claim All" feels instant.
// Each milestone's earned-vs-claimed count is recomputed from the live user doc
// and the total coins + all claim counters are written in one updateMe, so
// there's no cross-milestone race and no way for the client to mint coins.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({} as any));
    const milestoneIds: string[] = Array.isArray(body?.milestoneIds) ? body.milestoneIds : [];
    if (milestoneIds.length === 0) {
      return Response.json({ coinsGained: 0, newTotal: user.coins || 0, claimed: 0 });
    }

    const claimCounts = user.milestoneClaimCounts || {};
    const nextClaimCounts = { ...claimCounts };
    let totalDelta = 0;
    let claimedCount = 0;

    for (const id of milestoneIds) {
      // Milestone read is open (rls read: null); resolve via service-role get.
      const milestone = await base44.asServiceRole.entities.Milestone.get(id);
      if (!milestone) continue;
      const currentClaimed = nextClaimCounts[milestone.id] || 0;
      const metricValue = (user as any)[milestone.metric] || 0;
      const earned = milestone.repeatable
        ? Math.floor(metricValue / milestone.target)
        : metricValue >= milestone.target
          ? 1
          : 0;
      if (earned <= currentClaimed) continue;
      totalDelta += (earned - currentClaimed) * (milestone.coinReward || 0);
      nextClaimCounts[milestone.id] = earned;
      claimedCount += 1;
    }

    if (totalDelta <= 0) {
      return Response.json({ coinsGained: 0, newTotal: user.coins || 0, claimed: 0 });
    }

    const newTotal = (user.coins || 0) + totalDelta;
    await base44.auth.updateMe({
      coins: newTotal,
      milestoneClaimCounts: nextClaimCounts,
    });

    return Response.json({ coinsGained: totalDelta, newTotal, claimed: claimedCount });
  } catch (error) {
    console.error("claimAllMilestones error:", error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}