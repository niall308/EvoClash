import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { tradeId, action } = await req.json();
    if (!tradeId || !['accept', 'decline', 'cancel'].includes(action)) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    let trade;
    try {
      const matches = await base44.asServiceRole.entities.TradeRequest.filter({ id: tradeId });
      trade = matches[0];
    } catch (_e) {
      trade = null;
    }
    if (!trade) return Response.json({ error: 'Trade not found' }, { status: 404 });

    if (action === 'cancel') {
      // Only the proposer of the trade may cancel it.
      if (user.id !== trade.created_by_id) return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (trade.status !== 'pending') return Response.json({ error: 'Trade is no longer pending' }, { status: 400 });
      await base44.asServiceRole.entities.TradeRequest.update(tradeId, { status: 'cancelled' });
      return Response.json({ status: 'cancelled' });
    }

    // Only the recipient of the trade may accept or decline it.
    if (user.id !== trade.toUserId) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (trade.status !== 'pending') return Response.json({ error: 'Trade is no longer pending' }, { status: 400 });

    if (action === 'decline') {
      await base44.asServiceRole.entities.TradeRequest.update(tradeId, { status: 'declined' });
      return Response.json({ status: 'declined' });
    }

    // action === 'accept': re-verify both cards still belong to the expected
    // owners right now (they may have been traded, deleted, or upgraded away
    // since the proposal was made) before touching anything.
    const proposerId = trade.created_by_id;
    const [fromMatches, toMatches] = await Promise.all([
      base44.asServiceRole.entities.Card.filter({ id: trade.fromCardId }),
      base44.asServiceRole.entities.Card.filter({ id: trade.toCardId }),
    ]);
    const fromCard = fromMatches[0];
    const toCard = toMatches[0];

    if (!fromCard || fromCard.created_by_id !== proposerId || !toCard || toCard.created_by_id !== trade.toUserId) {
      await base44.asServiceRole.entities.TradeRequest.update(tradeId, { status: 'declined' });
      return Response.json({ error: 'One of the cards is no longer available for this trade' }, { status: 409 });
    }

    const [proposerDecks, recipientDecks] = await Promise.all([
      base44.asServiceRole.entities.Deck.filter({ created_by_id: proposerId, isActive: true }),
      base44.asServiceRole.entities.Deck.filter({ created_by_id: trade.toUserId, isActive: true }),
    ]);
    const proposerDeckId = proposerDecks[0]?.id || null;
    const recipientDeckId = recipientDecks[0]?.id || null;

    // Swap ownership of the two cards.
    await Promise.all([
      base44.asServiceRole.entities.Card.update(fromCard.id, { created_by_id: trade.toUserId, deckId: recipientDeckId }),
      base44.asServiceRole.entities.Card.update(toCard.id, { created_by_id: proposerId, deckId: proposerDeckId }),
    ]);

    await base44.asServiceRole.entities.TradeRequest.update(tradeId, { status: 'completed' });

    return Response.json({ status: 'completed' });
  } catch (error) {
    console.error('respondTrade error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});