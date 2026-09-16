// Unique Attack feature: each creature can have a once-per-match special attack.
//
// CANONICAL MODEL (the single source of truth across Creature, Card, AiDeckCard,
// backend stamping, and the battle resolver):
//   uniqueAttackName          : string   — display name
//   uniqueAttackPercent       : number   — damage %, 0–200 (0/empty → 100 at resolve)
//   uniqueAttackTarget        : "single" | "all"
//   uniqueAttackEffectType    : canonical enum (see EFFECT_TYPES) — the mechanic
//   uniqueAttackEffectPercent : number   — magnitude % for %-based effects
//   uniqueAttackEffectDuration: number   — turns for duration-based effects
//   uniqueAttackEffect        : string   — admin-facing description (display ONLY,
//                                          never parsed as a mechanic)
//
// BACKWARDS COMPAT:
//   - Legacy target "multi" is normalized to "all".
//   - Legacy effectTypes (healSelf50 / healAll30 / halfAttackTarget1 / custom)
//     are mapped to their canonical ids with default params.
//   - Cards with no structured effectType fall back to inferring a mechanic from
//     the free-text effect (legacy behavior) so existing cards keep working.
//
// The `used` flag is NOT stored here — it is per-match runtime state owned by the
// battle hook and mirrored server-side (AiMatch.usedUniqueAttacks via
// recordUniqueAttack, or PvpMatch.usedUniqueAttacks via recordPvpUniqueAttack).

import data from "../../data/uniqueAttacks.json";

export const MIN_PERCENT = 0;
export const MAX_PERCENT = 200;
const DEFAULT_PERCENT = 100;

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

// Canonical effect registry. Add new effects here; the hooks read EFFECT_TYPES
// to decide which configuration inputs (percent/duration) to show.
export const EFFECT_TYPES = {
  none: { id: "none", label: "None", needsPercent: false, needsDuration: false },
  healSelf: { id: "healSelf", label: "Heal Self", needsPercent: true, needsDuration: false },
  healAll: { id: "healAll", label: "Heal All Own Cards", needsPercent: true, needsDuration: false },
  halfAttackTarget: { id: "halfAttackTarget", label: "Reduce Target's Attack", needsPercent: false, needsDuration: true },
  healTeamOnDestroy: { id: "healTeamOnDestroy", label: "Heal Team on Destroy", needsPercent: true, needsDuration: false },
};

export const EFFECT_TYPE_IDS = Object.keys(EFFECT_TYPES);

// Legacy effectType → canonical id + default params.
const LEGACY_EFFECT_MAP = {
  healSelf50: { type: "healSelf", effectPercent: 50 },
  healAll30: { type: "healAll", effectPercent: 30 },
  halfAttackTarget1: { type: "halfAttackTarget", effectDuration: 1 },
  custom: { type: "none" },
  none: { type: "none" },
  "": { type: "none" },
};

export function clampPercent(p) {
  const n = Number(p);
  if (!Number.isFinite(n)) return DEFAULT_PERCENT;
  return Math.max(MIN_PERCENT, Math.min(MAX_PERCENT, Math.round(n)));
}

export function normalizeTarget(t) {
  return t === "all" || t === "multi" ? "all" : "single";
}

// Resolves an explicit effectType (canonical or legacy) + params into canonical form.
function resolveEffectType(card) {
  const explicit = card.uniqueAttackEffectType;
  if (explicit && LEGACY_EFFECT_MAP[explicit]) {
    const mapped = LEGACY_EFFECT_MAP[explicit];
    return {
      effectType: mapped.type,
      effectPercent: card.uniqueAttackEffectPercent ?? mapped.effectPercent,
      effectDuration: card.uniqueAttackEffectDuration ?? mapped.effectDuration,
    };
  }
  if (explicit && EFFECT_TYPES[explicit]) {
    return {
      effectType: explicit,
      effectPercent: card.uniqueAttackEffectPercent,
      effectDuration: card.uniqueAttackEffectDuration,
    };
  }
  // No structured field — infer from free-text (legacy cards).
  return {
    effectType: mapEffectType(card.uniqueAttackEffect, explicit),
    effectPercent: card.uniqueAttackEffectPercent,
    effectDuration: card.uniqueAttackEffectDuration,
  };
}

