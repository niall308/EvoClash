import { base44 } from "@/api/base44Client";
import { generateRandomCard } from "@/lib/cardGenerator";
import { AI_DIFFICULTY_TIERS } from "@/lib/gameConstants";

// Boss name for the final (8th) match of each of the 10 story stages.
export const BOSS_NAMES = [
  "Stonehide Cyclops",
  "Frostfang Behemoth",
  "Inferno Warlord",
  "Storm Serpent Tyrant",
  "Titan Earthshaker",
  "Abyssal Leviathan",
  "Arcane Overlord",
  "Cyber Colossus",
  "Void Emperor",
  "Omega Prime Devastator",
];

// Per-stage AI deck + tier profile. `deck`/`bossDeck` map onto the pre-generated
// AiDeckCard difficulties; `tiers` lists the card tiers that appear in that stage,
// gradually shifting toward higher tiers as the player progresses.
const STAGE_PROFILES = [
  { deck: "Easy", bossDeck: "Normal", tiers: [1, 2] },
  { deck: "Easy", bossDeck: "Normal", tiers: [1, 2] },
  { deck: "Normal", bossDeck: "Hard", tiers: [1, 2] },
  { deck: "Normal", bossDeck: "Hard", tiers: [2, 3] },
  { deck: "Hard", bossDeck: "Hard", tiers: [2, 3] },
  { deck: "Hard", bossDeck: "Extreme", tiers: [2, 3] },
  { deck: "Hard", bossDeck: "Extreme", tiers: [3, 4] },
  { deck: "Hard", bossDeck: "Extreme", tiers: [3, 4] },
  { deck: "Extreme", bossDeck: "Extreme", tiers: [3, 4] },
  { deck: "Extreme", bossDeck: "Extreme", tiers: [4] },
];

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Build the tier distribution (in %) for a single match within a stage.
function buildTierDist(tiers, match, isBoss, stage) {
  if (tiers.length === 1) return { [tiers[0]]: 100 };
  const [lo, hi] = tiers;
  let hiPct;
  if (isBoss) {
    // Stage 1 boss spec: 80% T1 / 20% T2.
    hiPct = stage === 1 ? 20 : Math.min(85, 30 + match * 6 + (stage >= 9 ? 40 : 0));
  } else {
    hiPct = Math.min(70, (match - 1) * 9);
  }
  return { [lo]: 100 - hiPct, [hi]: hiPct };
}

export const STORY_STAGES = STAGE_PROFILES.map((profile, idx) => {
  const stage = idx + 1;
  const matches = [];
  for (let m = 1; m <= 8; m++) {
    const isBoss = m === 8;
    matches.push({
      stageNumber: stage,
      matchNumber: m,
      isBoss,
      bossName: isBoss ? BOSS_NAMES[idx] : null,
      aiDeckType: isBoss ? profile.bossDeck : profile.deck,
      tierDistribution: buildTierDist(profile.tiers, m, isBoss, stage),
      // Bosses are meaningfully stronger; non-bosses scale gently with stage.
      aiStatMultiplier: isBoss ? 1.15 + (stage - 1) * 0.04 : 1 + (stage - 1) * 0.03,
      reward: stage * 100,
    });
  }
  return { stage, bossName: BOSS_NAMES[idx], matches };
});

export function getStoryMatch(stage, match) {
  return STORY_STAGES[stage - 1]?.matches[match - 1];
}

// Build a randomized 15-card AI pool for a story match, drawn from the
// pre-generated AiDeckCard deck for the match's difficulty, filtered by the
// match's tier distribution. Boss cards get their stats scaled up.
export async function buildStoryAiPool(match) {
  let pool = await base44.entities.AiDeckCard.filter({ difficulty: match.aiDeckType });
  if (!pool || pool.length === 0) {
    const tiers = AI_DIFFICULTY_TIERS[match.aiDeckType] || AI_DIFFICULTY_TIERS.Normal;
    pool = Array.from({ length: 30 }, () => generateRandomCard(randomFrom(tiers)));
  }
  const byTier = {};
  pool.forEach((c) => {
    const t = c.tier || 1;
    (byTier[t] ||= []).push(c);
  });
  const result = [];
  for (const [tier, pct] of Object.entries(match.tierDistribution)) {
    const count = Math.round((pct / 100) * 15);
    const avail = byTier[tier] && byTier[tier].length ? byTier[tier] : pool;
    for (let i = 0; i < count; i++) result.push({ ...avail[Math.floor(Math.random() * avail.length)] });
  }
  while (result.length < 15) result.push({ ...pool[Math.floor(Math.random() * pool.length)] });
  return shuffle(result.slice(0, 15)).map((c) => ({
    ...c,
    id: `${c.id || Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2, 7)}`,
    attack: Math.round((c.attack || 0) * match.aiStatMultiplier),
    defense: Math.round((c.defense || 0) * match.aiStatMultiplier),
  }));
}

export async function getOrCreateStoryProgress() {
  const me = await base44.auth.me();
  const list = await base44.entities.StoryProgress.filter({ userId: me.id });
  if (list.length) return list[0];
  return base44.entities.StoryProgress.create({
    userId: me.id,
    currentStage: 1,
    currentMatch: 1,
    completedMatches: [],
    stageCompleted: [],
    storyCompleted: false,
  });
}

// Mark a match complete, advance currentStage/currentMatch, and flag
// stage/story completion. Returns the updated progress object.
export async function advanceStoryProgress(stage, match) {
  const me = await base44.auth.me();
  const list = await base44.entities.StoryProgress.filter({ userId: me.id });
  const progress = list[0];
  if (!progress) return null;
  const key = `${stage}-${match}`;
  const completedMatches = progress.completedMatches.includes(key)
    ? progress.completedMatches
    : [...progress.completedMatches, key];
  let stageCompleted = progress.stageCompleted || [];
  let storyCompleted = progress.storyCompleted || false;
  let currentStage = stage;
  let currentMatch = match;
  if (match === 8) {
    if (!stageCompleted.includes(stage)) stageCompleted = [...stageCompleted, stage];
    if (stage >= 10) {
      storyCompleted = true;
      currentStage = 10;
      currentMatch = 8;
    } else {
      currentStage = stage + 1;
      currentMatch = 1;
    }
  } else {
    currentMatch = match + 1;
  }
  return base44.entities.StoryProgress.update(progress.id, {
    completedMatches,
    stageCompleted,
    storyCompleted,
    currentStage,
    currentMatch,
  });
}