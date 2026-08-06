import React, { useState, lazy, Suspense } from "react";
import { Gift } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { canClaimDailyReward, getEstDateString } from "@/lib/dailyRewardsClient";

// Lazy-load the slot-machine modal so framer-motion (SlotReel / CoinFlyAnimation)
// and canvas-confetti are only pulled in when a user actually opens a daily
// reward, keeping them out of the always-on initial bundle.
const SlotMachineModal = lazy(() => import("@/components/layout/SlotMachineModal"));

export default function DailyRewardsButton() {
  const { user, updateUser } = useAuth();
  const [open, setOpen] = useState(false);
  const eligible = canClaimDailyReward(user);

  return (
    <>
      <button
        onClick={() => eligible && setOpen(true)}
        disabled={!eligible}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-transform active:scale-95 ${
          eligible
            ? "bg-amber-400 text-[#0D1B2A] border-amber-400/50"
            : "bg-white/5 text-white/30 border-white/10 cursor-not-allowed"
        }`}
      >
        <Gift className="w-3.5 h-3.5" />
        Daily Rewards
      </button>

      {open && (
        <Suspense fallback={null}>
          <SlotMachineModal
            onClose={() => setOpen(false)}
            onClaimed={(newTotal) =>
              updateUser({ ...user, coins: newTotal, lastDailyRewardClaimedAt: getEstDateString() })
            }
          />
        </Suspense>
      )}
    </>
  );
}