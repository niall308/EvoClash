import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Server-authoritative Story Mode settlement. Replaces the client-side updateMe +
// BattleHistory + advanceStoryProgress so a story win can't mint coins/counters,
// skip stages, or be double-counted. Idempotent on the (stage,match) key via
// StoryProgress.completedMatches — the same key the map screen already checks.
const BOSS_NAMES = [
  'Stonehide Cyclops', 'Frostfang Behemoth', 'Inferno Warlord', 'Storm Serpent Tyrant',
  'Titan Earthshaker', 'Abyssal Leviathan', 'Arcane Overlord', 'Cyber Colossus',
  'Void Emperor', 'Omega Prime Devastator',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { stage, match, win, flawless, noPowerUps, playerScore, aiScore } = await req.json().catch(() => ({}));
    const s = Number(stage);
    const m = Number(match);
    if (!s || !m) return Response.json({ error: 'stage/match required' }, { status: 400 });
    const isBoss = m === 8;
    const matchKey = `${s}-${m}`;
    const opponentName = isBoss ? BOSS_NAMES[s - 1] : `Stage ${s} Match ${m}`;

    // Idempotency: load progress; if this match is already completed, never re-grant.
    const progressList = await base44.asServiceRole.entities.StoryProgress.filter({ userId: user.id });
    const progress = progressList[0];
    if (!progress) return Response.json({ error: 'no story progress' }, { status: 400 });
    if ((progress.completedMatches || []).includes(matchKey)) {
      return Response.json({ alreadySettled: true });
    }

    if (win) {
      const stageDone = m === 8;
      const allDone = stageDone && s === 10;
      let coins = s * 100; // reward = stage * 100
      if (stageDone) coins += 1000;
      if (allDone) coins += 50000;

      const u = {};
      u.coins = (user.coins || 0) + coins;
      u.storyMatchesWon = (user.storyMatchesWon || 0) + 1;
      if (isBoss) {
        u.bossFightsWon = (user.bossFightsWon || 0) + 1;
        u.highestStoryStage = Math.max(user.highestStoryStage || 0, s);
        if (flawless) u.bossFlawlessWins = (user.bossFlawlessWins || 0) + 1;
        if (noPowerUps) u.stagesCompletedNoPowerUps = (user.stagesCompletedNoPowerUps || 0) + 1;
        const lostStages = user.storyBossLostStages || [];
        if (!lostStages.includes(s)) u.bossFirstAttemptWins = (user.bossFirstAttemptWins || 0) + 1;
        if (s === 10) u.finalBossDefeated = 1;
        const cur = (user.currentStagesNoLossStreak || 0) + 1;
        u.currentStagesNoLossStreak = cur;
        u.maxStagesNoLossStreak = Math.max(user.maxStagesNoLossStreak || 0, cur);
      }
      await base44.asServiceRole.entities.User.update(user.id, u);

      // Advance progress (mirror of advanceStoryProgress), only on a win.
      let stageCompleted = progress.stageCompleted || [];
      let storyCompleted = progress.storyCompleted || false;
      let currentStage = s;
      let currentMatch = m;
      if (m === 8) {
        if (!stageCompleted.includes(s)) stageCompleted = [...stageCompleted, s];
        if (s >= 10) {
          storyCompleted = true;
          currentStage = 10;
          currentMatch = 8;
        } else {
          currentStage = s + 1;
          currentMatch = 1;
        }
      } else {
        currentMatch = m + 1;
      }
      const completedMatches = [...(progress.completedMatches || []), matchKey];
      await base44.asServiceRole.entities.StoryProgress.update(progress.id, {
        completedMatches,
        stageCompleted,
        storyCompleted,
        currentStage,
        currentMatch,
      });

      await base44.entities.BattleHistory.create({
        opponentName,
        outcome: 'win',
        source: 'ai',
        cardsUsed: [],
        playerScore: playerScore ?? 0,
        aiScore: aiScore ?? 0,
      });

      const fresh = await base44.auth.me();
      return Response.json({ win: true, coins, stageDone, allDone, user: fresh });
    }

    // Loss: break the no-loss stage streak; losing a boss marks that stage so a
    // later win doesn't count as a first-attempt victory. Does NOT touch
    // completedMatches (a loss is retryable).
    const u = { currentStagesNoLossStreak: 0 };
    if (isBoss) {
      const lostStages = user.storyBossLostStages || [];
      if (!lostStages.includes(s)) u.storyBossLostStages = [...lostStages, s];
    }
    await base44.asServiceRole.entities.User.update(user.id, u);
    await base44.entities.BattleHistory.create({
      opponentName,
      outcome: 'loss',
      source: 'ai',
      cardsUsed: [],
      playerScore: playerScore ?? 0,
      aiScore: aiScore ?? 0,
    });

    const fresh = await base44.auth.me();
    return Response.json({ win: false, user: fresh });
  } catch (error) {
    console.error('finalizeStoryBattle error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});