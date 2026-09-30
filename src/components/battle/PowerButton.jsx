import React from "react";
import { Lock, Swords, Shield, HeartPulse, Shuffle, ArrowUpCircle, Sparkles } from "lucide-react";
import { POWER_DEFINITIONS } from "@/lib/gameConstants";
import { dailyMultiRemaining, formatCooldownCompact } from "@/lib/powerUps";

const ICONS = { attack: Swords, defense: Shield, health: HeartPulse, control: Shuffle, upgrade: ArrowUpCircle, legendary: Sparkles };

const CATEGORY_COLORS = {
  attack: "from-red-600 to-orange-500",
  defense: "from-emerald-600 to-teal-500",
  health: "from-pink-600 to-rose-500",
  control: "from-sky-500 to-cyan-500",
  upgrade: "from-amber-600 to-yellow-500",
  legendary: "from-purple-600 to-fuchsia-500",
};

// A single power-up button with explicit readiness state, cooldown countdown
// badge, multi-use remaining counter, and clear disabled styling. Tapping a
// ready+usable button activates it; tapping any locked/cooldown button opens
// the inspect popover so the player learns *why* it's unavailable.
export default function PowerButton({ powerKey, user, status, onActivate, onInspect }) {
  const def = POWER_DEFINITIONS.find((d) => d.key === powerKey);
  if (!def) return null;
  const Icon = ICONS[def.category] || Sparkles;
  const isReady = status.state === "ready";
  const isLocked = !isReady;

  const showUses = def.cooldownType === "dailyMulti";
  const usesLeft = showUses ? dailyMultiRemaining(user, def.usesField, def.resetField, def.maxPerDay) : 0;

  // Recompute from the live `now` so the badge ticks without re-deriving status.
  const liveCountdown = status.countdownMs != null && status.countdownMs > 0 ? formatCooldownCompact(status.countdownMs) : null;

  return (
    <button
      type="button"
      onClick={isReady ? onActivate : onInspect}
      aria-label={`${def.label}${isLocked ? ` — ${status.text}` : ""}`}
      className={`relative flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-2xl shadow-lg transition-transform select-none ${
        isReady
          ? `bg-gradient-to-br ${CATEGORY_COLORS[def.category]} active:scale-95 ring-2 ring-white/50`
          : "bg-gradient-to-br from-slate-700 to-slate-800 opacity-60 grayscale ring-1 ring-white/10"
      }`}
    >
      <Icon className={`w-5 h-5 ${isReady ? "text-white" : "text-white/70"}`} />
      <span className="text-[7px] font-bold text-white leading-none text-center px-0.5 line-clamp-2">
        {def.label}
      </span>

      {/* Ready pulse dot — bottom-right, signals "good to go" */}
      {isReady && (
        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-black/40 animate-pulse" />
      )}

      {/* Multi-use remaining badge (always visible for dailyMulti so the player sees budget) */}
      {showUses && (
        <span
          className={`absolute -top-1 -right-1 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center ${
            usesLeft > 0 ? "bg-black/70" : "bg-red-600"
          }`}
        >
          {usesLeft}
        </span>
      )}

      {/* Cooldown countdown badge (daily/weekly) */}
      {!showUses && isLocked && liveCountdown && (
        <span className="absolute -top-1 -right-1 bg-black/80 text-white text-[7px] font-bold px-1 h-3.5 rounded-full flex items-center justify-center">
          {liveCountdown}
        </span>
      )}

      {/* Lock overlay for phase/turn/ownership/needs-card reasons (no countdown) */}
      {isLocked && !liveCountdown && !showUses && (
        <span className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/45">
          <Lock className="w-4 h-4 text-white/90" />
        </span>
      )}
    </button>
  );
}