// Unique Attack feature: each creature can have a once-per-match special attack.
//
// CANONICAL MODEL (documented in AGENTS.md):
//   name            (uniqueAttackName)        string
//   damagePercent   (uniqueAttackPercent)    number 0–200
//   target          (uniqueAttackTarget)      "single" | "all"   (legacy "multi" → "all")
//   effectType      (uniqueAttackEffectType)  one of EFFECT_TYPES below
//   effectPercent   (uniqueAttackEffectPercent) optional numeric param (0–200)
//   effectDuration  (uniqueAttackEffectDuration) optional numeric param (turns)
//   description     (uniqueAttackEffect)      admin-facing display text only
//
// The flat uniqueAttack* field names are the canonical storage because Card
// already has a `name` field. Legacy creatures that only set uniqueAttackEffect
// (free text) keep working via mapEffectType until they are migrated to an
// explicit effectType via the Manage Creatures screen.
//
// PRECEDENCE: admin-authored fields stamped onto the card (server-side at
// creation/backfill from the Creature entity) take precedence over the static
// /data/uniqueAttacks.json fallback, which only applies to creatures with no
// admin configuration. Cards COPY the attack at creation (not dynamic), and
// the admin "Sync UA to Cards" action backfills existing cards.
//
// The `used` flag is NOT stored here — it is per-match runtime state owned by
// the battle hook and mirrored server-side on the AiMatch session via the
// recordUniqueAttack backend function (authoritative reuse guard).

import data from "../../data/uniqueAttacks.json";

export const UNIQUE_ATTACK_I18N = {
  buttonLabel: "Unique Attack",
  usedBadge: "USED",
  oncePerGame: "1 use this game",
  allTargets: "All targets",
  singleTarget: "Single target",
  noEffect: "No additional effect",
  customEffect: "Custom effect — needs design mapping",
};

// One canonical maximum percentage everywhere (frontend, schema, backend, resolver).
export const MAX_PERCENT = 200;
export const MIN_PERCENT = 0;

// Supported, predefined effect identifiers. Add new effects here and to
// resolveUniqueAttackEffect; never execute free-form text as a mechanic.
export const EFFECT_TYPES = {
  none: "No extra effect",
  heal_self: "Heal self (% of max HP)",
  heal_team: "Heal all active cards (% of max HP each)",
  heal_team_on_destroy: "Heal all active cards on destroy (% of max HP each)",
  half_attack_target: "Halve target's attack (for N turns)",
  custom: "Custom (display text only)",
};

// Legacy free-text/static-JSON effect ids mapped onto the canonical ids so old
// card data and /data/uniqueAttacks.json keep working without a forced migration.
const LEGACY_EFFECT = {
  none: "none",
  healSelf50: "heal_self",
  healAll30: "heal_team",
  halfAttackTarget1: "half_attack_target",
  custom: "custom",
};

export function clampPercent(p) {
  const n = Number(p);
  if (!Number.isFinite(n)) return 100;
  return Math.max(MIN_PERCENT, Math.min(MAX_PERCENT, Math.round(n)));
}

export function normalizeTarget(t) {
  if (t === "all" || t === "multi") return "all";
  return "single";
}

export function normalizeEffectType(et) {
  if (!et) return "none";
  if (EFFECT_TYPES[et]) return et;
  return LEGACY_EFFECT[et] || "none";
}

// Returns the static definition { name, percent, target, effect, effectType,
// effectPercent, effectDuration } or null. Used only as a fallback for cards
// whose creature has no admin-authored configuration.
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
    target: normalizeTarget(raw.target),
    effect: raw.effect || "",
    effectType: normalizeEffectType(raw.effectType),
    effectPercent: Number(raw.effectPercent) || 0,
    effectDuration: Number(raw.effectDuration) || 0,
  };
}

// Maps an admin-authored free-text description onto a known mechanic for
// backward compatibility with creatures configured before effectType existed.
// New configurations should set uniqueAttackEffectType directly instead.
function mapEffectType(effect) {
  const e = (effect || "").toLowerCase();
  if (!e) return "none";
  const heals = e.includes("heal") || e.includes("restore") || e.includes("recov");
  if (heals && (e.includes("all") || e.includes("every") || e.includes("each"))) return "heal_team";
  if (heals) return "heal_self";
  if (e.includes("half") || e.includes("less damage") || e.includes("50% less") || (e.includes("reduce") && e.includes("attack"))) {
    return "half_attack_target";
  }
  return "none";
}

// Resolves a card's unique attack. Admin-authored fields stamped onto the card
// take precedence over the static JSON definitions; a card with no admin config
// falls back to the static definition by baseName. Works for any card object
// (player Card, AiDeckCard, or a live-generated AI card carrying no stamped fields).
export function cardUniqueAttack(card) {
  if (!card || !card.baseName) return null;
  const hasAdmin =
    !!card.uniqueAttackName ||
    (card.uniqueAttackPercent || 0) > 0 ||
    !!card.uniqueAttackEffect ||
    (!!card.uniqueAttackEffectType && card.uniqueAttackEffectType !== "none");
  if (hasAdmin) {
    const effectType = card.uniqueAttackEffectType && card.uniqueAttackEffectType !== "none"
      ? normalizeEffectType(card.uniqueAttackEffectType)
      : mapEffectType(card.uniqueAttackEffect);
    return {
      name: card.uniqueAttackName || card.baseName,
      percent: clampPercent(card.uniqueAttackPercent || 100),
      target: normalizeTarget(card.uniqueAttackTarget),
      effect: card.uniqueAttackEffect || "",
      effectType,
      effectPercent: Math.max(0, Math.min(MAX_PERCENT, Number(card.uniqueAttackEffectPercent) || 0)),
      effectDuration: Math.max(0, Number(card.uniqueAttackEffectDuration) || 0),
    };
  }
  return getUniqueAttackDefinition(card.baseName);
}

