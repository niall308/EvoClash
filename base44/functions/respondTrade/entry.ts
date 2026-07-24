import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { tradeId, action } = await req.json();
    if (!tradeId || !['accept', 'decline', 'cancel', 'claimCard'].includes(action)) {
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

    if (action === 'claimCard') {
      if (trade.status !== 'completed') return Response.json({ error: 'Trade is not completed yet' }, { status: 400 });

      const isProposer = user.id === trade.created_by_id;
      const isRecipient = user.id === trade.toUserId;
      if (!isProposer && !isRecipient) return Response.json({ error: 'Forbidden' }, { status: 403 });

      const claimedField = isProposer ? 'proposerClaimed' : 'recipientClaimed';
      if (trade[claimedField]) return Response.json({ error: 'Already claimed' }, { status: 400 });

      // Proposer receives the recipient's card (toCard), recipient receives the proposer's card (fromCard).
      const cardIdToClaim = isProposer ? trade.toCardId : trade.fromCardId;
      const originalOwnerId = isProposer ? trade.toUserId : trade.created_by_id;

      const cardMatches = await base44.asServiceRole.entities.Card.filter({ id: cardIdToClaim });
      const card = cardMatches[0];
      if (!card || card.created_by_id !== originalOwnerId) {
        return Response.json({ error: 'This card is no longer available' }, { status: 409 });
      }

      const myCards = await base44.asServiceRole.entities.Card.filter({ created_by_id: user.id });
      if (myCards.length >= 50) {
        return Response.json({ error: 'Your deck is full' }, { status: 400 });
      }

      let myDecks = await base44.asServiceRole.entities.Deck.filter({ created_by_id: user.id, isActive: true });
      let myDeckId = myDecks[0]?.id;
      if (!myDeckId) {
        const allMyDecks = await base44.asServiceRole.entities.Deck.filter({ created_by_id: user.id });
        if (allMyDecks.length > 0) {
          myDeckId = allMyDecks[0].id;
          await base44.asServiceRole.entities.Deck.update(myDeckId, { isActive: true });
        } else {
          const newDeck = await base44.asServiceRole.entities.Deck.create({ name: "Deck 1", isActive: true, created_by_id: user.id });
          myDeckId = newDeck.id;
        }
      }

      // Conditional (compare-and-swap) updates: only apply if the card still
      // belongs to the expected original owner and the trade hasn't already
      // been claimed by this side, closing any read-then-write race window
      // that could otherwise let a card be claimed twice or out of turn.
      const cardUpdateResult = await base44.asServiceRole.entities.Card.updateMany(
        { id: card.id, created_by_id: originalOwnerId },
        { $set: { created_by_id: user.id, deckId: myDeckId } }
      );
      if (!cardUpdateResult || !cardUpdateResult.updated) {
        return Response.json({ error: 'This card is no longer available' }, { status: 409 });
      }

      const tradeUpdateResult = await base44.asServiceRole.entities.TradeRequest.updateMany(
        { id: tradeId, [claimedField]: false },
        { $set: { [claimedField]: true } }
      );
      if (!tradeUpdateResult || !tradeUpdateResult.updated) {
        return Response.json({ error: 'Already claimed' }, { status: 400 });
      }

      return Response.json({ status: 'claimed' });
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
    // since the proposal was made) before marking the trade completed. Cards
    // are not swapped here — each player claims their new card separately
    // (via the 'claimCard' action) once their deck has room for it.
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

    await base44.asServiceRole.entities.TradeRequest.update(tradeId, { status: 'completed' });

    return Response.json({ status: 'completed' });
  } catch (error) {
    console.error('respondTrade error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});