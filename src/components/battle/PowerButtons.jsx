import React from "react";
import { Flame, Shuffle, Zap, Shield, Ban, Swords, ArrowUpCircle } from "lucide-react";
import { POWER_DEFINITIONS } from "@/lib/gameConstants";
import { isPowerAvailable, dailyMultiRemaining } from "@/lib/powerUps";

const ICONS = {
  burn: Flame,
  reshuffle: Shuffle,
  doubleAttack: Zap,
  defense: Shield,
  block: Ban,
  halfAttack: Swords,
  t2Upgrade: ArrowUpCircle,
  t3Upgrade: ArrowUpCircle,
  t4Upgrade: ArrowUpCircle,
};

const COLORS = {
  burn: "from-red-600 to-orange-500",
  reshuffle: "from-sky-500 to-cyan-500",
  doubleAttack: "from-purple-600 to-fuchsia-500",
  defense: "from-emerald-600 to-teal-500",
  block: "from-slate-600 to-slate-400",
  halfAttack: "from-indigo-600 to-blue-500",
  t2Upgrade: "from-lime-600 to-green-500",
  t3Upgrade: "from-amber-600 to-yellow-500",
  t4Upgrade: "from-rose-600 to-pink-500",
};

export default function PowerButtons({ user, activeKeys, canUseMap, handlers }) {
  return (
    <div className="flex flex-col gap-3 z-20">
      {activeKeys.map((key) => {
        const def = POWER_DEFINITIONS.find((d) => d.key === key);
        if (!def) return null;
        const ready = isPowerAvailable(user, def);
        const disabled = !ready || !canUseMap[key];
        const Icon = ICONS[key];
        return (
          <button
            key={key}
            onClick={handlers[key]}
            disabled={disabled}
            className={`relative flex flex-col items-center justify-center gap-0.5 bg-gradient-to-br ${COLORS[key]} w-14 h-14 rounded-2xl shadow-lg active:scale-95 transition-transform disabled:opacity-30 disabled:grayscale`}
          >
            <Icon className="w-5 h-5 text-white" />
            <span className="text-[8px] font-bold text-white">{def.label}</span>
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