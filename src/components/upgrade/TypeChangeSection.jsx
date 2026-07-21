import React, { useState } from "react";
import { Coins, Repeat, Loader2 } from "lucide-react";
import { Flame, Zap, Droplet, Snowflake, Mountain, Wind, Sprout, Sparkles } from "lucide-react";
import { TYPES, TYPE_COLORS, TYPE_CHANGE_COST } from "@/lib/gameConstants";

const TYPE_ICONS = { Fire: Flame, Lava: Zap, Water: Droplet, Ice: Snowflake, Rock: Mountain, Wind: Wind, Earth: Sprout, Magic: Sparkles };

export default function TypeChangeSection({ card, coins, purchasing, onChangeType }) {
  const [picking, setPicking] = useState(false);
  const used = card.typeChanged;
  const affordable = coins >= TYPE_CHANGE_COST;
  const disabled = used || !affordable || purchasing;

  return (
    <div className="bg-white/5 rounded-xl p-4 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm flex items-center gap-1">
            <Repeat className="w-3.5 h-3.5 text-amber-400" /> Change Element Type
          </p>
          <p className="text-[10px] text-white/40 mt-1">
            {used ? "Already used on this card" : "One-time change, permanent"}
          </p>
        </div>
        <button
          onClick={() => setPicking((p) => !p)}
          disabled={disabled}
          className="flex items-center gap-1 bg-amber-500 disabled:bg-white/10 disabled:text-white/30 text-black text-xs font-bold px-3 py-2 rounded-full"
        >
          <Coins className="w-3.5 h-3.5" /> {TYPE_CHANGE_COST.toLocaleString()}
        </button>
      </div>
      {picking && !used && (
        <div className="grid grid-cols-4 gap-2 mt-3">
          {TYPES.map((t) => {
            const Icon = TYPE_ICONS[t];
            const isCurrent = t === card.type;
            return (
              <button
                key={t}
                onClick={() => {
                  if (isCurrent || purchasing) return;
                  setPicking(false);
                  onChangeType(t);
                }}
                disabled={isCurrent || purchasing}
                className="flex flex-col items-center gap-1 bg-white/5 hover:bg-white/15 disabled:opacity-30 rounded-xl py-3 active:scale-95 transition-transform"
              >
                {purchasing === t ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" style={{ color: TYPE_COLORS[t] }} />}
                <span className="text-[9px] font-bold text-white">{t}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}