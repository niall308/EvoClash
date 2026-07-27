import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { calculateRPChange } from '../../shared/rankLogic.ts';

const COINS_WIN_HUMAN = 500;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Finish any active PvP match this player is part of, so the opponent's screen
    // resolves instead of hanging on "Finalizing match..." forever.
    const [asP1, asP2] = await Promise.all([
      base44.asServiceRole.entities.PvpMatch.filter({ player1Id: user.id, status: 'active' }),
      base44.asServiceRole.entities.PvpMatch.filter({ player2Id: user.id, status: 'active' }),
    ]);
    for (const match of [...asP1, ...asP2]) {
      const iAmP1 = match.player1Id === user.id;
      const opponentId = iAmP1 ? match.player2Id : match.player1Id;
      const opponents = await base44.asServiceRole.entities.User.filter({ id: opponentId });
      const opponent = opponents[0];
      if (opponent) {
        const { newRP } = calculateRPChange(opponent.rankPoints || 0, user.rankPoints || 0, true, opponent.pvpGamesPlayed || 0, opponent.currentPvpStreak || 0);
        const newPvpStreak = (opponent.currentPvpStreak || 0) > 0 ? (opponent.currentPvpStreak || 0) + 1 : 1;
        const newWinStreak = (opponent.currentWinStreak || 0) + 1;
        await base44.asServiceRole.entities.User.update(opponent.id, {
          rankPoints: newRP,
          pvpGamesPlayed: (opponent.pvpGamesPlayed || 0) + 1,
          pvpWins: (opponent.pvpWins || 0) + 1,
          wins: (opponent.wins || 0) + 1,
          gamesPlayed: (opponent.gamesPlayed || 0) + 1,
          coins: (opponent.coins || 0) + COINS_WIN_HUMAN,
          currentPvpStreak: newPvpStreak,
          currentWinStreak: newWinStreak,
          maxWinStreak: Math.max(opponent.maxWinStreak || 0, newWinStreak),
        });
      }
      await base44.asServiceRole.entities.PvpMatch.update(match.id, {
        status: 'finished',
        phase: 'matchEnd',
        winnerId: opponentId,
        log: 'Your opponent left the game — you win!',
        [`${iAmP1 ? 'player2' : 'player1'}CoinsEarned`]: COINS_WIN_HUMAN,
      });
    }

    // Clean up cross-user records so nothing keeps referencing the deleted account.
    const [sentRequests, receivedRequests, hostedLobbies, joinedLobbies, sentTrades, receivedTrades, friendEntries, reverseFriendEntries] =
      await Promise.all([
        base44.asServiceRole.entities.BattleRequest.filter({ created_by_id: user.id }),
        base44.asServiceRole.entities.BattleRequest.filter({ toUserId: user.id }),
        base44.asServiceRole.entities.GameLobby.filter({ created_by_id: user.id }),
        base44.asServiceRole.entities.GameLobby.filter({ joinedUserId: user.id }),
        base44.asServiceRole.entities.TradeRequest.filter({ created_by_id: user.id }),
        base44.asServiceRole.entities.TradeRequest.filter({ toUserId: user.id }),
        base44.asServiceRole.entities.Friend.filter({ created_by_id: user.id }),
        base44.asServiceRole.entities.Friend.filter({ friendUserId: user.id }),
      ]);

    await Promise.all([
      ...sentRequests.map((r) => base44.asServiceRole.entities.BattleRequest.delete(r.id)),
      ...receivedRequests.map((r) => base44.asServiceRole.entities.BattleRequest.delete(r.id)),
      ...hostedLobbies.map((l) => base44.asServiceRole.entities.GameLobby.delete(l.id)),
      ...joinedLobbies.map((l) => base44.asServiceRole.entities.GameLobby.delete(l.id)),
      ...sentTrades.map((t) => base44.asServiceRole.entities.TradeRequest.delete(t.id)),
      ...receivedTrades.map((t) => base44.asServiceRole.entities.TradeRequest.delete(t.id)),
      ...friendEntries.map((f) => base44.asServiceRole.entities.Friend.delete(f.id)),
      ...reverseFriendEntries.map((f) => base44.asServiceRole.entities.Friend.delete(f.id)),
      base44.asServiceRole.entities.Card.deleteMany({ ownerId: user.id }),
      base44.asServiceRole.entities.Deck.deleteMany({ created_by_id: user.id }),
      base44.asServiceRole.entities.BattleHistory.deleteMany({ created_by_id: user.id }),
      base44.asServiceRole.entities.MatchQueue.deleteMany({ created_by_id: user.id }),
    ]);

    await base44.asServiceRole.entities.User.delete(user.id);

    return Response.json({ status: 'deleted' });
  } catch (error) {
    console.error('deleteAccount error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});