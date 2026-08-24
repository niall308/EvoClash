import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Coins } from "lucide-react";
import confetti from "canvas-confetti";
import CoinFlyAnimation from "@/components/profile/CoinFlyAnimation";

export default function MatchEndModal({ won, coinsBreakdown }) {
  const navigate = useNavigate();
  const total = coinsBreakdown?.total || 0;
  const [displayTotal, setDisplayTotal] = useState(0);
  const [showCoinFly, setShowCoinFly] = useState(false);

  useEffect(() => {
    if (!won) return;
    confetti({ particleCount: 140, spread: 100, startVelocity: 45, origin: { y: 0.4 }, colors: ["#FFD700", "#FFA500", "#FFEC8B", "#FFFFFF"] });
    const t = setTimeout(() => setShowCoinFly(true), 350);
    return () => clearTimeout(t);
  }, [won]);

  useEffect(() => {
    if (!total) return;
    const steps = 30;
    const stepValue = total / steps;
    let count = 0;
    const interval = setInterval(() => {
      count += 1;
      setDisplayTotal(Math.min(total, Math.round(stepValue * count)));
      if (count >= steps) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [total]);

  const lines = coinsBreakdown
    ? [
        { label: coinsBreakdown.isWin ? "Match Win" : "Match Loss", value: coinsBreakdown.base },
        coinsBreakdown.difficultyBonus > 0 && { label: `${coinsBreakdown.difficulty} Bonus`, value: coinsBreakdown.difficultyBonus },
        coinsBreakdown.cardsDefeated > 0 && { label: `${coinsBreakdown.cardsDefeated} Cards Defeated`, value: coinsBreakdown.cardsDefeatedCoins },
        coinsBreakdown.modeBonus > 0 && { label: "3v3 Mode Bonus", value: coinsBreakdown.modeBonus },
        coinsBreakdown.milestoneCoins > 0 && { label: "Milestone Bonus", value: coinsBreakdown.milestoneCoins },
      ].filter(Boolean)
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6">
      <div className="bg-[#1A2E45] border border-white/10 rounded-2xl p-6 text-center max-w-xs w-full">
        <p className="text-2xl font-black mb-4">{won ? "You Win" : "You Have Been Defeated"}</p>

        {coinsBreakdown && (
          <div className="bg-white/5 rounded-xl p-4 mb-6">
            <div className="flex flex-col gap-1.5 mb-3">
              {lines.map((line, i) => (
                <motion.div
                  key={line.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.25 }}
                  className="flex justify-between text-xs text-white/70"
                >
                  <span>{line.label}</span>
                  <span className="text-amber-300 font-semibold">+{line.value}</span>
                </motion.div>
              ))}
            </div>
            <div className="border-t border-white/10 pt-3 flex items-center justify-center gap-2">
              <Coins className="w-5 h-5 text-amber-300" />
              <motion.span
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 + lines.length * 0.25 }}
                className="text-xl font-black text-amber-300"
              >
                {displayTotal.toLocaleString()} LC
              </motion.span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button onClick={() => navigate("/history")} className="bg-amber-500 text-black font-bold py-3 rounded-full">
            View Game Stats
          </button>
          <button onClick={() => navigate("/")} className="bg-white/10 font-bold py-3 rounded-full">
            Return to Main Menu
          </button>
        </div>
      </div>
      {showCoinFly && (
        <CoinFlyAnimation
          origin={{ x: window.innerWidth / 2, y: window.innerHeight / 2 }}
          onDone={() => setShowCoinFly(false)}
        />
      )}
    </div>
  );
}