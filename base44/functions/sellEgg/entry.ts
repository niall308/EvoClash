import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { EGG_SELL_VALUE } from "../../shared/eggHatch.ts";

// Lets a player sell an egg they own for a flat coin refund. The egg is
// deleted and the player's coins are increased by EGG_SELL_VALUE (50,000 LC).
// Works on incubating or ready eggs alike.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { eggId } = await req.json().catch(() => ({} as any));
    if (!eggId) return Response.json({ error: 'eggId is required' }, { status: 400 });

    const egg = await base44.entities.Egg.get(eggId);
    if (!egg || egg.created_by_id !== user.id) {
      return Response.json({ error: 'Egg not found' }, { status: 404 });
    }

    await base44.entities.Egg.delete(eggId);
    const updatedUser = await base44.auth.updateMe({ coins: (user.coins || 0) + EGG_SELL_VALUE });

    return Response.json({ eggId, user: updatedUser, coinsEarned: EGG_SELL_VALUE });
  } catch (error) {
    console.error('sellEgg error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}