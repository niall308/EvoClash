import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Coins, RotateCcw, BarChart3, Home } from "lucide-react";
import confetti from "canvas-confetti";
import CoinFlyAnimation from "@/components/profile/CoinFlyAnimation";
import { play } from "@/lib/soundEngine";

// Post-match reward modal tuned for fast re-engagement.
//
// Design goals:
//  - The "Play Again" CTA is present and clickable from the very first frame,
//    so a player never has to wait on confetti / coin-fly to queue another match.
//  - The reward breakdown and total still animate in, but on a much tighter
//    timeline (~0.4s total) so the loop feels snappy rather than sluggish.
//  - Confetti + coin-fly + SFX are unchanged and keep running in the background
//    (coin-fly is pointer-events-none, so it never blocks the CTA).
export default function MatchEndModal({ won, coinsBreakdown, onPlayAgain }) {
  const navigate = useNavigate();
  const total = coinsBreakdown?.total || 0;
  const [displayTotal, setDisplayTotal] = useState(0);
  const [showCoinFly, setShowCoinFly] = useState(false);

  // Win/lose SFX exactly once on mount, before the visuals kick in.
  const sfxPlayedRef = useRef(false);
  useEffect(() => {
    if (sfxPlayedRef.current) return;
    sfxPlayedRef.current = true;
    play(won ? "win" : "lose");
  }, []);

  useEffect(() => {
    if (!won) return;
    confetti({ particleCount: 140, spread: 100, startVelocity: 45, origin: { y: 0.4 }, colors: ["#FFD700", "#FFA500", "#FFEC8B", "#FFFFFF"] });
    const t = setTimeout(() => setShowCoinFly(true), 350);
    return () => clearTimeout(t);
  }, [won]);

  // Coin-collect SFX, synced with the coin-fly animation starting.
  useEffect(() => {
    if (!showCoinFly) return;
    play("reward_claim");
  }, [showCoinFly]);

  // Fast coin count-up (~0.5s) — short enough to feel snappy, long enough to read.
  useEffect(() => {
    if (!total) return;
    const steps = 20;
    const stepValue = total / steps;
    let count = 0;
    const interval = setInterval(() => {
      count += 1;
      setDisplayTotal(Math.min(total, Math.round(stepValue * count)));
      if (count >= steps) clearInterval(interval);
    }, 25);
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

  const handlePlayAgain = () => {
    // Stop the background coin-fly so it doesn't bleed into the next match.
    setShowCoinFly(false);
    if (onPlayAgain) onPlayAgain();
    else navigate("/play");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className="bg-gradient-to-b from-[#1A2E45] to-[#15283F] border border-amber-400/20 rounded-2xl p-6 text-center max-w-xs w-full shadow-[0_0_40px_-8px_rgba(255,200,0,0.35)]"
      >
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={`text-2xl font-black mb-3 ${won ? "text-amber-300" : "text-rose-300"}`}
        >
          {won ? "You Win!" : "You Have Been Defeated"}
        </motion.p>

        {coinsBreakdown && (
          <div className="bg-white/5 rounded-xl p-4 mb-4">
            <div className="flex flex-col gap-1.5 mb-3">
              {lines.map((line, i) => (
                <motion.div
                  key={line.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.07, duration: 0.18 }}
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
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15 + lines.length * 0.07, type: "spring", stiffness: 260, damping: 18 }}
                className="text-xl font-black text-amber-300 tabular-nums"
              >
                {displayTotal.toLocaleString()} LC
              </motion.span>
            </div>
          </div>
        )}

        {/* Primary CTA — available immediately so the player can re-queue without
            waiting on the confetti / coin-fly finishing in the background. */}
        <motion.button
          onClick={handlePlayAgain}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
          whileTap={{ scale: 0.96 }}
          className="group relative w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black py-3.5 rounded-full shadow-lg shadow-amber-500/30 active:scale-95 transition-transform"
        >
          {/* Pulsing ring to draw the eye to the replay action. */}
          <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-amber-300/70 animate-ping opacity-60 group-hover:opacity-0" />
          <RotateCcw className="w-5 h-5" />
          Play Again
        </motion.button>

        {/* Secondary actions kept compact so the primary stays the focal point. */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => navigate("/history")}
            className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 text-white/90 text-sm font-semibold py-2.5 rounded-full active:scale-95 transition-transform"
          >
            <BarChart3 className="w-4 h-4" />
            Stats
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 text-white/90 text-sm font-semibold py-2.5 rounded-full active:scale-95 transition-transform"
          >
            <Home className="w-4 h-4" />
            Menu
          </button>
        </div>
      </motion.div>

      {showCoinFly && (
        <CoinFlyAnimation
          origin={{ x: window.innerWidth / 2, y: window.innerHeight / 2 }}
          onDone={() => setShowCoinFly(false)}
        />
      )}
    </div>
  );
}