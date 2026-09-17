import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { EGG_BUY_COST, EGG_MAX_OWNED, todayStrUTC } from "../../shared/eggHatch.ts";

// Purchases one creature egg for 500,000 LC. Enforces the 5-egg-per-player cap
// and the coin balance server-side so the client can't bypass either. Creates
// the egg with progress 0 and lastSettledDate = today (no penalty accrues on
// the purchase day).
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const owned = await base44.entities.Egg.filter({});
    if (owned.length >= EGG_MAX_OWNED) {
      return Response.json({ error: `You can only own ${EGG_MAX_OWNED} eggs at a time.`, status: 400 } as any, { status: 400 });
    }
    if ((user.coins || 0) < EGG_BUY_COST) {
      return Response.json({ error: 'Not enough coins' }, { status: 400 });
    }

    const today = todayStrUTC();
    const egg = await base44.entities.Egg.create({
      progress: 0,
      lastPaidDate: '',
      lastSettledDate: today,
      status: 'incubating',
    });
    const updatedUser = await base44.auth.updateMe({ coins: user.coins - EGG_BUY_COST });

    return Response.json({ egg, user: updatedUser });
  } catch (error) {
    console.error('buyEgg error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}