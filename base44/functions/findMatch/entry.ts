import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getRankIndex } from '../../shared/rankLogic.ts';
import { countActiveOfflineMatches, MAX_ACTIVE_OFFLINE_MATCHES } from '../../shared/offlineBattle.ts';

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'search';
    const matchType = body.matchType === 'offline' ? 'offline' : 'live';

    if (action === 'cancel') {
      const mine = await base44.entities.MatchQueue.filter({ created_by_id: user.id, matchType });
      for (const q of mine) {
        await base44.entities.MatchQueue.delete(q.id);
      }
      return Response.json({ status: 'cancelled' });
    }

    const mine = await base44.entities.MatchQueue.filter({ created_by_id: user.id, matchType });
    const myEntry = mine[0];
    if (myEntry?.status === 'matched') {
      return Response.json({ status: 'matched', matchCode: myEntry.matchCode });
    }

    const myRank = getRankIndex(user.rankPoints);
    const myWaitSeconds = myEntry ? (Date.now() - new Date(myEntry.created_date).getTime()) / 1000 : 0;
    const myTolerance = 1 + Math.floor(myWaitSeconds / 15);

    const candidates = await base44.asServiceRole.entities.MatchQueue.filter({ status: 'searching', matchType });
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

    // Only one side of any given pair is allowed to create the match — otherwise two
    // users searching at the same moment can both pick each other as the best candidate
    // and each independently create a separate PvpMatch, leaving one side of each match
    // with no real opponent (it silently stalls, or later times out/forfeits, which looks
    // like a random instant win/loss). Deterministically letting only the lexicographically
    // smaller user id create the match means at most one side of a pair ever does so; the
    // other side just keeps polling and picks up the resulting match on its next poll.
    if (bestCandidate && user.id > bestCandidate.created_by_id) {
      if (!myEntry) {
        await base44.entities.MatchQueue.create({ rankPoints: user.rankPoints || 0, matchType, status: 'searching' });
      }
      return Response.json({ status: 'searching' });
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

      if (matchType === 'offline') {
        const [myActive, oppActive] = await Promise.all([
          countActiveOfflineMatches(base44, user.id),
          countActiveOfflineMatches(base44, opponentUser.id),
        ]);
        if (myActive >= MAX_ACTIVE_OFFLINE_MATCHES || oppActive >= MAX_ACTIVE_OFFLINE_MATCHES) {
          return Response.json({ status: 'searching' });
        }
      }

      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      await base44.asServiceRole.entities.PvpMatch.create({
        code,
        matchType,
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
        await base44.entities.MatchQueue.create({ rankPoints: user.rankPoints || 0, matchType, status: 'matched', matchCode: code });
      }
      await base44.asServiceRole.entities.MatchQueue.update(bestCandidate.id, { status: 'matched', matchCode: code });

      return Response.json({ status: 'matched', matchCode: code });
    }

    if (!myEntry) {
      await base44.entities.MatchQueue.create({ rankPoints: user.rankPoints || 0, matchType, status: 'searching' });
    }
    return Response.json({ status: 'searching' });
  } catch (error) {
    console.error('findMatch error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});