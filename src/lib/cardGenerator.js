import { CATEGORIES, CREATURES, CREATURE_ROLES, TYPES, TIER_RANGES, NAME_PARTS } from "@/lib/gameConstants";

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function extractShortName(baseName) {
  const words = baseName.split(" ");
  return words[words.length - 1];
}

export function generateName(baseName, tier) {
  const short = extractShortName(baseName);
  const parts = NAME_PARTS[tier];
  const prefix = randomFrom(parts.prefixes);
  if (tier <= 2) return `${prefix} ${short}`;
  const suffix = randomFrom(parts.suffixes);
  return tier === 3 ? `${prefix} ${short}-${suffix}` : `${prefix} ${short} ${suffix}`;
}

function weightedStats(tier, role) {
  const { statMin, statMax, bonusMin, bonusMax } = TIER_RANGES[tier];
  // predators always favor attack, prey always favor defense
  const bias = role === "predator" ? 0.55 + Math.random() * 0.45 : role === "prey" ? Math.random() * 0.45 : Math.random();
  const range = statMax - statMin;
  const attack = Math.round(statMin + bias * range);
  const defense = Math.round(statMin + (1 - bias) * range);
  const bonusDamage = randomInt(bonusMin, bonusMax);
  return { attack, defense, bonusDamage };
}

export function generateRandomCard(tier = 1, options = {}) {
  const { creatures, forcedCreature } = options;
  let baseName, category, role;
  if (forcedCreature) {
    ({ baseName, category, role } = forcedCreature);
  } else if (creatures && creatures.length > 0) {
    const picked = randomFrom(creatures);
    baseName = picked.baseName;
    category = picked.category;
    role = picked.role;
  } else {
    category = randomFrom(CATEGORIES);
    baseName = randomFrom(CREATURES[category]);
    role = CREATURE_ROLES[baseName];
  }
  const type = randomFrom(TYPES);
  const stats = weightedStats(tier, role);
  const name = generateName(baseName, tier);
  return {
    name,
    baseName,
    category,
    type,
    tier,
    ...stats,
    winsVsBonus: 0,
    winsVsNonBonus: 0,
    gamesPlayed: 0,
  };
}

export function upgradeCard(card) {
  const newTier = card.tier + 1;
  const role = CREATURE_ROLES[card.baseName];
  const stats = weightedStats(newTier, role);
  const name = generateName(card.baseName, newTier);
  return { ...card, tier: newTier, ...stats, name };
}