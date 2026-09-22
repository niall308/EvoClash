import React from "react";
import { useNavigate } from "react-router-dom";
import { Coins, Trophy, RotateCcw, ArrowLeft, Gift, Egg } from "lucide-react";

export default function StoryMatchEnd({ win, coins, stageDone, allDone, bossName, bonusReward, onRetry }) {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6">
      <div className="bg-[#1A2E45] border border-white/10 rounded-2xl p-6 text-center max-w-xs w-full">
        {win ? (
          <>
            <div className="flex justify-center mb-3">
              <Trophy className="w-10 h-10 text-amber-300" />
            </div>
            <p className="text-2xl font-black mb-2">Victory!</p>
            {bossName && <p className="text-white/60 text-xs mb-4">You defeated {bossName}</p>}
            <div className="bg-white/5 rounded-xl p-4 mb-3 flex items-center justify-center gap-2">
              <Coins className="w-5 h-5 text-amber-300" />
              <span className="text-xl font-black text-amber-300">+{coins.toLocaleString()} LC</span>
            </div>
            {stageDone && !allDone && (
              <p className="text-emerald-400 text-xs font-bold mb-3">Stage Complete! +1,000 LC bonus included</p>
            )}
            {allDone && (
              <p className="text-amber-300 text-sm font-black mb-3">🏆 Story Complete! +50,000 LC final reward included!</p>
            )}
            {bonusReward && (
              <div className="mb-3">
                {bonusReward.type === "hybrid" ? (
                  <div className="bg-gradient-to-r from-fuchsia-600/40 to-amber-500/40 border border-amber-400/50 rounded-xl p-3 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-amber-300 shrink-0" />
                    <div className="text-left">
                      <p className="text-amber-200 text-xs font-black">Bonus Reward Unlocked!</p>
                      <p className="text-white/80 text-[11px]">Hybrid Card: {bonusReward.cardName}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-cyan-600/40 to-emerald-500/40 border border-cyan-400/50 rounded-xl p-3 flex items-center gap-2">
                    <Egg className="w-5 h-5 text-cyan-200 shrink-0" />
                    <div className="text-left">
                      <p className="text-cyan-100 text-xs font-black">Bonus Reward Unlocked!</p>
                      <p className="text-white/80 text-[11px]">A Creature Egg has been added to your egg store.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            <button onClick={() => navigate("/story")} className="w-full bg-amber-500 text-black font-bold py-3 rounded-full">
              Continue
            </button>
          </>
        ) : (
          <>
            <p className="text-2xl font-black mb-2">Defeated</p>
            {bossName ? (
              <p className="text-white/60 text-xs mb-4">{bossName} bested you — try again!</p>
            ) : (
              <p className="text-white/60 text-xs mb-4">The AI bested you — try again!</p>
            )}
            <button onClick={onRetry} className="w-full bg-amber-500 text-black font-bold py-3 rounded-full mb-2 flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" /> Retry Match
            </button>
            <button onClick={() => navigate("/story")} className="w-full bg-white/10 font-bold py-3 rounded-full flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Map
            </button>
          </>
        )}
      </div>
    </div>
  );
}