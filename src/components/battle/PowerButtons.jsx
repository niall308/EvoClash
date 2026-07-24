import React from "react";
import { Swords, Shield, HeartPulse, Shuffle, ArrowUpCircle, Sparkles } from "lucide-react";
import { POWER_DEFINITIONS } from "@/lib/gameConstants";
import { isPowerAvailable, dailyMultiRemaining } from "@/lib/powerUps";

const CATEGORY_ICONS = {
  attack: Swords,
  defense: Shield,
  health: HeartPulse,
  control: Shuffle,
  upgrade: ArrowUpCircle,
  legendary: Sparkles,
};

const CATEGORY_COLORS = {
  attack: "from-red-600 to-orange-500",
  defense: "from-emerald-600 to-teal-500",
  health: "from-pink-600 to-rose-500",
  control: "from-sky-500 to-cyan-500",
  upgrade: "from-amber-600 to-yellow-500",
  legendary: "from-purple-600 to-fuchsia-500",
};

export default function PowerButtons({ user, activeKeys, canUseMap, handlers }) {
  return (
    <div className="flex flex-col gap-3 z-20">
      {activeKeys.map((key) => {
        const def = POWER_DEFINITIONS.find((d) => d.key === key);
        if (!def || !handlers[key]) return null;
        const ready = isPowerAvailable(user, def);
        const disabled = !ready || !canUseMap[key];
        const Icon = CATEGORY_ICONS[def.category] || Sparkles;
        return (
          <button
            key={key}
            onClick={handlers[key]}
            disabled={disabled}
            title={def.label}
            className={`relative flex flex-col items-center justify-center gap-0.5 bg-gradient-to-br ${CATEGORY_COLORS[def.category]} w-14 h-14 rounded-2xl shadow-lg active:scale-95 transition-transform disabled:opacity-30 disabled:grayscale`}
          >
            <Icon className="w-5 h-5 text-white" />
            <span className="text-[7px] font-bold text-white leading-none text-center px-0.5">{def.label}</span>
            {def.cooldownType === "dailyMulti" && (
              <span className="absolute -top-1 -right-1 bg-black/70 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {dailyMultiRemaining(user, def.usesField, def.resetField, def.maxPerDay)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}