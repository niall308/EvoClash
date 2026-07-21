import { UPGRADE_REQUIREMENT } from "@/lib/gameConstants";

export function checkUpgradeEligible(card) {
  if (card.tier >= 4) return false;
  return (
    (card.totalWins || 0) >= UPGRADE_REQUIREMENT.cardsDestroyed &&
    (card.totalGames || 0) >= UPGRADE_REQUIREMENT.gamesPlayed &&
    (card.matchWins || 0) >= UPGRADE_REQUIREMENT.matchWins
  );
}