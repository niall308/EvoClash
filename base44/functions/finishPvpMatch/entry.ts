import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { calculateRPChange } from '../../shared/rankLogic.ts';

const COINS_WIN_HUMAN = 250;
const COINS_LOSS_HUMAN = 50;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { matchCode } = await req.json();
    const matches = await base44.entities.PvpMatch.filter({ code: matchCode });
    const match = matches[0];
    if (!match) return Response.json({ error: 'Match not found' }, { status: 404 });
    if (match.status === 'finished') return Response.json({ status: 'already_finished' });
    if (user.id !== match.player1Id && user.id !== match.player2Id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Winner is never trusted from the client outright. Both players can write
    // scoreP1/scoreP2 directly (needed for the real-time synced match state),
    // so a reached-3 score alone isn't proof of a legitimately played match —
    // sanity-check it against other match progression signals before trusting it:
    // the number of rounds won can't exceed the number of rounds played, and
    // reaching that many round wins must have taken a plausible minimum amount
    // of time. A score that fails these checks is treated as untrusted, and we
    // fall back to "caller forfeited" (winner = the other participant), the
    // same safe default used when neither side has reached the winning score.
    const totalRoundsWon = (match.scoreP1 || 0) + (match.scoreP2 || 0);
    const roundsConsistent = totalRoundsWon <= (match.round || 1);
    const MIN_MS_PER_ROUND = 5000;
    const matchAgeMs = Date.now() - new Date(match.created_date).getTime();
    const timingPlausible = matchAgeMs >= totalRoundsWon * MIN_MS_PER_ROUND;
    const p1ReachedWin = match.scoreP1 >= 3;
    const p2ReachedWin = match.scoreP2 >= 3;
    const scoreTrusted = roundsConsistent && timingPlausible && !(p1ReachedWin && p2ReachedWin);

    let winnerId;
    if (scoreTrusted && p1ReachedWin) {
      winnerId = match.player1Id;
    } else if (scoreTrusted && p2ReachedWin) {
      winnerId = match.player2Id;
    } else {
      winnerId = user.id === match.player1Id ? match.player2Id : match.player1Id;
    }

    const [p1Matches, p2Matches] = await Promise.all([
      base44.asServiceRole.entities.User.filter({ id: match.player1Id }),
      base44.asServiceRole.entities.User.filter({ id: match.player2Id }),
    ]);
    const player1 = p1Matches[0];
    const player2 = p2Matches[0];
    if (!player1 || !player2) return Response.json({ error: 'Players not found' }, { status: 404 });

    const p1Won = winnerId === match.player1Id;

    const applyResult = async (player, opponent, won) => {
      const { newRP } = calculateRPChange(player.rankPoints || 0, opponent.rankPoints || 0, won, player.pvpGamesPlayed || 0, player.currentPvpStreak || 0);
      const newPvpStreak = won ? ((player.currentPvpStreak || 0) > 0 ? (player.currentPvpStreak || 0) + 1 : 1) : ((player.currentPvpStreak || 0) < 0 ? (player.currentPvpStreak || 0) - 1 : -1);
      const newWinStreak = won ? (player.currentWinStreak || 0) + 1 : 0;
      await base44.asServiceRole.entities.User.update(player.id, {
        rankPoints: newRP,
        pvpGamesPlayed: (player.pvpGamesPlayed || 0) + 1,
        pvpWins: (player.pvpWins || 0) + (won ? 1 : 0),
        pvpLosses: (player.pvpLosses || 0) + (won ? 0 : 1),
        wins: (player.wins || 0) + (won ? 1 : 0),
        losses: (player.losses || 0) + (won ? 0 : 1),
        gamesPlayed: (player.gamesPlayed || 0) + 1,
        coins: (player.coins || 0) + (won ? COINS_WIN_HUMAN : COINS_LOSS_HUMAN),
        currentPvpStreak: newPvpStreak,
        currentWinStreak: newWinStreak,
        maxWinStreak: Math.max(player.maxWinStreak || 0, newWinStreak),
        maxPvpWinStreak: Math.max(player.maxPvpWinStreak || 0, newPvpStreak > 0 ? newPvpStreak : 0),
      });
    };

    await Promise.all([applyResult(player1, player2, p1Won), applyResult(player2, player1, !p1Won)]);

    await base44.asServiceRole.entities.PvpMatch.update(match.id, {
      status: 'finished',
      winnerId,
      player1CoinsEarned: p1Won ? COINS_WIN_HUMAN : COINS_LOSS_HUMAN,
      player2CoinsEarned: p1Won ? COINS_LOSS_HUMAN : COINS_WIN_HUMAN,
    });

    return Response.json({ status: 'finished' });
  } catch (error) {
    console.error('finishPvpMatch error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});