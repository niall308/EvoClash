import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Server-side mirror of type-change logic (gameConstants.js). Re-validates
// ownership, the one-time `typeChanged` flag, valid type, and coin cost so the
// client cannot bypass the one-time purchase via a direct Card.update call.
const TYPES = ['Fire', 'Lava', 'Water', 'Ice', 'Rock', 'Wind', 'Earth', 'Magic'];
const TYPE_CHANGE_COST = 100000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { cardId, newType } = await req.json();
    if (!cardId || !newType) return Response.json({ error: 'cardId and newType are required' }, { status: 400 });
    if (!TYPES.includes(newType)) return Response.json({ error: 'Invalid type' }, { status: 400 });

    const card = await base44.entities.Card.get(cardId);
    if (!card || card.ownerId !== user.id) return Response.json({ error: 'Card not found' }, { status: 404 });
    if (card.isHybrid) return Response.json({ error: 'Cannot change a hybrid card type' }, { status: 400 });
    if (card.typeChanged) return Response.json({ error: 'Type can only be changed once' }, { status: 400 });
    if (card.type === newType) return Response.json({ error: 'Card is already this type' }, { status: 400 });
    if ((user.coins || 0) < TYPE_CHANGE_COST) return Response.json({ error: 'Not enough coins' }, { status: 400 });

    await base44.entities.Card.update(card.id, { type: newType, typeChanged: true });
    const updatedUser = await base44.auth.updateMe({ coins: user.coins - TYPE_CHANGE_COST });

    return Response.json({ card: { ...card, type: newType, typeChanged: true }, user: updatedUser });
  } catch (error) {
    console.error('changeCardType error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});