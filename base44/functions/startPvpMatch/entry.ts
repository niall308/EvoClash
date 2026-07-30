import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { lobbyId } = await req.json();
    const lobbies = await base44.entities.GameLobby.filter({ id: lobbyId });
    const lobby = lobbies[0];
    if (!lobby) return Response.json({ error: 'Lobby not found' }, { status: 404 });
    if (lobby.created_by_id !== user.id) return Response.json({ error: 'Only the host can start the match' }, { status: 403 });
    if (!lobby.joinedUserId) return Response.json({ error: 'Waiting for another player to join' }, { status: 400 });

    const opponentMatches = await base44.asServiceRole.entities.User.filter({ id: lobby.joinedUserId });
    const opponentUser = opponentMatches[0];
    if (!opponentUser) return Response.json({ error: 'Opponent not found' }, { status: 404 });

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
      return Response.json({ error: 'Both players need at least 15 cards in their active deck' }, { status: 400 });
    }

    await base44.asServiceRole.entities.PvpMatch.create({
      code: lobby.code,
      matchType: lobby.matchType || 'live',
      player1Id: user.id,
      player1Name: user.username || user.full_name,
      player2Id: opponentUser.id,
      player2Name: opponentUser.username || opponentUser.full_name,
      player1Rp: user.rankPoints || 0,
      player2Rp: opponentUser.rankPoints || 0,
      player1Pool: shuffle(myCards).slice(0, 15),
      player2Pool: shuffle(oppCards).slice(0, 15),
    });

    await base44.entities.GameLobby.update(lobby.id, { status: 'in_progress' });

    return Response.json({ code: lobby.code });
  } catch (error) {
    console.error('startPvpMatch error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});