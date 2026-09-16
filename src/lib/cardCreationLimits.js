import { FREE_CARDS_INITIAL, FREE_CREATIONS_PER_DAY, EXTRA_CREATURE_COST } from "@/lib/gameConstants";

const DAY_MS = 24 * 60 * 60 * 1000;

// Returns the current free-creation status for a user, given their lifetime
// deck size fallback (for users created before totalCardsCreated existed).
export function getCreationStatus(user, fallbackCount) {
  if (user.role === "admin") return { totalCreated: 0, freeRemaining: Infinity, needsPayment: false };
  const totalCreated = user.totalCardsCreated ?? fallbackCount ?? 0;
  const pastInitialFree = totalCreated >= FREE_CARDS_INITIAL;
  const resetAt = user.dailyFreeResetAt ? new Date(user.dailyFreeResetAt).getTime() : 0;
  const withinWindow = resetAt && Date.now() - resetAt <= DAY_MS;
  const dailyUsed = withinWindow ? user.dailyFreeCreations || 0 : 0;
  const freeRemaining = pastInitialFree ? Math.max(0, FREE_CREATIONS_PER_DAY - dailyUsed) : Infinity;
  const needsPayment = pastInitialFree && freeRemaining <= 0;
  return { totalCreated, pastInitialFree, dailyUsed, withinWindow, freeRemaining, needsPayment };
}

// Computes the updateMe payload to persist after creating a new card.
export function buildCreationUpdate(user, fallbackCount) {
  if (user.role === "admin") return {};
  const status = getCreationStatus(user, fallbackCount);
  const totalCardsCreated = status.totalCreated + 1;
  if (!status.pastInitialFree) return { totalCardsCreated };
  if (!status.needsPayment) {
    const dailyFreeResetAt = status.withinWindow ? user.dailyFreeResetAt : new Date().toISOString();
    const dailyFreeCreations = (status.withinWindow ? user.dailyFreeCreations || 0 : 0) + 1;
    return { totalCardsCreated, dailyFreeCreations, dailyFreeResetAt };
  }
  return { totalCardsCreated, coins: (user.coins || 0) - EXTRA_CREATURE_COST };
}

export { EXTRA_CREATURE_COST };