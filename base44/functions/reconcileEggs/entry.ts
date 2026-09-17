import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { todayStrUTC, reconcileEggState } from "../../shared/eggHatch.ts";

// Login-time penalty reconciliation for every egg the calling player owns.
// Applies the missed-day subtraction (per egg) without charging any coins, so
// the penalty fires whether or not the player opens the eggs view. Called on
// app entry and whenever the Creature Eggs section is opened.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const today = todayStrUTC();
    const eggs = await base44.entities.Egg.filter({}, '-created_date');
    const updates: any[] = [];
    const result: any[] = [];
    for (const egg of eggs) {
      const recon = reconcileEggState(egg, today);
      const merged = { ...egg, progress: recon.progress, lastPaidDate: recon.lastPaidDate, lastSettledDate: recon.lastSettledDate };
      result.push(merged);
      if (recon.changed) {
        updates.push({ id: egg.id, progress: recon.progress, lastPaidDate: recon.lastPaidDate, lastSettledDate: recon.lastSettledDate });
      }
    }
    if (updates.length) await base44.entities.Egg.bulkUpdate(updates);

    return Response.json({ eggs: result });
  } catch (error) {
    console.error('reconcileEggs error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}