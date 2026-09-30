export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;

export function isTimestampReady(ts, windowMs = DAY_MS) {
  return !ts || Date.now() - new Date(ts).getTime() >= windowMs;
}

export function dailyMultiRemaining(user, usesField, resetField, maxPerDay) {
  const reset = isTimestampReady(user?.[resetField], DAY_MS);
  const used = reset ? 0 : user?.[usesField] || 0;
  return Math.max(0, maxPerDay - used);
}

export function isPowerAvailable(user, def) {
  if (!user) return false;
  if (def.cooldownType === "daily") return isTimestampReady(user[def.usedAtField], DAY_MS);
  if (def.cooldownType === "weekly") return isTimestampReady(user[def.usedAtField], WEEK_MS);
  if (def.cooldownType === "dailyMulti") return dailyMultiRemaining(user, def.usesField, def.resetField, def.maxPerDay) > 0;
  // "premium": never free — only ready once bought (usedAtField holds an owned flag, not a timestamp).
  if (def.cooldownType === "premium") return !!user[def.usedAtField];
  return false;
}

// Milliseconds left until a cooldown power is ready again. 0 when ready.
// For "premium" powers, returns Infinity when unowned (never ready without purchase).
export function cooldownRemainingMs(user, def) {
  if (!user) return 0;
  if (def.cooldownType === "daily" || def.cooldownType === "weekly") {
    const ts = user[def.usedAtField];
    if (!ts) return 0;
    const window = def.cooldownType === "weekly" ? WEEK_MS : DAY_MS;
    return Math.max(0, window - (Date.now() - new Date(ts).getTime()));
  }
  if (def.cooldownType === "dailyMulti") {
    const remaining = dailyMultiRemaining(user, def.usesField, def.resetField, def.maxPerDay);
    if (remaining > 0) return 0;
    const resetTs = user[def.resetField];
    if (!resetTs) return 0;
    return Math.max(0, DAY_MS - (Date.now() - new Date(resetTs).getTime()));
  }
  if (def.cooldownType === "premium") return user[def.usedAtField] ? 0 : Infinity;
  return 0;
}

// "18h 32m" / "5m" / "Now" — compact human label for a countdown badge.
export function formatCooldownCompact(ms) {
  if (!ms || ms <= 0) return "Now";
  if (!isFinite(ms)) return "—";
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h >= 24) {
    const days = Math.floor(h / 24);
    const remH = h % 24;
    return remH ? `${days}d ${remH}h` : `${days}d`;
  }
  if (h > 0) return m ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

// Display-only heuristic: which powers require a card in play to be usable.
// Derived from the battle hook's canUseMap gating so the button can explain
// WHY it is locked (e.g. "Play a card first"). Pure UI; does not affect logic.
const NEEDS_PLAYER_CARD = new Set([
  "t2Upgrade", "t3Upgrade", "t4Upgrade", "shield25", "heal20", "heal50",
  "fullRestore", "maxHPBoost25", "swapActiveCard50HP", "duplicateCard",
  "upgradeTierOneBattle", "maximizeAttackTurn", "maximizeDefenseTurn",
  "increaseAllStats20", "increaseBonusDamage100",
]);
const NEEDS_OPPONENT_CARD = new Set(["burn", "halfAttack", "returnOpponentCard"]);

// Returns a display-only readiness descriptor for a power button in battle.
// state values: 'ready' | 'cooldown' | 'exhausted' | 'unowned' | 'notTurn' |
// 'usedThisTurn' | 'needsCard' | 'needsOpponent' | 'locked' | 'noMode'
// `battleContext` is optional and lets the UI explain battle-phase locks; when
// omitted, phase/turn reasons degrade to the generic 'locked' label.
export function getPowerBattleStatus(user, def, { hasHandler, canUse, battleContext } = {}) {
  if (!hasHandler) return { state: "noMode", text: "Not in this mode" };

  const ready = isPowerAvailable(user, def);
  if (!ready) {
    if (def.cooldownType === "premium") return { state: "unowned", text: "Buy to use" };
    if (def.cooldownType === "dailyMulti") {
      const used = def.maxPerDay - dailyMultiRemaining(user, def.usesField, def.resetField, def.maxPerDay);
      return { state: "exhausted", text: `${used}/${def.maxPerDay} used`, countdownMs: cooldownRemainingMs(user, def) };
    }
    return { state: "cooldown", text: "On cooldown", countdownMs: cooldownRemainingMs(user, def) };
  }

  if (canUse) return { state: "ready", text: "" };

  const ctx = battleContext || {};
  if (ctx.inBattle === false) {
    return { state: "notTurn", text: "Battle not started" };
  }
  if (ctx.isPlayerTurn === false) {
    return { state: "notTurn", text: ctx.powerUsedThisTurn ? "Used this turn" : "Opponent's turn" };
  }
  if (ctx.powerUsedThisTurn) return { state: "usedThisTurn", text: "Used this turn" };

  if (NEEDS_PLAYER_CARD.has(def.key) && ctx.hasPlayerCard === false) {
    return { state: "needsCard", text: "Play a card first" };
  }
  if (NEEDS_OPPONENT_CARD.has(def.key) && ctx.hasAiCard === false) {
    return { state: "needsOpponent", text: "No opponent card" };
  }
  return { state: "locked", text: "Not usable now" };
}