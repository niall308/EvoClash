import React from "react";
import { Flame, Zap, Droplet, Snowflake, Mountain, Wind, Sprout, Sparkles, HelpCircle } from "lucide-react";
import { TYPES, TYPE_COLORS } from "@/lib/gameConstants";

const TYPE_ICONS = { Fire: Flame, Lava: Zap, Water: Droplet, Ice: Snowflake, Rock: Mountain, Wind: Wind, Earth: Sprout, Magic: Sparkles };

export default function TypeChoiceModal({ onChoose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1A2E45] rounded-2xl p-5 max-w-xs w-full text-center border-2" style={{ borderColor: "#FFD700" }}>
        <HelpCircle className="w-8 h-8 mx-auto mb-2" style={{ color: "#FFD700" }} />
        <h2 className="font-black text-lg mb-1 text-white">Hyper Rare Card!</h2>
        <p className="text-white/60 text-xs mb-4">Choose an elemental type for this card. This choice is locked for the rest of the match.</p>
        <div className="grid grid-cols-4 gap-2">
          {TYPES.map((t) => {
            const Icon = TYPE_ICONS[t];
            return (
              <button
                key={t}
                onClick={() => onChoose(t)}
                className="flex flex-col items-center gap-1 bg-white/5 hover:bg-white/15 rounded-xl py-3 active:scale-95 transition-transform"
              >
                <Icon className="w-5 h-5" style={{ color: TYPE_COLORS[t] }} />
                <span className="text-[9px] font-bold text-white">{t}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}