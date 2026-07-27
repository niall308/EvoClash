import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Coins, Loader2 } from "lucide-react";
import PowerUpRow, { CATEGORY_COLORS } from "@/components/powerups/PowerUpRow";
import ReplacePowerUpModal from "@/components/powerups/ReplacePowerUpModal";
import { POWER_DEFINITIONS, POWER_CATEGORIES, MAX_ACTIVE_POWERUPS, DEFAULT_ACTIVE_POWERUPS } from "@/lib/gameConstants";
import { isPowerAvailable } from "@/lib/powerUps";

export default function PowerUps() {
  const [user, setUser] = useState(null);
  const [busyKey, setBusyKey] = useState(null);
  const [category, setCategory] = useState("all");
  const [pendingKey, setPendingKey] = useState(null);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      setUser(me);
    })();
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-24">
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
    } else if (active.length >= MAX_ACTIVE_POWERUPS) {
      setPendingKey(key);
      return;
    } else {
      next = [...active, key];
    }
    setBusyKey(key);
    const updated = await base44.auth.updateMe({ activePowerUps: next });
    setUser(updated);
    setBusyKey(null);
  };

  const handleReplace = async (replaceKey) => {
    if (!pendingKey || busyKey) return;
    const next = active.map((k) => (k === replaceKey ? pendingKey : k));
    setBusyKey(pendingKey);
    const updated = await base44.auth.updateMe({ activePowerUps: next });
    setUser(updated);
    setBusyKey(null);
    setPendingKey(null);
  };

  const handleReplenish = async (def) => {
    if (!user || (user.coins || 0) < def.replenishCost || busyKey) return;
    setBusyKey(def.key);
    const fields = { coins: (user.coins || 0) - def.replenishCost };
    if (def.cooldownType === "dailyMulti") {
      fields[def.usesField] = Math.max(0, (user[def.usesField] || 0) - 1);
    } else if (def.cooldownType === "premium") {
      fields[def.usedAtField] = true;
    } else {
      fields[def.usedAtField] = null;
    }
    const updated = await base44.auth.updateMe(fields);
    setUser(updated);
    setBusyKey(null);
  };

  return (
    <div className="text-white px-6 py-8">
      <Link to="/play" className="inline-flex items-center gap-1 text-white/60 text-sm mb-8 min-h-[44px] px-1 -ml-1">
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
            <div
              key={i}
              className={`flex-1 h-14 rounded-xl border border-white/10 flex items-center justify-center text-[10px] font-bold text-center px-1 ${
                def ? `bg-gradient-to-br ${CATEGORY_COLORS[def.category]} text-white` : "bg-white/5 text-white/80"
              }`}
            >
              {def ? def.label : "Empty"}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setCategory("all")}
          className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap ${
            category === "all" ? "bg-amber-400 text-[#0D1B2A]" : "bg-white/10 text-white/70"
          }`}
        >
          All
        </button>
        {POWER_CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap ${
              category === c.key ? "bg-amber-400 text-[#0D1B2A]" : "bg-white/10 text-white/70"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {POWER_DEFINITIONS.filter((def) => category === "all" || def.category === category)
          .sort((a, b) => active.includes(b.key) - active.includes(a.key))
          .map((def) => (
          <PowerUpRow
            key={def.key}
            def={def}
            user={user}
            isActive={active.includes(def.key)}
            isReady={isPowerAvailable(user, def)}
            busy={busyKey === def.key}
            onToggleActive={() => toggleActive(def.key)}
            onReplenish={() => handleReplenish(def)}
          />
        ))}
      </div>
      {POWER_DEFINITIONS.filter((def) => category === "all" || def.category === category).length === 0 && (
        <p className="text-center text-white/40 text-sm py-8">No power-ups in this category.</p>
      )}

      {pendingKey && (
        <ReplacePowerUpModal
          newDef={POWER_DEFINITIONS.find((d) => d.key === pendingKey)}
          activeDefs={active.map((k) => POWER_DEFINITIONS.find((d) => d.key === k)).filter(Boolean)}
          onReplace={handleReplace}
          onClose={() => setPendingKey(null)}
        />
      )}
    </div>
  );
}