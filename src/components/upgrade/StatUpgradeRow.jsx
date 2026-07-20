import React from "react";
import { Coins, TrendingUp } from "lucide-react";

export default function StatUpgradeRow({ upgrade, card, coins, purchasing, onPurchase, capValue, cost, usesInTier, maxUses }) {
  const currentVal = card[upgrade.key] || 0;
  const newVal = Math.min(capValue, Math.round(currentVal * (1 + upgrade.percent / 100)));
  const capped = newVal <= currentVal;
  const usedUp = usesInTier >= maxUses;
  const maxed = capped || usedUp;
  const affordable = coins >= cost;
  const disabled = maxed || !affordable || purchasing;

  return (
    <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
      <div>
        <p className="font-semibold text-sm flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> {upgrade.label} +{upgrade.percent}%
        </p>
        <p className="text-[10px] text-white/40 mt-1">
          {usedUp ? "Maxed for this tier" : capped ? "Stat capped" : `${currentVal} → ${newVal} (${usesInTier}/${maxUses} used)`}
        </p>
      </div>
      <button
        onClick={() => onPurchase(upgrade)}
        disabled={disabled}
        className="flex items-center gap-1 bg-amber-500 disabled:bg-white/10 disabled:text-white/30 text-black text-xs font-bold px-3 py-2 rounded-full"
      >
        <Coins className="w-3.5 h-3.5" /> {cost}
      </button>
    </div>
  );
}