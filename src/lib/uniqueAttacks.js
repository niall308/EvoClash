// Unique Attack system: each creature can have a once-per-match special attack.
//
// DATA MODEL (copy-at-creation):
//   Cards permanently copy the Unique Attack fields from their Creature at
//   creation time (createGeneratedCard / AdminAiDecks). Editing a Creature
//   later does NOT change cards that already exist — an admin must run the
//   "Sync UA to Cards" action (syncUniqueAttacks backend function) to push
//   the change to existing cards. This keeps cards self-contained so PvP
//   opponent cards resolve without a per-battle Creature lookup.
//
//   Fields stamped on every card:
//     uniqueAttackName, uniqueAttackPercent, uniqueAttackTarget,
//     uniqueAttackEffect (free-text display), uniqueAttackEffectType (enum).
//
// EFFECTS:
//   Effects are structured, validated mechanics — never free-text execution.
//   The admin picks an effectType from a fixed enum; the free-text
//   uniqueAttackEffect field is display-only flavor. The EFFECT_REGISTRY maps
//   each effectType to a pure handler returning normalized mutations that every
//   battle hook (1v1 AI, 3v3, PvP) applies in its own state shape, so all modes
//   stay consistent and new effects are added without touching hooks.
//
// LEGACY:
//   data/uniqueAttacks.json is a fallback for cards whose Creature has no UA
//   configured. It uses canonical effectType names; legacy names from older
//   data are normalized via normalizeEffectType. Target values "multi" (old
//   enum) are normalized to "all".
//
// The `used` flag is per-match runtime state owned by the battle hook and
// mirrored server-side: AiMatch.usedUniqueAttacks (AI) or
// PvpMatch.usedUniqueAttacks (PvP) via the recordUniqueAttack backend function
// — the authoritative guard against replay/reuse across reconnects or two
// PvP clients.

import data from "../../data/uniqueAttacks.json";
import { maxHealth } from "@/lib/battleEngine";

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

// ---- Validation constants (the single source of truth for caps) ----
export const MAX_PERCENT = 200;
const MIN_POSITIVE_PERCENT = 1;

// ---- Canonical effect-type enum ----
export const EFFECT_TYPES = ["none", "healSelf", "healAll", "halfAttack", "healTeamOnDestroy"];

// Legacy static-JSON / old-card effectType names → canonical names.
const LEGACY_EFFECT_MAP = {
  healself50: "healSelf",
  healall30: "healAll",
  halfattacktarget1: "halfAttack",
  custom: "none",
};

export function normalizeEffectType(et) {
  if (!et) return "none";
  const key = String(et).toLowerCase();
  if (EFFECT_TYPES.includes(key)) return key;
  return LEGACY_EFFECT_MAP[key] || "none";
}

export function normalizeTarget(t) {
  return t === "all" || t === "multi" ? "all" : "single";
}

// Clamps a unique-attack percentage. 0 / negative / non-finite → 0 (meaning
// "no UA configured"); positive values clamp to [1, MAX_PERCENT].
export function clampPercent(p) {
  const n = Number(p);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(MAX_PERCENT, Math.max(MIN_POSITIVE_PERCENT, Math.round(n)));
}

// Returns the static definition { name, percent, target, effect, effectType } or null.
export function getUniqueAttackDefinition(baseName) {
  const raw = data[baseName];
  if (!raw) return null;
  const percent = clampPercent(raw.percent);
  return {
    name: raw.name,
    percent,
    target: normalizeTarget(raw.target),
    effect: raw.effect || "",
    effectType: normalizeEffectType(raw.effectType),
  };
}

// Maps a legacy free-text effect onto a canonical effectType — used ONLY for
// cards that predate the uniqueAttackEffectType field (no stamped effectType).
// New/admin cards carry an explicit effectType and never go through this.
function mapEffectType(effect) {
  const e = (effect || "").toLowerCase();
  if (!e) return "none";
  const heals = e.includes("heal") || e.includes("restore") || e.includes("recov");
  if (heals && (e.includes("all") || e.includes("every") || e.includes("each"))) return "healAll";
  if (heals) return "healSelf";
  if (e.includes("half") || e.includes("less damage") || e.includes("50% less") || (e.includes("reduce") && e.includes("attack"))) {
    return "halfAttack";
  }
  return "none";
}

