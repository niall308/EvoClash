import React, { useState } from "react";
import { Gift, Coins, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

const REEL_ICONS = ["🍒", "🍋", "⭐", "💎", "🍀", "🔔"];

export default function SlotMachineModal({ onClose, onClaimed }) {
  const [spinning, setSpinning] = useState(false);
  const [reward, setReward] = useState(null);
  const [error, setError] = useState("");

  const handleSpin = async () => {
    setError("");
    setSpinning(true);
    try {
      const { data } = await base44.functions.invoke("claimDailyReward", {});
      if (data?.error) {
        setError(data.error);
        setSpinning(false);
        return;
      }
      // let the reels spin for a bit before revealing the real result
      setTimeout(() => {
        setSpinning(false);
        setReward(data.reward);
        window.dispatchEvent(new CustomEvent("coins-claimed", { detail: { newTotal: data.newTotal } }));
        onClaimed?.(data.newTotal);
      }, 1600);
    } catch (e) {
      setSpinning(false);
      setError(e?.response?.data?.error || "Something went wrong. Try again later.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-gradient-to-b from-[#1A2E45] to-[#0D1B2A] border-2 border-amber-400/50 rounded-3xl p-6 relative"
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-white/50">
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-white">
          <Gift className="w-8 h-8 text-amber-400 mb-2" />
          <h2 className="text-xl font-black mb-1">Daily Rewards</h2>
          <p className="text-white/50 text-xs mb-6 text-center">Pull the lever for a free coin reward, once every day!</p>

          <div className="flex gap-2 bg-black/40 rounded-2xl p-4 mb-6 border border-white/10">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center text-3xl overflow-hidden">
                <motion.span
                  key={spinning ? `spin-${i}` : reward ? `result-${i}` : `idle-${i}`}
                  animate={spinning ? { y: [0, -400, 0] } : {}}
                  transition={spinning ? { duration: 0.5, repeat: 3, ease: "linear" } : {}}
                >
                  {reward ? "💰" : REEL_ICONS[i % REEL_ICONS.length]}
                </motion.span>
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {reward ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center w-full"
              >
                <p className="flex items-center justify-center gap-2 text-2xl font-black text-amber-300 mb-4">
                  <Coins className="w-6 h-6" /> +{reward.toLocaleString()} LC
                </p>
                <button
                  onClick={onClose}
                  className="w-full bg-amber-400 text-[#0D1B2A] font-bold py-3 rounded-full active:scale-95 transition-transform"
                >
                  Awesome!
                </button>
              </motion.div>
            ) : (
              <motion.div key="spin" className="w-full">
                {error && <p className="text-red-400 text-xs text-center mb-3">{error}</p>}
                <button
                  onClick={handleSpin}
                  disabled={spinning}
                  className="w-full bg-amber-400 text-[#0D1B2A] font-bold py-3 rounded-full disabled:opacity-60 active:scale-95 transition-transform"
                >
                  {spinning ? "Spinning..." : "Pull the Lever"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}