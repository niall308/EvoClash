import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Coins, Loader2 } from "lucide-react";
import PowerUpRow from "@/components/powerups/PowerUpRow";
import { POWER_DEFINITIONS, MAX_ACTIVE_POWERUPS, DEFAULT_ACTIVE_POWERUPS } from "@/lib/gameConstants";
import { isPowerAvailable } from "@/lib/powerUps";

export default function PowerUps() {
  const [user, setUser] = useState(null);
  const [busyKey, setBusyKey] = useState(null);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      setUser(me);
    })();
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1B2A]">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  const active = user.activePowerUps?.length ? user.activePowerUps : DEFAULT_ACTIVE_POWERUPS;

  const toggleActive = async (key) => {
    if (busyKey) return;
    let next;
    if (active.includes(key)) {
      next = active.filter((k) => k !== key);
    } else {
      if (active.length >= MAX_ACTIVE_POWERUPS) return;
      next = [...active, key];
    }
    setBusyKey(key);
    const updated = await base44.auth.updateMe({ activePowerUps: next });
    setUser(updated);
    setBusyKey(null);
  };

  const handleReplenish = async (def) => {
    if (!user || (user.coins || 0) < def.replenishCost || busyKey) return;
    setBusyKey(def.key);
    const fields = { coins: (user.coins || 0) - def.replenishCost };
    if (def.cooldownType === "dailyMulti") {
      fields[def.usesField] = Math.max(0, (user[def.usesField] || 0) - 1);
    } else {
      fields[def.usedAtField] = null;
    }
    const updated = await base44.auth.updateMe(fields);
    setUser(updated);
    setBusyKey(null);
  };

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white px-6 py-8">
      <Link to="/play" className="inline-flex items-center gap-1 text-white/60 text-sm mb-8 py-2 px-1 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-black">Power Ups</h1>
        <span className="flex items-center gap-1 text-amber-400 font-bold text-sm">
          <Coins className="w-4 h-4" /> {(user.coins || 0).toLocaleString()}
        </span>
      </div>
      <p className="text-white/50 text-sm mb-4">
        Choose up to {MAX_ACTIVE_POWERUPS} power-ups to bring into battle ({active.length}/{MAX_ACTIVE_POWERUPS} selected).
      </p>

      <div className="flex gap-2 mb-6">
        {Array.from({ length: MAX_ACTIVE_POWERUPS }).map((_, i) => {
          const key = active[i];
          const def = POWER_DEFINITIONS.find((d) => d.key === key);
          return (
            <div key={i} className="flex-1 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-center px-1">
              {def ? def.label : "Empty"}
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        {[...POWER_DEFINITIONS].sort((a, b) => active.includes(b.key) - active.includes(a.key)).map((def) => (
          <PowerUpRow
            key={def.key}
            def={def}
            user={user}
            isActive={active.includes(def.key)}
            isReady={isPowerAvailable(user, def)}
            selectDisabled={!active.includes(def.key) && active.length >= MAX_ACTIVE_POWERUPS}
            busy={busyKey === def.key}
            onToggleActive={() => toggleActive(def.key)}
            onReplenish={() => handleReplenish(def)}
          />
        ))}
      </div>
    </div>
  );
}