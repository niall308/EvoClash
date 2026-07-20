import React from "react";
import { Flame, Shuffle, Zap, Shield } from "lucide-react";

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function isPowerReady(timestamp) {
  if (!timestamp) return true;
  return Date.now() - new Date(timestamp).getTime() >= COOLDOWN_MS;
}

export default function PowerButtons({
  cooldowns,
  canBurn,
  canReshuffle,
  canDoubleAttack,
  canTripleDefense,
  onBurn,
  onReshuffle,
  onDoubleAttack,
  onTripleDefense,
}) {
  const powers = [
    { key: "burnPowerUsedAt", icon: Flame, label: "Burn", onClick: onBurn, enabled: canBurn, color: "from-red-600 to-orange-500" },
    { key: "reshufflePowerUsedAt", icon: Shuffle, label: "Redraw", onClick: onReshuffle, enabled: canReshuffle, color: "from-sky-500 to-cyan-500" },
    { key: "doubleAttackPowerUsedAt", icon: Zap, label: "2x Atk", onClick: onDoubleAttack, enabled: canDoubleAttack, color: "from-purple-600 to-fuchsia-500" },
    { key: "defensePowerUsedAt", icon: Shield, label: "3x Def", onClick: onTripleDefense, enabled: canTripleDefense, color: "from-emerald-600 to-teal-500" },
  ];

  return (
    <div className="flex flex-col gap-3 z-20">
      {powers.map((p) => {
        const ready = isPowerReady(cooldowns[p.key]);
        const disabled = !ready || !p.enabled;
        const Icon = p.icon;
        return (
          <button
            key={p.key}
            onClick={p.onClick}
            disabled={disabled}
            className={`flex flex-col items-center justify-center gap-0.5 bg-gradient-to-br ${p.color} w-14 h-14 rounded-2xl shadow-lg active:scale-95 transition-transform disabled:opacity-30 disabled:grayscale`}
          >
            <Icon className="w-5 h-5 text-white" />
            <span className="text-[8px] font-bold text-white">{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}