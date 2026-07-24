import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const generateCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { requestId, action } = await req.json();
    if (!requestId || !['accept', 'decline'].includes(action)) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    const requests = await base44.asServiceRole.entities.BattleRequest.filter({ id: requestId });
    const battleRequest = requests[0];
    if (!battleRequest) return Response.json({ error: 'Request not found' }, { status: 404 });
    if (battleRequest.toUserId !== user.id) return Response.json({ error: 'Not your request' }, { status: 403 });
    if (battleRequest.status !== 'pending') return Response.json({ error: 'Request already resolved' }, { status: 400 });

    if (action === 'decline') {
      await base44.entities.BattleRequest.update(battleRequest.id, { status: 'declined' });
      return Response.json({ status: 'declined' });
    }

    const fromUsers = await base44.asServiceRole.entities.User.filter({ id: battleRequest.created_by_id });
    const fromUser = fromUsers[0];
    if (!fromUser) return Response.json({ error: 'Requesting player not found' }, { status: 404 });

    const [myDecks, oppDecks] = await Promise.all([
      base44.asServiceRole.entities.Deck.filter({ created_by_id: user.id, isActive: true }),
      base44.asServiceRole.entities.Deck.filter({ created_by_id: fromUser.id, isActive: true }),
    ]);
    const myDeckCards = myDecks[0]
      ? await base44.asServiceRole.entities.Card.filter({ created_by_id: user.id, deckId: myDecks[0].id })
      : [];
    const oppDeckCards = oppDecks[0]
      ? await base44.asServiceRole.entities.Card.filter({ created_by_id: fromUser.id, deckId: oppDecks[0].id })
      : [];
    const myCards = myDeckCards.length ? myDeckCards : await base44.asServiceRole.entities.Card.filter({ created_by_id: user.id });
    const oppCards = oppDeckCards.length
      ? oppDeckCards
      : await base44.asServiceRole.entities.Card.filter({ created_by_id: fromUser.id });

    if (myCards.length < 15 || oppCards.length < 15) {
      return Response.json({ error: 'Both players need at least 15 cards in their active deck' }, { status: 400 });
    }

    const code = generateCode();
    await base44.asServiceRole.entities.PvpMatch.create({
      code,
      player1Id: fromUser.id,
      player1Name: fromUser.username || fromUser.full_name,
      player2Id: user.id,
      player2Name: user.username || user.full_name,
      player1Rp: fromUser.rankPoints || 0,
      player2Rp: user.rankPoints || 0,
      player1Pool: shuffle(oppCards).slice(0, 15),
      player2Pool: shuffle(myCards).slice(0, 15),
    });

    await base44.entities.BattleRequest.update(battleRequest.id, { status: 'accepted', matchCode: code });

    return Response.json({ matchCode: code });
  } catch (error) {
    console.error('respondBattleRequest error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});