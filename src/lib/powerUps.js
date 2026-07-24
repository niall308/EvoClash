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