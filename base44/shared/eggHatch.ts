// Shared egg-hatching math for the buyEgg / payHatchDay / reconcileEggs backend
// functions. Kept here (not duplicated) so the missed-day penalty rule is
// identical everywhere it runs.
//
// Daily-hatch model (per the Egg Store spec):
//   - A player pays 250 LC once per calendar day to advance an egg by 1 day.
//   - Each full calendar day that passes WITHOUT a payment subtracts 1 from
//     the egg's progress (floored at 0). Penalties are reconciled on login,
//     per egg, up to yesterday (today is never penalized — it can still be paid).
//
// State on each egg: progress, lastPaidDate (YYYY-MM-DD UTC, or ""), and
// lastSettledDate (YYYY-MM-DD UTC through which penalties have been applied).

export const EGG_BUY_COST = 500000;
export const EGG_DAILY_COST = 250;
export const EGG_MAX_OWNED = 5;
export const EGG_HATCH_DAYS = 30;
export const EGG_SELL_VALUE = 50000;
export const DAY_MS = 24 * 60 * 60 * 1000;

// YYYY-MM-DD in UTC. Used by the server so "today" is timezone-stable across
// clients (the client mirrors this with new Date().toISOString().slice(0,10)).
export function todayStrUTC(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function parseDate(s: string): Date {
  return new Date(s + "T00:00:00.000Z");
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Reconcile missed-day penalties for a single egg up to (but not including)
// today. Pure — does not touch the DB. Returns the post-reconcile fields plus
// `missedDays` (for logging) and `changed` (so callers can skip no-op writes).
export function reconcileEggState(egg: any, today: string) {
  const progress = egg.progress || 0;
  const lastPaidDate = egg.lastPaidDate || "";
  let lastSettledDate = egg.lastSettledDate || today;

  // Already reconciled today — nothing to do.
  if (lastSettledDate === today) {
    return { progress, lastPaidDate, lastSettledDate, missedDays: 0, changed: false };
  }

  // Clock skew / future-dated settle: clamp back to today with no penalty.
  if (lastSettledDate > today) {
    return { progress, lastPaidDate, lastSettledDate: today, missedDays: 0, changed: true };
  }

  // Count full missed days from the day after lastSettledDate through yesterday.
  let missed = 0;
  let cursor = addDays(lastSettledDate, 1);
  const yesterday = addDays(today, -1);
  while (cursor <= yesterday) {
    if (!lastPaidDate || cursor > lastPaidDate) missed++;
    cursor = addDays(cursor, 1);
  }

  const newProgress = Math.max(0, progress - missed);
  return {
    progress: newProgress,
    lastPaidDate,
    lastSettledDate: yesterday,
    missedDays: missed,
    changed: missed > 0,
  };
}