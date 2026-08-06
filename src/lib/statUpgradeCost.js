import { STAT_UPGRADES, TIER_STAT_UPGRADE_COST, MAX_STAT_UPGRADES_PER_TIER } from "@/lib/gameConstants";

// Every tier allows 2 uses per stat; the 2nd use costs double the 1st.
// Tier 1 base = STAT_UPGRADES.cost; Tiers 2-4 base = flat TIER_STAT_UPGRADE_COST.
export function getStatUpgradeCost(tier, key, usesInTier) {
  const base = tier === 1
    ? STAT_UPGRADES.find((u) => u.key === key).cost
    : TIER_STAT_UPGRADE_COST[tier];
  return usesInTier === 0 ? base : base * 2;
}

export function getStatUpgradeMaxUses(tier) {
  return MAX_STAT_UPGRADES_PER_TIER[tier] || 1;
}