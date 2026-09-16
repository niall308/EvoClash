// Structured Unique Attack effect registry. Each effect is a typed entry with
// metadata and an `apply(ctx)` function that receives a mode-agnostic context
// built by the calling battle hook. Adding a new effect = add an entry here and
// (only if it introduces a new trigger condition) a call site in the hook. No
// battle-hook rewrite is required for effects that reuse an existing trigger.
//
// Trigger model:
//   "destroy" — applied only AFTER the attack destroyed at least one opposing
//               card. `heal_team_on_destroy` is the first destroy-triggered
//               effect; the hooks call applyUniqueAttackEffect() from their
//               destruction branch.
//   "none"    — no mechanic; the effect text is descriptive only.
//
// The legacy "always-on" effects (healSelf50 / healAll30 / halfAttackTarget1)
// are still applied inline by the battle hooks (see useBattleMatch / useBattle3v3)
// so existing behavior is preserved exactly. They are listed in
// UNIQUE_ATTACK_EFFECT_OPTIONS so the admin dropdown can assign them explicitly
// via the structured `uniqueAttackEffectType` field, but their resolution path
// is unchanged.
//
// Context contract (built per-mode by the hook):
//   {
//     destroyedOpponent: boolean,            // true once a card was destroyed
//     healTeam: (fraction) => {              // heal every ACTIVE card on the
//       totalHealed: number,                 // attacking side by `fraction` of
//       cards: [{ id, healed, maxHp }],      // its max health, clamped to max.
//     },                                     // Persists in mode-appropriate state.
//     addLog: (message) => void,
//     playSound: (key) => void,
//   }

export const UNIQUE_ATTACK_EFFECTS = {
  none: {
    id: "none",
    label: "No effect",
    description: "Deals unique-attack damage with no extra effect.",
    triggersOn: "none",
    apply: () => null,
  },
  heal_team_on_destroy: {
    id: "heal_team_on_destroy",
    label: "Heal team 20% on destroy",
    description:
      "If this attack destroys an opposing card, all active cards on the attacking team heal 20% of their max health.",
    triggersOn: "destroy",
    apply: (ctx) => {
      if (!ctx || !ctx.destroyedOpponent) return null;
      if (typeof ctx.healTeam !== "function") return null;
      const res = ctx.healTeam(0.2);
      if (res && res.totalHealed > 0) {
        if (typeof ctx.addLog === "function") {
          ctx.addLog(`Bloodlust! The attacking team healed for ${res.totalHealed} HP after destroying a card!`);
        }
        if (typeof ctx.playSound === "function") ctx.playSound("heal");
      }
      return res;
    },
  },
};

export function resolveUniqueAttackEffect(effectType) {
  return UNIQUE_ATTACK_EFFECTS[effectType] || UNIQUE_ATTACK_EFFECTS.none;
}

// Dispatch a structured effect. Returns whatever the effect's apply returned
// (the heal result, or null for no-ops). Hooks use the return value to persist
// any HP change in their mode-appropriate state.
export function applyUniqueAttackEffect(effectType, ctx) {
  const def = resolveUniqueAttackEffect(effectType);
  return def.apply(ctx);
}

// Admin dropdown options for the structured `uniqueAttackEffectType` field.
// Includes the legacy effect ids so admins can assign them explicitly instead
// of relying on free-text matching (mapEffectType in uniqueAttacks.js).
export const UNIQUE_ATTACK_EFFECT_OPTIONS = [
  { value: "none", label: "No effect" },
  { value: "healSelf50", label: "Heal self 50%" },
  { value: "healAll30", label: "Heal team 30%" },
  { value: "halfAttackTarget1", label: "Half target's attack (1 turn)" },
  { value: "heal_team_on_destroy", label: "Heal team 20% on destroy" },
  { value: "custom", label: "Custom (descriptive only)" },
];