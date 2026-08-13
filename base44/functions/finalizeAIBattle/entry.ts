import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Server-authoritative AI-battle settlement. Replaces the old client-side
// applyProgression (updateMe + Card.update + BattleHistory.create) so that:
//  - the coin reward is recomputed server-side (no client-mintable coins);
//  - card battle stats + card milestones are granted server-side;
//  - settlement is idempotent (matchId session gate) — no double rewards;
//  - single-active (startAiMatch) serializes, so no concurrent lost-update.
//
// TRUST BOUNDARY: the match outcome/score/stat deltas are produced client-side
// during play, so they are NOT trusted to mint coins directly. Three layers keep
// a client from minting without playing:
//   1. difficulty is read from the server-side AiMatch session (created at
//      startAiMatch), never the request body — a session started on Easy can't
//      claim the Extreme win bonus.
//   2. a server-side real-elapsed-time gate on the session rejects
//      near-instant start->finalize loops (the rapid-fire minting vector) and
//      grants nothing for them.
//   3. client-supplied per-card stat deltas and counter increments are capped
//      to what a single match can produce, blocking the totalWins:999 injection
//      that used to dump every card milestone in one call.
const COINS_WIN_AI = 250;
const COINS_LOSS_AI = 50;
const COINS_PER_CARD_DEFEATED = 50;
const COINS_FORFEIT = 0;
const AI_DIFFICULTY_WIN_BONUS = { Easy: 25, Normal: 50, Hard: 75, Extreme: 125 };
const MAX_AI_CARDS = 15;
// A real 3-round AI battle takes well over this; a sub-20s finalize is treated
// as a no-play attempt and grants nothing. Legit forfeits are still honored at
// any duration (they grant 0 coins by design).
const MIN_BATTLE_MS = 20000;
// A single best-of-3 match plays at most ~5 rounds; per-card deltas above this
// are clamped, so a client can't inject a huge stat spike to dump milestones.
const MAX_DELTA_GAMES = 5;
const CARD_MILESTONES = [
  { id: 'wins50', type: 'totalWins', target: 50, coinReward: 1000 },
  { id: 'wins100', type: 'totalWins', target: 100, coinReward: 5000 },
  { id: 'games200', type: 'totalGames', target: 200, coinReward: 2500 },
];

