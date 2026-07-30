import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

// Joining a publicly listed offline lobby immediately starts the match —
// there's no separate "host clicks start" step like the code-invite lobby flow.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { lobbyId } = await req.json();
    const lobbies = await base44.entities.GameLobby.filter({ id: lobbyId });
    const lobby = lobbies[0];
    if (!lobby) return Response.json({ error: 'Lobby not found' }, { status: 404 });
    if (lobby.status !== 'open' || lobby.matchType !== 'offline') {
      return Response.json({ error: 'Lobby is no longer open' }, { status: 400 });
    }
    if (lobby.created_by_id === user.id) return Response.json({ error: "You can't join your own lobby" }, { status: 400 });

    const hostMatches = await base44.asServiceRole.entities.User.filter({ id: lobby.created_by_id });
    const hostUser = hostMatches[0];
    if (!hostUser) return Response.json({ error: 'Host not found' }, { status: 404 });

    const [hostDecks, myDecks] = await Promise.all([
      base44.asServiceRole.entities.Deck.filter({ created_by_id: hostUser.id, isActive: true }),
      base44.asServiceRole.entities.Deck.filter({ created_by_id: user.id, isActive: true }),
    ]);
    const hostDeckCards = hostDecks[0]
      ? await base44.asServiceRole.entities.Card.filter({ ownerId: hostUser.id, deckId: hostDecks[0].id })
      : [];
    const myDeckCards = myDecks[0]
      ? await base44.asServiceRole.entities.Card.filter({ ownerId: user.id, deckId: myDecks[0].id })
      : [];
    const hostCards = hostDeckCards.length ? hostDeckCards : await base44.asServiceRole.entities.Card.filter({ ownerId: hostUser.id });
    const myCards = myDeckCards.length ? myDeckCards : await base44.asServiceRole.entities.Card.filter({ ownerId: user.id });

    if (hostCards.length < 15 || myCards.length < 15) {
      return Response.json({ error: 'Both players need at least 15 cards in their active deck' }, { status: 400 });
    }

    await base44.asServiceRole.entities.GameLobby.update(lobby.id, {
      status: 'in_progress',
      joinedUserId: user.id,
      joinedUserName: user.username || user.full_name,
    });

    await base44.asServiceRole.entities.PvpMatch.create({
      code: lobby.code,
      matchType: 'offline',
      player1Id: hostUser.id,
      player1Name: hostUser.username || hostUser.full_name,
      player2Id: user.id,
      player2Name: user.username || user.full_name,
      player1Rp: hostUser.rankPoints || 0,
      player2Rp: user.rankPoints || 0,
      player1Pool: shuffle(hostCards).slice(0, 15),
      player2Pool: shuffle(myCards).slice(0, 15),
    });

    if (hostUser.email && hostUser.notifyEmails === true && hostUser.notifyLobbyJoin === true) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: hostUser.email,
        subject: 'Someone joined your lobby!',
        body: `${user.username || user.full_name} joined your EvoClash lobby and the match has started!`,
      });
    }

    return Response.json({ code: lobby.code });
  } catch (error) {
    console.error('joinOpenLobby error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});