import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getRankIndex } from '../../shared/rankLogic.ts';

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'search';

    if (action === 'cancel') {
      const mine = await base44.entities.MatchQueue.filter({ created_by_id: user.id });
      for (const q of mine) {
        await base44.entities.MatchQueue.delete(q.id);
      }
      return Response.json({ status: 'cancelled' });
    }

    const mine = await base44.entities.MatchQueue.filter({ created_by_id: user.id });
    const myEntry = mine[0];
    if (myEntry?.status === 'matched') {
      return Response.json({ status: 'matched', matchCode: myEntry.matchCode });
    }

    const myRank = getRankIndex(user.rankPoints);
    const myWaitSeconds = myEntry ? (Date.now() - new Date(myEntry.created_date).getTime()) / 1000 : 0;
    const myTolerance = 1 + Math.floor(myWaitSeconds / 15);

    const candidates = await base44.asServiceRole.entities.MatchQueue.filter({ status: 'searching' });
    let bestCandidate = null;
    let bestDiff = Infinity;
    for (const c of candidates) {
      if (c.created_by_id === user.id) continue;
      const candWaitSeconds = (Date.now() - new Date(c.created_date).getTime()) / 1000;
      const candTolerance = 1 + Math.floor(candWaitSeconds / 15);
      const tolerance = Math.max(myTolerance, candTolerance);
      const diff = Math.abs(getRankIndex(c.rankPoints) - myRank);
      if (diff <= tolerance && diff < bestDiff) {
        bestDiff = diff;
        bestCandidate = c;
      }
    }

    if (bestCandidate) {
      const opponentMatches = await base44.asServiceRole.entities.User.filter({ id: bestCandidate.created_by_id });
      const opponentUser = opponentMatches[0];
      if (!opponentUser) {
        return Response.json({ status: 'searching' });
      }

      const [myDecks, oppDecks] = await Promise.all([
        base44.asServiceRole.entities.Deck.filter({ created_by_id: user.id, isActive: true }),
        base44.asServiceRole.entities.Deck.filter({ created_by_id: opponentUser.id, isActive: true }),
      ]);
      const myDeckCards = myDecks[0]
        ? await base44.asServiceRole.entities.Card.filter({ ownerId: user.id, deckId: myDecks[0].id })
        : [];
      const oppDeckCards = oppDecks[0]
        ? await base44.asServiceRole.entities.Card.filter({ ownerId: opponentUser.id, deckId: oppDecks[0].id })
        : [];
      const myCards = myDeckCards.length ? myDeckCards : await base44.asServiceRole.entities.Card.filter({ ownerId: user.id });
      const oppCards = oppDeckCards.length
        ? oppDeckCards
        : await base44.asServiceRole.entities.Card.filter({ ownerId: opponentUser.id });

      if (myCards.length < 15 || oppCards.length < 15) {
        return Response.json({ status: 'searching' });
      }

      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      await base44.asServiceRole.entities.PvpMatch.create({
        code,
        player1Id: user.id,
        player1Name: user.username || user.full_name,
        player2Id: opponentUser.id,
        player2Name: opponentUser.username || opponentUser.full_name,
        player1Rp: user.rankPoints || 0,
        player2Rp: opponentUser.rankPoints || 0,
        player1Pool: shuffle(myCards).slice(0, 15),
        player2Pool: shuffle(oppCards).slice(0, 15),
      });

      if (myEntry) {
        await base44.asServiceRole.entities.MatchQueue.update(myEntry.id, { status: 'matched', matchCode: code });
      } else {
        await base44.entities.MatchQueue.create({ rankPoints: user.rankPoints || 0, status: 'matched', matchCode: code });
      }
      await base44.asServiceRole.entities.MatchQueue.update(bestCandidate.id, { status: 'matched', matchCode: code });

      return Response.json({ status: 'matched', matchCode: code });
    }

    if (!myEntry) {
      await base44.entities.MatchQueue.create({ rankPoints: user.rankPoints || 0, status: 'searching' });
    }
    return Response.json({ status: 'searching' });
  } catch (error) {
    console.error('findMatch error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});