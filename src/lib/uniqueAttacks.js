// Unique Attack feature: each creature can have a once-per-game special attack.
// The static definitions live in /data/uniqueAttacks.json (source of truth). This
// module resolves a card's unique attack by baseName, clamps the percent, and
// maps the free-text effect to a known game mechanic (or "custom" for design input).
//
// The `used` flag is NOT stored here — it is per-match runtime state owned by the
// battle hook (and mirrored server-side on the AiMatch session via the
// recordUniqueAttack backend function). A card's unique attack object as exposed
// to the UI is { ...definition, used: boolean }.

import data from "../../data/uniqueAttacks.json";

// Localization keys for the unique-attack UI surfaces.
export const UNIQUE_ATTACK_I18N = {
  buttonLabel: "Unique Attack",
  usedBadge: "USED",
  oncePerGame: "1 use this game",
  allTargets: "All targets",
  singleTarget: "Single target",
  noEffect: "No additional effect",
  customEffect: "Custom effect — needs design mapping",
};

// Egg-hatchling unique attack presets. These are stamped onto the Card at
// hatch/upgrade time (name, percent, target, effect, effectType) so the existing
// cardUniqueAttack resolver picks them up without per-creature admin config.
export const EGG_BABY_UNIQUE_ATTACK = {
  name: "Egg Burst",
  percent: 95,
  target: "single",
  effect: "Deals 95% attack damage with a 5% chance to completely destroy the target card.",
  effectType: "destroyChance5",
};
export const EGG_GOOD_UNIQUE_ATTACK = {
  name: "Blessed Strike",
  percent: 110,
  target: "single",
  effect: "Deals 110% attack damage and heals all of your active cards (including itself) by 35% of their total health.",
  effectType: "healAll35",
};
export const EGG_EVIL_UNIQUE_ATTACK = {
  name: "Cursed Strike",
  percent: 175,
  target: "single",
  effect: "Deals 175% attack damage but all of your active cards on the field lose 15% of their current health.",
  effectType: "sacrificeAll15",
};

const MIN_PERCENT = 1;
const MAX_PERCENT = 250;

export function clampPercent(p) {
  const n = Number(p);
  if (!Number.isFinite(n)) return 100;
  return Math.max(MIN_PERCENT, Math.min(MAX_PERCENT, Math.round(n)));
}

// Returns the static definition { name, percent, target, effect, effectType } or null.
export function getUniqueAttackDefinition(baseName) {
  const raw = data[baseName];
  if (!raw) return null;
  const percent = clampPercent(raw.percent);
  if (raw.percent <= 0 || raw.percent > MAX_PERCENT) {
    console.warn(`[uniqueAttacks] percent for "${baseName}" out of bounds (${raw.percent}); clamped to ${percent}`);
  }
  return {
    name: raw.name,
    percent,
    target: raw.target === "all" ? "all" : "single",
    effect: raw.effect || "",
    effectType: raw.effectType || "none",
  };
}

// Maps the admin-authored free-text effect onto one of the engine's known
// mechanics (see useBattleMatch: healSelf50 / healAll30 / halfAttackTarget1).
// Unmapped text falls back to "none" (shown as descriptive text only, no mechanic).
function mapEffectType(effect) {
  const e = (effect || "").toLowerCase();
  if (!e) return "none";
  const heals = e.includes("heal") || e.includes("restore") || e.includes("recov");
  if (heals && e.includes("destroy")) return "healTeamOnDestroy";
  if (heals && (e.includes("all") || e.includes("every") || e.includes("each"))) return "healAll30";
  if (heals) return "healSelf50";
  if (e.includes("half") || e.includes("less damage") || e.includes("50% less") || (e.includes("reduce") && e.includes("attack"))) {
    return "halfAttackTarget1";
  }
  return "none";
}

// Resolves a card's unique attack. Admin-authored fields stamped onto the card
// (server-side at creation/backfill from the Creature entity) take precedence
// over the static JSON definitions; a card with no admin config falls back to
// the static definition by baseName. An explicit `uniqueAttackEffectType`
// (used by egg-hatchling cards) takes precedence over free-text effect mapping.
// Works for any card object (player Card, AiDeckCard, or a live-generated AI
// card that carries no stamped fields).
export function cardUniqueAttack(card) {
  if (!card || !card.baseName) return null;
  const hasAdmin =
    !!card.uniqueAttackName ||
    (card.uniqueAttackPercent || 0) > 0 ||
    !!card.uniqueAttackEffect ||
    !!card.uniqueAttackEffectType;
  if (hasAdmin) {
    return {
      name: card.uniqueAttackName || card.baseName,
      percent: clampPercent(card.uniqueAttackPercent || 100),
      target: card.uniqueAttackTarget === "multi" ? "all" : "single",
      effect: card.uniqueAttackEffect || "",
      effectType: card.uniqueAttackEffectType || mapEffectType(card.uniqueAttackEffect),
    };
  }
  return getUniqueAttackDefinition(card.baseName);
}

// Damage for a unique attack = floor(card.attack * percent / 100), then run
// through the normal computeDamage (defense/crit/bonus still apply). "all" targets
// each take this same amount; in 1v1 there is a single target so it just applies once.
export function uniqueAttackDamage(card, definition) {
  if (!card || !definition) return 0;
  const pct = clampPercent(definition.percent);
  return Math.floor((card.attack || 0) * pct) / 100;
}