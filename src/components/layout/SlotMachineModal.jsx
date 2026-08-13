import React, { useRef, useState } from "react";
import { Gift, Coins, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { play } from "@/lib/soundEngine";
import SlotReel from "@/components/layout/SlotReel";
import CoinFlyAnimation from "@/components/profile/CoinFlyAnimation";

const REEL_MAX_DIGITS = [1, 9, 9, 9]; // section 1: 0-1 (reward max 1500), sections 2-4: 0-9
const SPIN_DURATION_MS = 5000;
const REVEAL_DURATION_MS = 2000;

export default function SlotMachineModal({ onClose, onClaimed }) {
  const [phase, setPhase] = useState("idle"); // idle | spinning | revealed | done
  const [reward, setReward] = useState(null);
  const [error, setError] = useState("");
  const [spinKey, setSpinKey] = useState(0);
  const [flyOrigin, setFlyOrigin] = useState(null);
  const reelsRef = useRef(null);

  const targetDigits = String(reward ?? 0).padStart(4, "0").split("").map(Number);

  const handleSpin = async () => {
    setError("");
    try {
      const { data } = await base44.functions.invoke("claimDailyReward", {});
      if (data?.error) {
        setError(data.error);
        return;
      }
      setReward(data.reward);
      setSpinKey((k) => k + 1);
      setPhase("spinning");

      setTimeout(() => {
        // The slot machine is done and the coin reward is decided — play the
        // reward sound and update the coin badge right here, instead of 2s
        // later at "done", so the cue lines up with the reels landing.
        setPhase("revealed");
        play("reward_claim");
        window.dispatchEvent(new CustomEvent("coins-claimed", { detail: { newTotal: data.newTotal } }));
        setTimeout(() => {
          const rect = reelsRef.current?.getBoundingClientRect();
          setFlyOrigin({
            x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
            y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
            key: Date.now(),
          });
          onClaimed?.(data.newTotal);
          setPhase("done");
        }, REVEAL_DURATION_MS);
      }, SPIN_DURATION_MS);
    } catch (e) {
      setError(e?.response?.data?.error || "Something went wrong. Try again later.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6" onClick={phase === "idle" || phase === "done" ? onClose : undefined}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-gradient-to-b from-[#1A2E45] to-[#0D1B2A] border-2 border-amber-400/50 rounded-3xl p-6 relative"
      >
        {(phase === "idle" || phase === "done") && (
          <button onClick={onClose} className="absolute top-3 right-3 text-white/50">
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col items-center text-white">
          <Gift className="w-8 h-8 text-amber-400 mb-2" />
          <h2 className="text-xl font-black mb-1">Daily Rewards</h2>
          <p className="text-white/50 text-xs mb-6 text-center">Pull the lever for a free coin reward, once every day!</p>

          <div ref={reelsRef} className="flex gap-2 bg-black/40 rounded-2xl p-4 mb-6 border border-white/10">
            {REEL_MAX_DIGITS.map((maxDigit, i) => (
              <SlotReel
                key={i}
                maxDigit={maxDigit}
                targetDigit={targetDigits[i]}
                spinning={phase === "spinning"}
                spinKey={spinKey}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {phase === "revealed" || phase === "done" ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center w-full"
              >
                <p className="flex items-center justify-center gap-2 text-2xl font-black text-amber-300 mb-4">
                  <Coins className="w-6 h-6" /> +{reward.toLocaleString()} LC
                </p>
                {phase === "done" && (
                  <button
                    onClick={onClose}
                    className="w-full bg-amber-400 text-[#0D1B2A] font-bold py-3 rounded-full active:scale-95 transition-transform"
                  >
                    Awesome!
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div key="spin" className="w-full">
                {error && <p className="text-red-400 text-xs text-center mb-3">{error}</p>}
                <button
                  onClick={handleSpin}
                  disabled={phase === "spinning"}
                  className="w-full bg-amber-400 text-[#0D1B2A] font-bold py-3 rounded-full disabled:opacity-60 active:scale-95 transition-transform"
                >
                  {phase === "spinning" ? "Spinning..." : "Pull the Lever"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {flyOrigin && <CoinFlyAnimation key={flyOrigin.key} origin={flyOrigin} onDone={() => setFlyOrigin(null)} />}
    </div>
  );
}