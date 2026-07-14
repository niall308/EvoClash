import { CATEGORIES, CREATURES, TYPES, TIER_RANGES, NAME_PARTS } from "@/lib/gameConstants";

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

function weightedStats(tier) {
  const { statMin, statMax, bonusMin, bonusMax } = TIER_RANGES[tier];
  const bias = Math.random(); // higher bias favors attack, lower favors defense
  const range = statMax - statMin;
  const attack = Math.round(statMin + bias * range);
  const defense = Math.round(statMin + (1 - bias) * range);
  const bonusDamage = randomInt(bonusMin, bonusMax);
  return { attack, defense, bonusDamage };
}

export function generateRandomCard(tier = 1) {
  const category = randomFrom(CATEGORIES);
  const baseName = randomFrom(CREATURES[category]);
  const type = randomFrom(TYPES);
  const stats = weightedStats(tier);
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
  const stats = weightedStats(newTier);
  const name = generateName(card.baseName, newTier);
  return { ...card, tier: newTier, ...stats, name };
}