// Unique Attack feature: each creature can have a once-per-game special attack.
// The static definitions live in /data/uniqueAttacks.json (source of truth). This
// module resolves a card's unique attack by baseName, clamps the percent, and
// maps the free-text effect to a known game mechanic (or "custom" for design input).
//
// The `used` flag is NOT stored here — it is per-match runtime state owned by the
// battle hook (and mirrored server-side on the AiMatch session via the
// recordUniqueAttack backend function). A card's uniqueAttack object as exposed
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

const MIN_PERCENT = 1;
const MAX_PERCENT = 1000;

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

// Resolves a card's unique attack from its baseName (works for any card object,
// whether or not a uniqueAttack field was ever attached to the stored entity).
export function cardUniqueAttack(card) {
  if (!card || !card.baseName) return null;
  return getUniqueAttackDefinition(card.baseName);
}

// Resolves a Unique Attack from a Creature record, preferring the admin-managed
// per-creature fields (uniqueAttackName/Percent/Target/Effects) over the static
// /data/uniqueAttacks.json table. Returns null when the creature has none.
// Used by the admin Manage Creatures editor + previews; battle still resolves
// by baseName via cardUniqueAttack until creature data is loaded into the match.
export function getCreatureUniqueAttack(creature) {
  if (!creature) return null;
  const hasCustom =
    creature.uniqueAttackName && creature.uniqueAttackName.trim() && creature.uniqueAttackPercent > 0;
  if (hasCustom) {
    const pct = clampPercent(creature.uniqueAttackPercent);
    const effectsArr = Array.isArray(creature.uniqueAttackEffects)
      ? creature.uniqueAttackEffects.map((e) => String(e).trim()).filter(Boolean)
      : [];
    return {
      name: creature.uniqueAttackName.trim(),
      percent: pct,
      target: creature.uniqueAttackTarget === "all" ? "all" : "single",
      effect: effectsArr.join("; "),
      effects: effectsArr,
      effectType: effectsArr.length ? "custom" : "none",
    };
  }
  return getUniqueAttackDefinition(creature.baseName);
}

// Live-preview damage for a Unique Attack at a given sample base attack.
// Damage = floor(baseAttack * percent / 100).
export function previewUniqueAttackDamage(baseAttack, percent) {
  const pct = clampPercent(percent);
  return Math.floor((Number(baseAttack) || 0) * pct) / 100;
}

// Damage for a unique attack = floor(card.attack * percent / 100), then run
// through the normal computeDamage (defense/crit/bonus still apply). "all" targets
// each take this same amount; in 1v1 there is a single target so it just applies once.
export function uniqueAttackDamage(card, definition) {
  if (!card || !definition) return 0;
  const pct = clampPercent(definition.percent);
  return Math.floor((card.attack || 0) * pct) / 100;
}