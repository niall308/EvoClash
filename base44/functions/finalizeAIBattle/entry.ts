import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Server-authoritative AI-battle settlement. Replaces the old client-side
// applyProgression (updateMe + Card.update + BattleHistory.create) so that:
//  - the coin reward is recomputed server-side (no client-mintable coins);
//  - card battle stats + card milestones are granted server-side;
//  - settlement is idempotent (matchId session gate) — no double rewards;
//  - single-active (startAiMatch) serializes, so no concurrent lost-update.
const COINS_WIN_AI = 250;
const COINS_LOSS_AI = 50;
const COINS_PER_CARD_DEFEATED = 50;
const COINS_FORFEIT = 0;
const AI_DIFFICULTY_WIN_BONUS = { Easy: 25, Normal: 50, Hard: 75, Extreme: 125 };
const MAX_AI_CARDS = 15;
const CARD_MILESTONES = [
  { id: 'wins50', type: 'totalWins', target: 50, coinReward: 1000 },
  { id: 'wins100', type: 'totalWins', target: 100, coinReward: 5000 },
  { id: 'games200', type: 'totalGames', target: 200, coinReward: 2500 },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      matchId, winner, difficulty, score, cardsDefeated, damageDealt, blocksUsed,
      distinctTypes, durationSeconds, summonCount, finalWinHP, comeback, higherTierDefeat,
      cardDeltas, forfeited,
    } = body || {};
    if (!matchId) return Response.json({ error: 'matchId required' }, { status: 400 });

    // Idempotency: only an `active` session can be settled. A finished/abandoned
    // session means this match was already settled (or voided by a newer start).
    const sessions = await base44.asServiceRole.entities.AiMatch.filter({ matchId, userId: user.id });
    const session = sessions[0];
    if (!session) return Response.json({ error: 'match not found', alreadyFinalized: true });
    if (session.status !== 'active') return Response.json({ alreadyFinalized: true });
    const opponentName = session.opponentName || 'AI';

    await base44.asServiceRole.entities.AiMatch.update(session.id, {
      status: 'finished',
      finishedAt: new Date().toISOString(),
      winner: winner || 'ai',
    });

    const isWin = winner === 'player';
    const isForfeit = !!forfeited;
    const distinctTypesUsed = Number(distinctTypes) || 0;

    let base = COINS_FORFEIT;
    let difficultyBonus = 0;
    let cardsDefeatedCoins = 0;
    let milestoneCoins = 0;
    const cardsUsed: string[] = [];

    if (!isForfeit) {
      base = isWin ? COINS_WIN_AI : COINS_LOSS_AI;
      difficultyBonus = isWin ? (AI_DIFFICULTY_WIN_BONUS[difficulty] || 0) : 0;
      const defeatedCount = Math.min(MAX_AI_CARDS, Math.max(0, Number(cardsDefeated) || 0));
      cardsDefeatedCoins = defeatedCount * COINS_PER_CARD_DEFEATED;

      for (const d of (Array.isArray(cardDeltas) ? cardDeltas : [])) {
        const card = await base44.asServiceRole.entities.Card.get(d.cardId);
        if (!card || card.ownerId !== user.id) continue;
        cardsUsed.push(card.name);
        const merged = {
          winsVsBonus: (card.winsVsBonus || 0) + (d.winsVsBonus || 0),
          winsVsNonBonus: (card.winsVsNonBonus || 0) + (d.winsVsNonBonus || 0),
          gamesPlayed: (card.gamesPlayed || 0) + (d.gamesPlayed || 0),
          totalWins: (card.totalWins || 0) + (d.totalWins || 0),
          totalGames: (card.totalGames || 0) + (d.gamesPlayed || 0),
          matchWins: (card.matchWins || 0) + (d.matchWin ? 1 : 0),
        };
        const claimed = Array.isArray(card.claimedCardMilestones) ? card.claimedCardMilestones : [];
        const newlyClaimed: string[] = [];
        for (const m of CARD_MILESTONES) {
          if (claimed.includes(m.id)) continue;
          const val = m.type === 'totalWins' ? merged.totalWins : merged.totalGames;
          if (val >= m.target) {
            milestoneCoins += m.coinReward;
            newlyClaimed.push(m.id);
          }
        }
        merged.claimedCardMilestones = [...claimed, ...newlyClaimed];
        await base44.asServiceRole.entities.Card.update(d.cardId, merged);
      }
    }

    const coinsEarned = base + difficultyBonus + cardsDefeatedCoins + milestoneCoins;
    const newStreak = isWin ? (user.currentWinStreak || 0) + 1 : 0;
    const newMaxStreak = Math.max(user.maxWinStreak || 0, newStreak);

    if (isForfeit) {
      await base44.asServiceRole.entities.User.update(user.id, {
        losses: (user.losses || 0) + 1,
        gamesPlayed: (user.gamesPlayed || 0) + 1,
        currentWinStreak: 0,
        maxWinStreak: newMaxStreak,
        coins: user.coins || 0,
      });
    } else {
      const isFastWin = isWin && (Number(durationSeconds) || 0) < 180;
      const isFlawlessWin = isWin && (score?.ai || 0) === 0;
      const isMonoElementWin = isWin && distinctTypesUsed === 1;
      const isComebackWin = isWin && !!comeback;
      const isHigherTierDefeat = isWin && !!higherTierDefeat;
      const isWinUnder100HP = isWin && finalWinHP != null && finalWinHP < 100;
      await base44.asServiceRole.entities.User.update(user.id, {
        wins: (user.wins || 0) + (isWin ? 1 : 0),
        losses: (user.losses || 0) + (isWin ? 0 : 1),
        gamesPlayed: (user.gamesPlayed || 0) + 1,
        aiGamesPlayed: (user.aiGamesPlayed || 0) + 1,
        coins: (user.coins || 0) + coinsEarned,
        creaturesSummoned: (user.creaturesSummoned || 0) + (Number(summonCount) || 0),
        totalDamageDealt: (user.totalDamageDealt || 0) + (Number(damageDealt) || 0),
        successfulBlocks: (user.successfulBlocks || 0) + (Number(blocksUsed) || 0),
        threeElementMatches: (user.threeElementMatches || 0) + (distinctTypesUsed >= 3 ? 1 : 0),
        winsUnder100HP: (user.winsUnder100HP || 0) + (isWinUnder100HP ? 1 : 0),
        flawlessWins: (user.flawlessWins || 0) + (isFlawlessWin ? 1 : 0),
        monoElementWins: (user.monoElementWins || 0) + (isMonoElementWin ? 1 : 0),
        fastWins: (user.fastWins || 0) + (isFastWin ? 1 : 0),
        comebackWins: (user.comebackWins || 0) + (isComebackWin ? 1 : 0),
        defeatedHigherTierOpponent: (user.defeatedHigherTierOpponent || 0) + (isHigherTierDefeat ? 1 : 0),
        currentWinStreak: newStreak,
        maxWinStreak: newMaxStreak,
      });
    }

    await base44.entities.BattleHistory.create({
      opponentName,
      outcome: isWin ? 'win' : 'loss',
      source: 'ai',
      cardsUsed,
      playerScore: score?.player ?? 0,
      aiScore: score?.ai ?? 0,
      cardsDestroyed: Number(cardsDefeated) || 0,
      damageDealt: Number(damageDealt) || 0,
      blocksUsed: Number(blocksUsed) || 0,
      distinctTypesUsed,
      durationSeconds: Number(durationSeconds) || 0,
    });

    const fresh = await base44.auth.me();
    return Response.json({
      user: fresh,
      coinsEarned,
      breakdown: {
        isWin,
        base,
        difficultyBonus,
        difficulty: difficulty || 'Normal',
        cardsDefeated: isForfeit ? 0 : Math.min(MAX_AI_CARDS, Math.max(0, Number(cardsDefeated) || 0)),
        cardsDefeatedCoins,
        milestoneCoins,
        total: coinsEarned,
      },
    });
  } catch (error) {
    console.error('finalizeAIBattle error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});