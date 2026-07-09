import React from "react";
import { motion } from "framer-motion";
import { Layers } from "lucide-react";

export default function DeckStack({ remaining, onDraw, disabled }) {
  const stack = Array.from({ length: Math.min(remaining, 4) });

  return (
    <button onClick={onDraw} disabled={disabled || remaining === 0} className="flex flex-col items-center gap-1 disabled:opacity-40">
      <div className="relative w-10 h-14">
        {stack.map((_, i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-lg border-2 border-amber-400 bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center"
            style={{ top: -i * 3, left: -i * 1 }}
            whileTap={{ scale: 0.9 }}
          >
            {i === stack.length - 1 && <Layers className="w-4 h-4 text-amber-300" />}
          </motion.div>
        ))}
      </div>
      <span className="text-[9px] text-white/70 font-semibold">{remaining} left</span>
    </button>
  );
}