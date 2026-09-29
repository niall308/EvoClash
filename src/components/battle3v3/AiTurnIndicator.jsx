import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain } from "lucide-react";

// Lightweight, mobile-friendly indicator shown while the AI is taking its
// turn. Gives the player an obvious, "alive" cue that the match is progressing
// during the pre-attack delay and the attack-resolution downtime — no logic or
// timing changes, purely a visual layer over the existing AI turn driver.
export default function AiTurnIndicator({ visible, opponentName = "AI" }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="ai-turn-indicator"
          initial={{ opacity: 0, y: -6, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.92 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="flex flex-col items-center gap-1.5 select-none"
        >
          <div className="relative flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-600/90 to-red-500/90 px-4 py-1.5 shadow-lg shadow-rose-900/40 ring-1 ring-white/20">
            {/* soft pulsing halo behind the pill */}
            <motion.span
              className="absolute inset-0 rounded-full bg-rose-500/40"
              animate={{ opacity: [0.5, 0.1, 0.5], scale: [1, 1.18, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.span
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <Brain className="w-4 h-4 text-white" />
            </motion.span>
            <span className="relative text-white text-xs font-bold tracking-wide whitespace-nowrap">
              {opponentName} is thinking
            </span>
            <ThinkingDots />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Three bouncing dots — staggered so the row always has motion on screen.
function ThinkingDots() {
  return (
    <span className="relative flex items-center gap-0.5 ml-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1 h-1 rounded-full bg-white"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.15,
          }}
        />
      ))}
    </span>
  );
}