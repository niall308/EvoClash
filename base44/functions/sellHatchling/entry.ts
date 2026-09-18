import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Lets a player sell an egg-hatchling card they own for a flat 100,000 LC. The
// card is deleted and the player's coins are increased by SELL_VALUE. Scoped to
// egg hatchlings (isEggHatchling) so it can't be used to mint coins from any
// ordinary card.
const SELL_VALUE = 100000;

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { cardId } = await req.json().catch(() => ({} as any));
    if (!cardId) return Response.json({ error: 'cardId is required' }, { status: 400 });

    const card = await base44.entities.Card.get(cardId);
    if (!card || card.ownerId !== user.id) {
      return Response.json({ error: 'Card not found' }, { status: 404 });
    }
    if (!card.isEggHatchling) {
      return Response.json({ error: 'Only egg hatchlings can be sold here' }, { status: 400 });
    }

    await base44.entities.Card.delete(cardId);
    const updatedUser = await base44.auth.updateMe({ coins: (user.coins || 0) + SELL_VALUE });

    return Response.json({ cardId, user: updatedUser, coinsEarned: SELL_VALUE });
  } catch (error) {
    console.error('sellHatchling error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}