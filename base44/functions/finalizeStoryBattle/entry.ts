import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { buildCardImagePrompt } from '../../shared/cardArt.ts';
import { generateCleanArt } from '../../shared/generateCleanArt.ts';
import { todayStrUTC } from '../../shared/eggHatch.ts';

// Server-authoritative Story Mode settlement. Replaces the client-side updateMe +
// BattleHistory + advanceStoryProgress so a story win can't mint coins/counters,
// skip stages, or be double-counted. Idempotent on the (stage,match) key via
// StoryProgress.completedMatches — the same key the map screen already checks.
const BOSS_NAMES = [
  'Stonehide Cyclops', 'Frostfang Behemoth', 'Inferno Warlord', 'Storm Serpent Tyrant',
  'Titan Earthshaker', 'Abyssal Leviathan', 'Arcane Overlord', 'Cyber Colossus',
  'Void Emperor', 'Omega Prime Devastator',
];

// Hybrid-card reward constants (mirrors src/lib/gameConstants.js — the only
// values needed to mint a reward hybrid server-side).
const HYPER_RARE_TYPE = 'Hyper Rare';
const HYBRID_MIN_ATTACK = 7300;
const HYBRID_MIN_DEFENSE = 5000;
const HYBRID_BONUS_DAMAGE = 1000;
const TIER_RANGES: Record<number, { statMin: number; statMax: number }> = {
  3: { statMin: 5001, statMax: 7500 },
  4: { statMin: 7501, statMax: 10000 },
};
const TIER4_PREFIXES = ['Mega', 'Prime', 'Ultimate', 'Dreaded', 'Devastating'];
const TIER3_SUFFIXES = ['X', 'Bot', 'Unit', 'Core', 'Drive', 'Node', 'Matrix', 'Cipher'];
const TIER4_SUFFIXES = ['Prime', 'Core', 'Overlord', 'Ultra', 'Zenith', 'Ascendant'];

const randomFrom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Mints a hybrid creature card and drops it into the player's active deck.
// Picks a random Hybrid-category creature, generates T3/T4 stats with the
// hybrid minimums, generates card art, and stamps the creature's Unique Attack.
async function createHybridReward(base44: any, userId: string) {
  const creatures = await base44.entities.Creature.filter({ category: 'Hybrid' }, undefined, 500);
  if (!creatures.length) return null;
  const creature: any = randomFrom(creatures);
  const tier = randomFrom([3, 4]);
  const { statMax } = TIER_RANGES[tier];
  const attack = randomInt(HYBRID_MIN_ATTACK, statMax);
  const defense = randomInt(HYBRID_MIN_DEFENSE, statMax);
  const short = creature.baseName.split(' ').pop();
  const name = tier === 3
    ? `${randomFrom(TIER4_PREFIXES)} ${short}-${randomFrom(TIER3_SUFFIXES)}`
    : `${randomFrom(TIER4_PREFIXES)} ${short} ${randomFrom(TIER4_SUFFIXES)}`;

  // Generate hybrid card art (Hyper Rare uses a random palette, no type gradient).
  const typeBackgrounds = await base44.entities.TypeBackground.filter({});
  const { prompt, existingImageUrls } = buildCardImagePrompt(
    { baseName: creature.baseName, type: HYPER_RARE_TYPE, isHybrid: true },
    { typeBackgrounds, creatureDescription: creature.description || '', referenceImageUrl: creature.referenceImageUrl || '' }
  );
  let imageUrl = '';
  try {
    const art = await generateCleanArt(base44, prompt, existingImageUrls);
    imageUrl = art.url;
  } catch (e) {
    console.error('hybrid reward art failed:', e);
  }

  // Find (or create) the player's active deck so the reward card lands somewhere
  // usable. Service role bypasses Deck RLS, so filter by created_by_id explicitly.
  let decks = await base44.asServiceRole.entities.Deck.filter({ created_by_id: userId });
  let deck = decks.find((d: any) => d.isActive) || decks[0];
  if (!deck) {
    deck = await base44.asServiceRole.entities.Deck.create({ name: 'Deck 1', isActive: true, created_by_id: userId });
  }

  const card = await base44.entities.Card.create({
    name,
    baseName: creature.baseName,
    category: 'Hybrid',
    type: HYPER_RARE_TYPE,
    tier,
    attack,
    defense,
    bonusDamage: HYBRID_BONUS_DAMAGE,
    isHybrid: true,
    imageUrl,
    deckId: deck.id,
    ownerId: userId,
    uniqueAttackName: creature.uniqueAttackName || '',
    uniqueAttackPercent: Math.max(0, Math.min(250, Number(creature.uniqueAttackPercent) || 0)),
    uniqueAttackTarget: creature.uniqueAttackTarget === 'multi' ? 'multi' : 'single',
    uniqueAttackEffect: creature.uniqueAttackEffect || '',
    winsVsBonus: 0,
    winsVsNonBonus: 0,
    gamesPlayed: 0,
  });
  return { type: 'hybrid' as const, cardName: card.name, cardId: card.id, cardImageUrl: imageUrl, tier };
}

// Awards a free creature egg (no coin cost, bypasses the purchase cap — it's a
// story reward, not a purchase). Mirrors buyEgg's initial egg state.
async function createRewardEgg(base44: any) {
  const egg = await base44.entities.Egg.create({
    progress: 0,
    lastPaidDate: '',
    lastSettledDate: todayStrUTC(),
    status: 'incubating',
  });
  return { type: 'egg' as const, eggId: egg.id };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { stage, match, win, flawless, noPowerUps, playerScore, aiScore } = await req.json().catch(() => ({}));
    const s = Number(stage);
    const m = Number(match);
    if (!Number.isInteger(s) || !Number.isInteger(m) || s < 1 || s > 10 || m < 1 || m > 8) {
      return Response.json({ error: 'invalid stage/match' }, { status: 400 });
    }
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

    // Position gate: only the user's current, unfinished story match may be
    // settled. A client can't claim a win for a match it never reached (e.g.
    // jumping straight to the stage-10 final boss for its 50k reward) — every
    // settlement must target the server-tracked current position. Win or loss.
    const curStage = Number(progress.currentStage) || 1;
    const curMatch = Number(progress.currentMatch) || 1;
    if (s !== curStage || m !== curMatch) {
      return Response.json({ error: 'not your current story match' }, { status: 400 });
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

      // Stage-5 boss → free hybrid card; stage-10 boss → free creature egg.
      // Only boss matches (m === 8) reach here, and the idempotency guard above
      // (completedMatches check) guarantees the reward mints exactly once.
      let bonusReward = null;
      if (isBoss && s === 5) {
        try { bonusReward = await createHybridReward(base44, user.id); }
        catch (e) { console.error('hybrid reward failed:', e); }
      } else if (isBoss && s === 10) {
        try { bonusReward = await createRewardEgg(base44); }
        catch (e) { console.error('egg reward failed:', e); }
      }

      await base44.entities.BattleHistory.create({
        opponentName,
        outcome: 'win',
        source: 'ai',
        cardsUsed: [],
        playerScore: playerScore ?? 0,
        aiScore: aiScore ?? 0,
      });

      const fresh = await base44.auth.me();
      return Response.json({ win: true, coins, stageDone, allDone, bonusReward, user: fresh });
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