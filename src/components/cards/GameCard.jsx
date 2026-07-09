import React from "react";
import { Flame, Zap, Droplet, Snowflake, Mountain, Wind, Sprout, Sparkles, Trash2 } from "lucide-react";
import { TYPE_COLORS } from "@/lib/gameConstants";

const TYPE_ICONS = { Fire: Flame, Lava: Zap, Water: Droplet, Ice: Snowflake, Rock: Mountain, Wind: Wind, Earth: Sprout, Magic: Sparkles };

export default function GameCard({ card, size = "md", onDelete, glow }) {
  const Icon = TYPE_ICONS[card.type] || Sparkles;
  const color = TYPE_COLORS[card.type];
  const sizes = { sm: "w-20 h-28", md: "w-32 h-44", lg: "w-40 h-56" };

  return (
    <div
      className={`relative ${sizes[size]} rounded-2xl border-4 shadow-xl flex flex-col overflow-hidden transition-shadow ${glow ? "shadow-[0_0_25px_rgba(255,215,0,0.8)]" : ""}`}
      style={{ borderColor: color, background: "linear-gradient(160deg, #0D1B2A 0%, #1A2E45 100%)" }}
    >
      <div className="absolute top-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: color }}>
        T{card.tier}
      </div>
      {onDelete && (
        <button onClick={() => onDelete(card.id)} className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-red-400 hover:text-red-300">
          <Trash2 className="w-3 h-3" />
        </button>
      )}
      <div className="flex-1 flex items-center justify-center">
        <Icon className="w-8 h-8" style={{ color }} />
      </div>
      <div className="px-1.5 pb-1.5 text-center">
        <p className="text-white font-bold text-[11px] leading-tight truncate">{card.name}</p>
        <div className="flex justify-center gap-1 mt-1 text-[9px] font-semibold">
          <span className="text-orange-300">A{card.attack}</span>
          <span className="text-blue-300">D{card.defense}</span>
        </div>
        {(card.bonusDamage > 0 || card.bonusDefense > 0) && (
          <div className="flex justify-center gap-1 text-[8px] text-yellow-300">
            <span>+{card.bonusDamage}</span>
            <span>+{card.bonusDefense}</span>
          </div>
        )}
      </div>
    </div>
  );
}