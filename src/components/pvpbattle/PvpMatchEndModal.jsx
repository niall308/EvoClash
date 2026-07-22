import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Coins, Loader2 } from "lucide-react";
import confetti from "canvas-confetti";
import CoinFlyAnimation from "@/components/profile/CoinFlyAnimation";

export default function PvpMatchEndModal({ matchStatus, won, coinsEarned }) {
  const navigate = useNavigate();
  const [displayTotal, setDisplayTotal] = useState(0);
  const [showCoinFly, setShowCoinFly] = useState(false);

  useEffect(() => {
    if (matchStatus !== "finished" || !won) return;
    confetti({ particleCount: 140, spread: 100, startVelocity: 45, origin: { y: 0.4 }, colors: ["#FFD700", "#FFA500", "#FFEC8B", "#FFFFFF"] });
    const t = setTimeout(() => setShowCoinFly(true), 350);
    return () => clearTimeout(t);
  }, [matchStatus, won]);

  useEffect(() => {
    if (matchStatus !== "finished" || !coinsEarned) return;
    const steps = 30;
    const stepValue = coinsEarned / steps;
    let count = 0;
    const interval = setInterval(() => {
      count += 1;
      setDisplayTotal(Math.min(coinsEarned, Math.round(stepValue * count)));
      if (count >= steps) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [matchStatus, coinsEarned]);

  if (matchStatus !== "finished") {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6">
        <div className="bg-[#1A2E45] border border-white/10 rounded-2xl p-6 text-center max-w-xs w-full flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-sm text-white/70">Finalizing match...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6">
      <div className="bg-[#1A2E45] border border-white/10 rounded-2xl p-6 text-center max-w-xs w-full">
        <p className="text-2xl font-black mb-4">{won ? "Victory!" : "Defeated"}</p>

        {coinsEarned > 0 && (
          <div className="bg-white/5 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2">
              <Coins className="w-5 h-5 text-amber-300" />
              <motion.span
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-xl font-black text-amber-300"
              >
                +{displayTotal.toLocaleString()} LC
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