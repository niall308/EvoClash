// Server-side source of truth for card creation free-limits/coin-cost.
// Mirrors src/lib/cardCreationLimits.js — kept here since backend functions
// can't import frontend source.

export const FREE_CARDS_INITIAL = 15;
export const FREE_CREATIONS_PER_DAY = 3;
export const EXTRA_CREATURE_COST = 25000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Returns the current free-creation status for a user, given their real
// (server-counted) owned card total.
export function getCreationStatus(user, totalOwned) {
  if (user.role === 'admin') return { totalCreated: 0, freeRemaining: Infinity, needsPayment: false };
  const totalCreated = user.totalCardsCreated ?? totalOwned ?? 0;
  const pastInitialFree = totalCreated >= FREE_CARDS_INITIAL;
  const resetAt = user.dailyFreeResetAt ? new Date(user.dailyFreeResetAt).getTime() : 0;
  const withinWindow = resetAt && Date.now() - resetAt <= DAY_MS;
  const dailyUsed = withinWindow ? user.dailyFreeCreations || 0 : 0;
  const freeRemaining = pastInitialFree ? Math.max(0, FREE_CREATIONS_PER_DAY - dailyUsed) : Infinity;
  const needsPayment = pastInitialFree && freeRemaining <= 0;
  return { totalCreated, pastInitialFree, dailyUsed, withinWindow, freeRemaining, needsPayment };
}

// Computes the updateMe payload to persist after creating a new card
// (increments counters and/or deducts coins server-side).
export function buildCreationUpdate(user, totalOwned) {
  if (user.role === 'admin') return {};
  const status = getCreationStatus(user, totalOwned);
  const totalCardsCreated = status.totalCreated + 1;
  if (!status.pastInitialFree) return { totalCardsCreated };
  if (!status.needsPayment) {
    const dailyFreeResetAt = status.withinWindow ? user.dailyFreeResetAt : new Date().toISOString();
    const dailyFreeCreations = (status.withinWindow ? user.dailyFreeCreations || 0 : 0) + 1;
    return { totalCardsCreated, dailyFreeCreations, dailyFreeResetAt };
  }
  return { totalCardsCreated, coins: (user.coins || 0) - EXTRA_CREATURE_COST };
}