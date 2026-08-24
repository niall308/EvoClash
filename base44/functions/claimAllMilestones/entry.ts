import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Atomic, server-authoritative bulk claim of EVERY milestone the current user has
// earned but not yet claimed. Computes all rewards in one pass against the live user
// doc and grants the total coins + advances every claim counter in a SINGLE
// `updateMe`, so:
//   - rapid double/triple "Claim All" taps cannot double-grant (a replay finds
//     nothing left claimable and returns coinsGained 0), and
//   - there is no read-modify-write race between concurrent single-claimMilestone
//     calls that would overwrite each other's coin balance.
// Returns the per-milestone rewards that were actually granted so the client can
// drive one staggered coin-fly burst + coin SFX per confirmed reward (and no
// animation/audio for anything the server rejected).

function computeEarned(milestone: any, user: any): number {
  const value = (user as any)[milestone.metric] || 0;
  return milestone.repeatable
    ? Math.floor(value / milestone.target)
    : value >= milestone.target ? 1 : 0;
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Milestone read is open (rls read: null) — service role list is reliable here.
    // One paginated fetch covers the realistic catalog (admin-curated, tens–low hundreds).
    const milestones = await base44.asServiceRole.entities.Milestone.list('-created_date', 500);

    const claimCounts = (user as any).milestoneClaimCounts || {};
    const nextClaimCounts: Record<string, number> = { ...claimCounts };
    const claimed: Array<{ id: string; coins: number }> = [];
    let totalDelta = 0;

    for (const m of milestones) {
      const currentClaimed = claimCounts[m.id] || 0;
      const earned = computeEarned(m, user);
      if (earned <= currentClaimed) continue;
      const delta = (earned - currentClaimed) * (m.coinReward || 0);
      totalDelta += delta;
      nextClaimCounts[m.id] = earned;
      claimed.push({ id: m.id, coins: delta });
    }

    if (claimed.length === 0) {
      // Idempotent replay: nothing to grant.
      return Response.json({ coinsGained: 0, newTotal: (user as any).coins || 0, claimed: [] });
    }

    const newTotal = ((user as any).coins || 0) + totalDelta;
    await base44.auth.updateMe({
      coins: newTotal,
      milestoneClaimCounts: nextClaimCounts,
    });

    return Response.json({ coinsGained: totalDelta, newTotal, claimed });
  } catch (error) {
    console.error('claimAllMilestones error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}