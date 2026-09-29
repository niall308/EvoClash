import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Brain } from "lucide-react";

// Brief, non-blocking banner that flashes on each turn handoff to make the
// player→opponent and opponent→player transitions feel smooth and deliberate.
// It auto-fades and never captures pointer events, so it can't stall gameplay.
export default function TurnTransitionBanner({ turn, phase }) {
  const show = phase === "battle" && (turn === "player" || turn === "ai");
  const isPlayer = turn === "player";
  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          key={turn}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 z-30 flex justify-center"
        >
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-black tracking-wide shadow-xl ring-1 ${
              isPlayer
                ? "bg-gradient-to-r from-emerald-500/95 to-teal-500/95 text-white ring-white/20"
                : "bg-gradient-to-r from-rose-600/95 to-red-500/95 text-white ring-white/20"
            }`}
          >
            {isPlayer ? <Swords className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
            {isPlayer ? "YOUR TURN" : "OPPONENT'S TURN"}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}