// Resolves a card's unique attack. Admin-authored fields stamped onto the card
// take precedence over the static JSON definitions; a card with no admin config
// falls back to the static definition by baseName. Works for any card object
// (player Card, AiDeckCard, or a live-generated AI card that carries no stamped
// fields). Emits canonical target ("all"|"single") and effectType.
export function cardUniqueAttack(card) {
  if (!card || !card.baseName) return null;
  const hasAdmin =
    !!card.uniqueAttackName ||
    (card.uniqueAttackPercent || 0) > 0 ||
    !!card.uniqueAttackEffect;
  if (hasAdmin) {
    const effectType = card.uniqueAttackEffectType
      ? normalizeEffectType(card.uniqueAttackEffectType)
      : mapEffectType(card.uniqueAttackEffect);
    return {
      name: card.uniqueAttackName || card.baseName,
      percent: clampPercent(card.uniqueAttackPercent || 100),
      target: normalizeTarget(card.uniqueAttackTarget),
      effect: card.uniqueAttackEffect || "",
      effectType,
    };
  }
  return getUniqueAttackDefinition(card.baseName);
}

// Damage for a unique attack = round(attack * percent / 100), a single
// expression with one rounding step — matching computeDamage's Math.round
// convention (NOT Math.floor) so percentage damage is consistent with normal
// attack rounding. "all" targets each take this same amount; in 1v1 there is a
// single target so it just applies once.
export function uniqueAttackDamage(card, definition) {
  if (!card || !definition) return 0;
  const pct = clampPercent(definition.percent);
  return Math.round(((card.attack || 0) * pct) / 100);
}

// ---- Effect registry ---------------------------------------------------------
// Each handler receives a normalized context and returns a normalized result.
// Hooks translate the result into their own state shape (see applyHeals /
// halfAttackTarget wiring in useBattleMatch, useBattle3v3, usePvpMatch).
//
// ctx = {
//   effectType,      // canonical effect type (already normalized by the caller)
//   attackerCard,   // the card that used the unique attack
//   destroyedCount, // opposing cards destroyed by this attack (0 if none)
//   ownActiveCards, // [{ card, maxHp }] — all live cards on the attacker's side
// }
//
// returns {
//   heals: [{ card, amount }],  // heal each card by amount (hook clamps to max)
//   halfAttackTarget: boolean,  // debuff the attacked target's attack for 1 turn
//   log: string,                // combat-log message (empty = no message)
// }
const HEAL_SELF_FRACTION = 0.5;
const HEAL_ALL_FRACTION = 0.3;
const HEAL_TEAM_ON_DESTROY_FRACTION = 0.2;

export const EFFECT_REGISTRY = {
  none: () => ({ heals: [], halfAttackTarget: false, log: "" }),

  healSelf: (ctx) => ({
    heals: [{ card: ctx.attackerCard, amount: Math.round(maxHealth(ctx.attackerCard) * HEAL_SELF_FRACTION) }],
    halfAttackTarget: false,
    log: "",
  }),

  healAll: (ctx) => ({
    heals: (ctx.ownActiveCards || []).map((s) => ({ card: s.card, amount: Math.round(s.maxHp * HEAL_ALL_FRACTION) })),
    halfAttackTarget: false,
    log: "",
  }),

  halfAttack: () => ({ heals: [], halfAttackTarget: true, log: "" }),

  healTeamOnDestroy: (ctx) => {
    if ((ctx.destroyedCount || 0) < 1) return { heals: [], halfAttackTarget: false, log: "" };
    return {
      heals: (ctx.ownActiveCards || []).map((s) => ({ card: s.card, amount: Math.round(s.maxHp * HEAL_TEAM_ON_DESTROY_FRACTION) })),
      halfAttackTarget: false,
      log: "Triumphant! Your team healed 20% after destroying a card!",
    };
  },
};

// Resolves and applies an effect via the registry. Always returns a valid
// result object (unknown effectTypes fall back to "none").
export function applyUniqueAttackEffect(effectType, ctx) {
  const canonical = normalizeEffectType(effectType);
  const handler = EFFECT_REGISTRY[canonical] || EFFECT_REGISTRY.none;
  return handler(ctx || {});
}