import { UPGRADE_REQUIREMENTS } from "@/lib/gameConstants";

export function checkUpgradeEligible(card) {
  if (card.tier >= 4) return false;
  const req = UPGRADE_REQUIREMENTS[card.tier];
  return (
    card.winsVsBonus >= req.winsVsBonus &&
    card.winsVsNonBonus >= req.winsVsNonBonus &&
    card.gamesPlayed >= req.gamesPlayed
  );
}