const clamp = (n: number, max: number) => Math.max(0, Math.min(max, Number(n) || 0));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { matchId, winner, score, cardsDefeated, damageDealt, blocksUsed,
      distinctTypes, durationSeconds, summonCount, finalWinHP, comeback, higherTierDefeat,
      cardDeltas, forfeited } = body || {};
    if (!matchId) return Response.json({ error: 'matchId required' }, { status: 400 });

    // Idempotency: only an `active` session can be settled. A finished/abandoned
    // session means this match was already settled (or voided by a newer start).
    const sessions = await base44.asServiceRole.entities.AiMatch.filter({ matchId, userId: user.id });
    const session = sessions[0];
    if (!session) return Response.json({ error: 'match not found', alreadyFinalized: true });
    if (session.status !== 'active') return Response.json({ alreadyFinalized: true });
    const opponentName = session.opponentName || 'AI';

    // Server-stored difficulty — do NOT trust the client-supplied difficulty.
    const serverDifficulty = session.difficulty || 'Normal';
    const startedAt = session.startedAt ? new Date(session.startedAt).getTime() : 0;
    const tooFast = startedAt > 0 && Date.now() - startedAt < MIN_BATTLE_MS;
    const isForfeit = !!forfeited;

    await base44.asServiceRole.entities.AiMatch.update(session.id, {
      status: 'finished',
      finishedAt: new Date().toISOString(),
      winner: winner || 'ai',
    });

    // Forfeits are legitimate at any duration and grant 0 coins — handle before
    // the time gate so a quick, willing forfeit still records a loss.
    if (isForfeit) {
      const newStreak = 0;
      const newMaxStreak = Math.max(user.maxWinStreak || 0, newStreak);
      await base44.asServiceRole.entities.User.update(user.id, {
        losses: (user.losses || 0) + 1,
        gamesPlayed: (user.gamesPlayed || 0) + 1,
        currentWinStreak: 0,
        maxWinStreak: newMaxStreak,
        coins: user.coins || 0,
      });
      await base44.entities.BattleHistory.create({
        opponentName,
        outcome: 'loss',
        source: 'ai',
        cardsUsed: [],
        playerScore: score?.player ?? 0,
        aiScore: score?.ai ?? 0,
        cardsDestroyed: 0,
        damageDealt: 0,
        blocksUsed: 0,
        distinctTypesUsed: 0,
        durationSeconds: Number(durationSeconds) || 0,
      });
      const fresh = await base44.auth.me();
      return Response.json({
        user: fresh,
        coinsEarned: COINS_FORFEIT,
        breakdown: {
          isWin: false, base: COINS_FORFEIT, difficultyBonus: 0, difficulty: serverDifficulty,
          cardsDefeated: 0, cardsDefeatedCoins: 0, milestoneCoins: 0, total: COINS_FORFEIT,
        },
      });
    }

    // Time gate: a non-forfeit settlement that happens too fast to represent an
    // actual played match grants nothing — closes the rapid-fire minting loop.
    if (tooFast) {
      const fresh = await base44.auth.me();
      return Response.json({
        user: fresh,
        coinsEarned: 0,
        breakdown: {
          isWin: false, base: 0, difficultyBonus: 0, difficulty: serverDifficulty,
          cardsDefeated: 0, cardsDefeatedCoins: 0, milestoneCoins: 0, total: 0, denied: true,
        },
      });
    }

    const isWin = winner === 'player';
    const distinctTypesUsed = clamp(distinctTypes, 8);

    const base = isWin ? COINS_WIN_AI : COINS_LOSS_AI;
    const difficultyBonus = isWin ? (AI_DIFFICULTY_WIN_BONUS[serverDifficulty] || 0) : 0;
    const defeatedCount = clamp(cardsDefeated, MAX_AI_CARDS);
    const cardsDefeatedCoins = defeatedCount * COINS_PER_CARD_DEFEATED;
    let milestoneCoins = 0;
    const cardsUsed: string[] = [];

    // Parallelize: fetch all cards in one round, then update all in one round.
    // Was 30 sequential awaits (get+update per card) per match; now 2 parallel rounds.
    const deltas = (Array.isArray(cardDeltas) ? cardDeltas : []).slice(0, MAX_AI_CARDS);
    const fetched = await Promise.all(
      deltas.map((d) => base44.asServiceRole.entities.Card.get(d.cardId).catch(() => null))
    );
    const pendingUpdates = [];
    for (let i = 0; i < deltas.length; i++) {
      const card = fetched[i];
      const d = deltas[i];
      if (!card || card.ownerId !== user.id) continue;
      cardsUsed.push(card.name);
      // Bound every increment to what one match can produce — wins can't exceed
      // games played, and games played can't exceed the round cap.
      const games = clamp(d.gamesPlayed, MAX_DELTA_GAMES);
      const winsBonus = clamp(d.winsVsBonus, games);
      const winsNonBonus = clamp(d.winsVsNonBonus, games - winsBonus);
      const wins = Math.min(games, winsBonus + winsNonBonus);
      const merged = {
        winsVsBonus: (card.winsVsBonus || 0) + winsBonus,
        winsVsNonBonus: (card.winsVsNonBonus || 0) + winsNonBonus,
        gamesPlayed: (card.gamesPlayed || 0) + games,
        totalWins: (card.totalWins || 0) + wins,
        totalGames: (card.totalGames || 0) + games,
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
      pendingUpdates.push(base44.asServiceRole.entities.Card.update(d.cardId, merged));
    }
    if (pendingUpdates.length) await Promise.all(pendingUpdates);

    const coinsEarned = base + difficultyBonus + cardsDefeatedCoins + milestoneCoins;
    const newStreak = isWin ? (user.currentWinStreak || 0) + 1 : 0;
    const newMaxStreak = Math.max(user.maxWinStreak || 0, newStreak);

    const isFastWin = isWin && (Number(durationSeconds) || 0) < 180;
    const isFlawlessWin = isWin && (score?.ai || 0) === 0;
    const isMonoElementWin = isWin && distinctTypesUsed === 1;
    const isComebackWin = isWin && !!comeback;
    const isHigherTierDefeat = isWin && !!higherTierDefeat;
    const isWinUnder100HP = isWin && finalWinHP != null && finalWinHP < 100;
    // Counter increments are bounded to plausible per-match maxes so a client
    // can't inflate achievement-fed counters (which feed milestone claims).
    await base44.asServiceRole.entities.User.update(user.id, {
      wins: (user.wins || 0) + (isWin ? 1 : 0),
      losses: (user.losses || 0) + (isWin ? 0 : 1),
      gamesPlayed: (user.gamesPlayed || 0) + 1,
      aiGamesPlayed: (user.aiGamesPlayed || 0) + 1,
      coins: (user.coins || 0) + coinsEarned,
      creaturesSummoned: (user.creaturesSummoned || 0) + clamp(summonCount, MAX_AI_CARDS),
      totalDamageDealt: (user.totalDamageDealt || 0) + clamp(damageDealt, 200000),
      successfulBlocks: (user.successfulBlocks || 0) + clamp(blocksUsed, 60),
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

    await base44.entities.BattleHistory.create({
      opponentName,
      outcome: isWin ? 'win' : 'loss',
      source: 'ai',
      cardsUsed,
      playerScore: score?.player ?? 0,
      aiScore: score?.ai ?? 0,
      cardsDestroyed: defeatedCount,
      damageDealt: clamp(damageDealt, 200000),
      blocksUsed: clamp(blocksUsed, 60),
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
        difficulty: serverDifficulty,
        cardsDefeated: defeatedCount,
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