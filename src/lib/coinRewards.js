import { CARD_MILESTONES } from "@/lib/gameConstants";

// Checks a merged card against lifetime milestones, returning any newly earned
// coins and the updated claimed-milestones list to persist on the card.
export function checkCardMilestones(card) {
  const claimed = card.claimedCardMilestones || [];
  let coins = 0;
  const newlyClaimed = [];
  for (const m of CARD_MILESTONES) {
    if (claimed.includes(m.id)) continue;
    const value = m.type === "totalWins" ? card.totalWins : card.totalGames;
    if (value >= m.target) {
      coins += m.coinReward;
      newlyClaimed.push(m.id);
    }
  }
  return { coins, claimedCardMilestones: [...claimed, ...newlyClaimed] };
}