// Damage for a unique attack = floor(card.attack * percent / 100), then run
// through the normal computeDamage (defense/crit/bonus still apply). "all" targets
// each take this same amount; in 1v1 there is a single target so it applies once.
// The full percentage product is computed before flooring once, matching normal
// attack integer math.
export function uniqueAttackDamage(card, definition) {
  if (!card || !definition) return 0;
  const pct = clampPercent(definition.percent);
  return Math.floor(((card.attack || 0) * pct) / 100);
}

// Pure descriptor of what an effect should do, given battle context. Centralizes
// the rules; hooks only own state mutation. ctx.destroyedOpponentCount gates
// heal_team_on_destroy so it fires only when the attack actually destroyed a card.
export function resolveUniqueAttackEffect(def, ctx = {}) {
  const et = normalizeEffectType(def?.effectType);
  const destroyed = (ctx.destroyedOpponentCount || 0) > 0;
  const effectPercent = Math.max(0, Math.min(MAX_PERCENT, Number(def?.effectPercent) || 0));
  const effectDuration = Math.max(0, Number(def?.effectDuration) || 0);
  const out = { applies: false, effectType: et, healSelf: false, healTeam: false, healPercent: 0, halfAttackTarget: false, halfAttackTurns: 0, log: null };
  switch (et) {
    case "heal_self":
      out.applies = true;
      out.healSelf = true;
      out.healPercent = effectPercent || 50;
      out.log = `Healed ${out.healPercent}% of max HP!`;
      break;
    case "heal_team":
      out.applies = true;
      out.healTeam = true;
      out.healPercent = effectPercent || 30;
      out.log = `Healed all active cards by ${out.healPercent}%!`;
      break;
    case "heal_team_on_destroy":
      if (destroyed) {
        out.applies = true;
        out.healTeam = true;
        out.healPercent = effectPercent || 20;
        out.log = `Destroyed a card — all active cards healed ${out.healPercent}%!`;
      }
      break;
    case "half_attack_target":
      out.applies = true;
      out.halfAttackTarget = true;
      out.halfAttackTurns = effectDuration || 1;
      out.log = `Target's attack halved for ${out.halfAttackTurns} turn(s)!`;
      break;
    default:
      break;
  }
  return out;
}

// Validates an admin-authored UA configuration object (the raw form values).
// Returns { valid: boolean, errors: { percent, effectPercent, effectDuration } }.
export function validateUniqueAttack(value = {}) {
  const errors = {};
  const pct = Number(value.uniqueAttackPercent);
  if (value.uniqueAttackPercent !== "" && value.uniqueAttackPercent != null && (!Number.isFinite(pct) || pct < 0 || pct > 200)) {
    errors.percent = "Damage % must be 0–200.";
  }
  const et = normalizeEffectType(value.uniqueAttackEffectType);
  if (et === "heal_self" || et === "heal_team" || et === "heal_team_on_destroy") {
    const ep = Number(value.uniqueAttackEffectPercent);
    if (value.uniqueAttackEffectPercent !== "" && value.uniqueAttackEffectPercent != null && (!Number.isFinite(ep) || ep < 0 || ep > 200)) {
      errors.effectPercent = "Effect % must be 0–200.";
    }
  }
  if (et === "half_attack_target") {
    const ed = Number(value.uniqueAttackEffectDuration);
    if (value.uniqueAttackEffectDuration !== "" && value.uniqueAttackEffectDuration != null && (!Number.isFinite(ed) || ed < 0 || !Number.isInteger(ed))) {
      errors.effectDuration = "Duration must be a whole number ≥ 0.";
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

// Normalizes a raw form-values object into the canonical persisted shape.
export function normalizeUniqueAttackForm(value = {}) {
  return {
    uniqueAttackName: (value.uniqueAttackName || "").trim(),
    uniqueAttackPercent: clampPercent(value.uniqueAttackPercent),
    uniqueAttackTarget: normalizeTarget(value.uniqueAttackTarget),
    uniqueAttackEffectType: normalizeEffectType(value.uniqueAttackEffectType),
    uniqueAttackEffectPercent: Math.max(0, Math.min(MAX_PERCENT, Math.round(Number(value.uniqueAttackEffectPercent) || 0))),
    uniqueAttackEffectDuration: Math.max(0, Math.round(Number(value.uniqueAttackEffectDuration) || 0)),
    uniqueAttackEffect: (value.uniqueAttackEffect || "").trim(),
  };
}

// Convenience: resolves the effect and invokes hook-provided appliers. Each hook
// passes only the state mutators it needs; the registry decides what runs.
export function applyUniqueAttackEffect(def, ctx, appliers = {}) {
  const r = resolveUniqueAttackEffect(def, ctx);
  if (!r.applies) return r;
  if (r.healSelf && appliers.healSelf) appliers.healSelf(r.healPercent);
  if (r.healTeam && appliers.healTeam) appliers.healTeam(r.healPercent);
  if (r.halfAttackTarget && appliers.halfAttackTarget) appliers.halfAttackTarget(r.halfAttackTurns);
  if (r.log && appliers.log) appliers.log(r.log);
  return r;
}