// Maps admin-authored free-text effect onto a canonical mechanic for legacy
// cards that carry no uniqueAttackEffectType field. Unmapped text → "none".
function mapEffectType(effect, explicit) {
  if (explicit && EFFECT_TYPES[explicit]) return explicit;
  if (explicit && LEGACY_EFFECT_MAP[explicit]) return LEGACY_EFFECT_MAP[explicit].type;
  const e = (effect || "").toLowerCase();
  if (!e) return "none";
  const heals = e.includes("heal") || e.includes("restore") || e.includes("recov");
  if (heals && (e.includes("all") || e.includes("every") || e.includes("each"))) return "healAll";
  if (heals) return "healSelf";
  if (e.includes("half") || e.includes("reduce") || e.includes("50% less") || (e.includes("less") && e.includes("damage"))) {
    return "halfAttackTarget";
  }
  return "none";
}

// Static definition { name, percent, target, effect, effectType, effectPercent, effectDuration } or null.
export function getUniqueAttackDefinition(baseName) {
  const raw = data[baseName];
  if (!raw) return null;
  const percent = clampPercent(raw.percent);
  const mapped = LEGACY_EFFECT_MAP[raw.effectType] || { type: raw.effectType || "none" };
  return {
    name: raw.name,
    percent,
    target: normalizeTarget(raw.target),
    effect: raw.effect || "",
    effectType: mapped.type,
    effectPercent: raw.effectPercent ?? mapped.effectPercent,
    effectDuration: raw.effectDuration ?? mapped.effectDuration,
  };
}

// Resolves a card's unique attack. Admin-authored fields stamped onto the card
// take precedence over the static JSON; a card with no admin config falls back
// to the static definition by baseName. Works for any card object.
export function resolveUniqueAttack(card) {
  if (!card || !card.baseName) return null;
  const hasAdmin =
    !!card.uniqueAttackName ||
    !!card.uniqueAttackEffectType ||
    !!card.uniqueAttackEffect ||
    Number(card.uniqueAttackPercent) > 0;
  if (hasAdmin) {
    const eff = resolveEffectType(card);
    return {
      name: card.uniqueAttackName || card.baseName,
      percent: clampPercent(card.uniqueAttackPercent || DEFAULT_PERCENT),
      target: normalizeTarget(card.uniqueAttackTarget),
      effect: card.uniqueAttackEffect || "",
      effectType: eff.effectType,
      effectPercent: eff.effectPercent,
      effectDuration: eff.effectDuration,
    };
  }
  return getUniqueAttackDefinition(card.baseName);
}

// Backwards-compat alias used by existing imports.
export const cardUniqueAttack = resolveUniqueAttack;

// Damage for a unique attack = floor(card.attack * percent / 100). One floor at
// the end, matching the normal-attack integer-damage convention; defense/crit/
// bonus still apply via computeDamage in the hooks. "all" targets each take
// this same amount; in 1v1/PvP there is a single target so it applies once.
export function uniqueAttackDamage(card, definition) {
  if (!card || !definition) return 0;
  const pct = clampPercent(definition.percent);
  return Math.floor(((card.attack || 0) * pct) / 100);
}

// Effective percent for an effect, falling back to a sensible default per effect.
export function effectiveEffectPercent(definition, fallback = 20) {
  const p = Number(definition?.effectPercent);
  return Number.isFinite(p) && p > 0 ? Math.min(MAX_PERCENT, Math.round(p)) : fallback;
}

// Effective duration (turns) for an effect.
export function effectiveEffectDuration(definition, fallback = 1) {
  const d = Number(definition?.effectDuration);
  return Number.isFinite(d) && d > 0 ? Math.min(10, Math.round(d)) : fallback;
}

// Pure helper: heal amounts for a team after a destroy-triggered (or team-heal)
// effect. teamCards: [{ maxHp }] (or card-like objects). Returns [{ idx, amount }]
// where amount is the heal (caller clamps to maxHp). Does not mutate.
export function computeTeamHeals(teamCards, effectPercent) {
  const pct = clampPercent(effectPercent);
  const frac = pct / 100;
  return (teamCards || []).map((c, idx) => ({
    idx,
    amount: Math.round((c.maxHp || 0) * frac),
  }));
}

// Human-readable combat-log line for a triggered effect.
export function effectLogMessage(definition, { attackerName, destroyed } = {}) {
  if (!definition || definition.effectType === "none") return "";
  const who = attackerName || "Card";
  switch (definition.effectType) {
    case "healSelf":
      return `${who} healed itself with its Unique Attack.`;
    case "healAll":
      return `${who}'s team healed all active cards.`;
    case "halfAttackTarget":
      return `Target's attack was reduced by the Unique Attack.`;
    case "healTeamOnDestroy":
      return destroyed ? `${who}'s team healed after destroying a card!` : "";
    default:
      return "";
  }
}