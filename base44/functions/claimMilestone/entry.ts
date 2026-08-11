import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Server-authoritative milestone claim. Closes the cross-device double-grant race:
// the client no longer computes coins or merges milestoneClaimCounts from a stale
// snapshot — the server re-reads the live user, recomputes earned vs. claimed, and
// only then writes coins + the claim counter in a single updateMe.
// Residual: two simultaneously-in-flight server requests could both read the same
// pre-claim state; the rare narrow window is accepted here (see audit RC-1 notes).
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({} as any));
    const milestoneId = body?.milestoneId;
    if (!milestoneId) return Response.json({ error: "milestoneId required" }, { status: 400 });

    // Milestone read is open (rls read: null); resolve via service-role get (user-scope
    // .get was returning not-found under the function-test invocation context).
    const milestone = await base44.asServiceRole.entities.Milestone.get(milestoneId);
    if (!milestone) return Response.json({ error: "Milestone not found" }, { status: 404 });

    const claimCounts = user.milestoneClaimCounts || {};
    const currentClaimed = claimCounts[milestone.id] || 0;
    const metricValue = (user as any)[milestone.metric] || 0;
    const earned = milestone.repeatable
      ? Math.floor(metricValue / milestone.target)
      : metricValue >= milestone.target
        ? 1
        : 0;

    if (earned <= currentClaimed) {
      return Response.json({
        coinsGained: 0,
        alreadyClaimed: true,
        newTotal: user.coins || 0,
        claimCount: currentClaimed,
      });
    }

    const delta = (earned - currentClaimed) * (milestone.coinReward || 0);
    const newTotal = (user.coins || 0) + delta;
    await base44.auth.updateMe({
      coins: newTotal,
      milestoneClaimCounts: { ...claimCounts, [milestone.id]: earned },
    });

    return Response.json({ coinsGained: delta, newTotal, claimCount: earned });
  } catch (error) {
    console.error("claimMilestone error:", error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}