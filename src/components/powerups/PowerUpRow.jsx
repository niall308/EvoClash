import React from "react";
import { Flame, Shuffle, Zap, Shield, Ban, Swords, ArrowUpCircle, Loader2 } from "lucide-react";
import { dailyMultiRemaining } from "@/lib/powerUps";

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

export default function PowerUpRow({ def, user, isActive, isReady, selectDisabled, busy, onToggleActive, onReplenish }) {
  const Icon = ICONS[def.key];
  const affordable = (user.coins || 0) >= def.replenishCost;

  let statusLabel = "Ready";
  if (!isReady) {
    if (def.cooldownType === "dailyMulti") {
      statusLabel = `${dailyMultiRemaining(user, def.usesField, def.resetField, def.maxPerDay)} left today`;
    } else if (def.cooldownType === "weekly") {
      statusLabel = "Used this week";
    } else {
      statusLabel = "Used today";
    }
  } else if (def.cooldownType === "dailyMulti") {
    statusLabel = `${dailyMultiRemaining(user, def.usesField, def.resetField, def.maxPerDay)} left today`;
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 p-4 rounded-2xl border ${isActive ? "border-amber-400 bg-white/10" : "border-white/5 bg-white/5"}`}>
      <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${COLORS[def.key]} shrink-0`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1 min-w-[140px]">
        <p className="font-bold">{def.label}</p>
        <p className="text-xs text-white/60 mt-0.5">{def.description}</p>
        <p className={`text-xs mt-1 ${isReady ? "text-emerald-400" : "text-white/50"}`}>{statusLabel}</p>
        <p className="text-[10px] text-white/40">{def.replenishTime}</p>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        {!isReady && (
          <button
            onClick={onReplenish}
            disabled={!affordable || busy}
            className="flex items-center gap-1 bg-amber-500 disabled:opacity-40 text-[#0D1B2A] font-bold text-xs px-3 py-2 rounded-xl active:scale-95 transition-transform whitespace-nowrap"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `+1 · ${def.replenishCost.toLocaleString()} LC`}
          </button>
        )}
        <button
          onClick={onToggleActive}
          disabled={selectDisabled || busy}
          className={`text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap active:scale-95 transition-transform disabled:opacity-30 ${
            isActive ? "bg-red-500/80 text-white" : "bg-white/10 text-white"
          }`}
        >
          {isActive ? "Remove" : "Select"}
        </button>
      </div>
    </div>
  );
}