import {
  CATEGORIES,
  CREATURES,
  CREATURE_ROLES,
  TYPES,
  TIER_RANGES,
  NAME_PARTS,
  TIER4_PREFIXES,
  HYBRID_CHANCE,
  HYBRID_MIN_ATTACK,
  HYBRID_MIN_DEFENSE,
  HYBRID_BONUS_DAMAGE,
  HYBRID_TIERS,
} from "@/lib/gameConstants";

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
export function randomInt(min, max) {
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

// Extremely rare "Hyper Rare" cards fused from an admin-defined Hybrid creature template.
function generateHybridCard(creatures) {
  const hybridCreatures = (creatures || []).filter((c) => c.category === "Hybrid");
  if (hybridCreatures.length === 0) return null;
  const picked = randomFrom(hybridCreatures);
  const tier = randomFrom(HYBRID_TIERS);
  const range = TIER_RANGES[tier];
  const attack = randomInt(HYBRID_MIN_ATTACK, range.statMax);
  const defense = randomInt(HYBRID_MIN_DEFENSE, range.statMax);
  const name = generateName(picked.baseName, tier);
  return {
    name,
    baseName: picked.baseName,
    category: "Hybrid",
    type: "Hybrid",
    tier,
    attack,
    defense,
    bonusDamage: HYBRID_BONUS_DAMAGE,
    winsVsBonus: 0,
    winsVsNonBonus: 0,
    gamesPlayed: 0,
    description: picked.description || "",
  };
}

export function generateRandomCard(tier = 1, options = {}) {
  const { creatures, forcedCreature } = options;
  if (!forcedCreature && Math.random() < HYBRID_CHANCE) {
    const hybrid = generateHybridCard(creatures);
    if (hybrid) return hybrid;
  }
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
  const name = evolveName(card.name, newTier);
  return { ...card, tier: newTier, ...stats, name };
}

// Updates a card's display name when it evolves into newTier:
// T2 appends " II", T3 appends " III" (replacing any prior tier suffix),
// T4 strips the suffix and swaps the first word for a "mega" style prefix.
export function evolveName(currentName, newTier) {
  const base = currentName.replace(/ (II|III)$/, "");
  if (newTier === 2) return `${base} II`;
  if (newTier === 3) return `${base} III`;
  if (newTier === 4) {
    const words = base.split(" ");
    words[0] = randomFrom(TIER4_PREFIXES);
    return words.join(" ");
  }
  return currentName;
}