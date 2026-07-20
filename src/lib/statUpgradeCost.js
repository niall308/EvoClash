import { STAT_UPGRADES, TIER_STAT_UPGRADE_COST, MAX_STAT_UPGRADES_PER_TIER } from "@/lib/gameConstants";

// Tier 1: base cost for the 1st use, doubled for the 2nd use (max 2 uses).
// Tiers 2-4: flat cost per tier, single use only.
export function getStatUpgradeCost(tier, key, usesInTier) {
  if (tier === 1) {
    const base = STAT_UPGRADES.find((u) => u.key === key).cost;
    return usesInTier === 0 ? base : base * 2;
  }
  return TIER_STAT_UPGRADE_COST[tier];
}

export function getStatUpgradeMaxUses(tier) {
  return MAX_STAT_UPGRADES_PER_TIER[tier] || 1;
}