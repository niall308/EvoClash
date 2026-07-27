// Server-side source of truth for legitimate card stat ranges and creature
// names. Mirrors src/lib/gameConstants.js — kept here (not imported from src/)
// since backend functions can't import frontend source.

export const TYPES = ["Fire", "Lava", "Water", "Ice", "Rock", "Wind", "Earth", "Magic"];
export const CATEGORIES = ["Dinosaur", "Extinct Animal", "Mythical Creature"];
export const HYPER_RARE_TYPE = "Hyper Rare";
export const HYBRID_MIN_ATTACK = 7300;
export const HYBRID_MIN_DEFENSE = 5000;
export const HYBRID_BONUS_DAMAGE = 1000;

export const TIER_RANGES = {
  1: { statMin: 1, statMax: 2500, bonusMin: 0, bonusMax: 125 },
  2: { statMin: 2501, statMax: 5000, bonusMin: 126, bonusMax: 200 },
  3: { statMin: 5001, statMax: 7500, bonusMin: 201, bonusMax: 250 },
  4: { statMin: 7501, statMax: 10000, bonusMin: 251, bonusMax: 300 },
};

// Validates untrusted client-supplied card data and rebuilds a clean,
// whitelisted object — never trusts the raw payload directly. Throws with a
// descriptive message on any invalid/out-of-range/spoofed value.
// `creaturesByCategory` is the live list of admin-defined creatures per
// category, fetched from the Creature entity (not a hardcoded list), so any
// creature added via the admin panel is immediately valid.
export function validateCardData(cardData, hybridBaseNames, creaturesByCategory) {
  if (!cardData || typeof cardData !== "object") throw new Error("Invalid card data");

  const { name, baseName, category, type, tier, attack, defense, bonusDamage, isHybrid, imageUrl } = cardData;

  if (typeof name !== "string" || !name.trim() || name.length > 60) throw new Error("Invalid card name");
  if (typeof baseName !== "string") throw new Error("Invalid base name");

  if (isHybrid) {
    if (category !== "Hybrid") throw new Error("Invalid hybrid category");
    if (type !== HYPER_RARE_TYPE) throw new Error("Invalid hybrid type");
    if (tier !== 3 && tier !== 4) throw new Error("Invalid hybrid tier");
    if (!hybridBaseNames.includes(baseName)) throw new Error("Unknown hybrid creature");

    const { statMax } = TIER_RANGES[tier];
    if (!Number.isFinite(attack) || attack < HYBRID_MIN_ATTACK || attack > statMax) throw new Error("Invalid hybrid attack");
    if (!Number.isFinite(defense) || defense < HYBRID_MIN_DEFENSE || defense > statMax) throw new Error("Invalid hybrid defense");
    if (bonusDamage !== HYBRID_BONUS_DAMAGE) throw new Error("Invalid hybrid bonus damage");
  } else {
    if (!CATEGORIES.includes(category)) throw new Error("Invalid category");
    if (!TYPES.includes(type)) throw new Error("Invalid type");
    if (tier !== 1) throw new Error("Invalid tier");
    if (!creaturesByCategory?.[category]?.includes(baseName)) throw new Error("Unknown creature");

    const { statMin, statMax, bonusMin, bonusMax } = TIER_RANGES[1];
    if (!Number.isFinite(attack) || attack < statMin || attack > statMax) throw new Error("Invalid attack");
    if (!Number.isFinite(defense) || defense < statMin || defense > statMax) throw new Error("Invalid defense");
    if (!Number.isFinite(bonusDamage) || bonusDamage < bonusMin || bonusDamage > bonusMax) throw new Error("Invalid bonus damage");
  }

  // Rebuild explicitly — never spread the raw client payload, so extra
  // fields (totalWins, matchWins, claimedCardMilestones, etc.) can't be
  // smuggled in.
  return {
    name,
    baseName,
    category,
    type,
    tier,
    attack,
    defense,
    bonusDamage,
    isHybrid: !!isHybrid,
    imageUrl: typeof imageUrl === "string" ? imageUrl : undefined,
    winsVsBonus: 0,
    winsVsNonBonus: 0,
    gamesPlayed: 0,
  };
}