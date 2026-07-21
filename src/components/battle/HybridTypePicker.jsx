import React from "react";
import { motion } from "framer-motion";
import { Flame, Zap, Droplet, Snowflake, Mountain, Wind, Sprout, Sparkles } from "lucide-react";
import { TYPES, TYPE_COLORS } from "@/lib/gameConstants";

const TYPE_ICONS = { Fire: Flame, Lava: Zap, Water: Droplet, Ice: Snowflake, Rock: Mountain, Wind: Wind, Earth: Sprout, Magic: Sparkles };

export default function HybridTypePicker({ onPick }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#0D1B2A] border-2 border-yellow-400 rounded-2xl p-5 max-w-sm w-full text-center"
      >
        <h3 className="text-lg font-black text-yellow-300 mb-1">Hyper Rare Card!</h3>
        <p className="text-white/60 text-xs mb-4">Choose the element this card will fight as — this choice can only be made once per match.</p>
        <div className="grid grid-cols-4 gap-2">
          {TYPES.map((t) => {
            const Icon = TYPE_ICONS[t];
            return (
              <button
                key={t}
                onClick={() => onPick(t)}
                className="flex flex-col items-center gap-1 bg-white/5 hover:bg-white/10 rounded-xl py-3 active:scale-95 transition-transform"
              >
                <Icon className="w-5 h-5" style={{ color: TYPE_COLORS[t] }} />
                <span className="text-[10px] font-semibold">{t}</span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}