import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { EGG_DAILY_COST, EGG_HATCH_DAYS, todayStrUTC, reconcileEggState } from "../../shared/eggHatch.ts";

// Pays one daily 250-LC installment on a single egg. Always reconciles missed
// days first (subtracting progress for any full days since the last payment),
// then — if the egg hasn't already been paid today and the player can afford it
// — deducts 250 LC, advances progress by 1, and marks the egg 'ready' at 30/30.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({} as any));
    const eggId = body?.eggId;
    if (!eggId) return Response.json({ error: 'eggId required' }, { status: 400 });

    const egg = await base44.entities.Egg.get(eggId);
    if (!egg) return Response.json({ error: 'Egg not found' }, { status: 404 });

    const today = todayStrUTC();
    const recon = reconcileEggState(egg, today);
    let progress = recon.progress;
    let lastPaidDate = recon.lastPaidDate;
    let lastSettledDate = recon.lastSettledDate;
    let status = egg.status || 'incubating';
    let coinsDelta = 0;
    let paid = false;

    if (status === 'ready') {
      // Fully grown — no further payments accepted.
    } else if (lastPaidDate === today) {
      // Already paid today — still persist any reconcile that landed.
    } else if ((user.coins || 0) < EGG_DAILY_COST) {
      // Persist the missed-day reconcile even when the player can't pay today,
      // so the penalty isn't lost between sessions.
      if (recon.changed) {
        await base44.entities.Egg.update(eggId, { progress, lastPaidDate, lastSettledDate, status });
      }
      return Response.json({ error: 'Not enough coins' }, { status: 400 });
    } else {
      progress = Math.min(EGG_HATCH_DAYS, progress + 1);
      lastPaidDate = today;
      lastSettledDate = today;
      coinsDelta = -EGG_DAILY_COST;
      paid = true;
      if (progress >= EGG_HATCH_DAYS) status = 'ready';
    }

    await base44.entities.Egg.update(eggId, { progress, lastPaidDate, lastSettledDate, status });
    let updatedUser = user;
    if (coinsDelta !== 0) updatedUser = await base44.auth.updateMe({ coins: user.coins + coinsDelta });

    return Response.json({
      egg: { ...egg, progress, lastPaidDate, lastSettledDate, status },
      user: updatedUser,
      paid,
      missedDays: recon.missedDays,
    });
  } catch (error) {
    console.error('payHatchDay error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}