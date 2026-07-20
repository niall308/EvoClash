import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Flame, Shuffle, Zap, Shield, Coins, Loader2 } from "lucide-react";
import { isPowerReady } from "@/components/battle/PowerButtons";
import { POWER_REPLENISH_COST } from "@/lib/gameConstants";

const POWERS = [
  { key: "burnPowerUsedAt", icon: Flame, label: "Burn", desc: "Destroys the opponent's card with no life lost.", color: "from-red-600 to-orange-500" },
  { key: "reshufflePowerUsedAt", icon: Shuffle, label: "Redraw", desc: "Redraw your hand or force the opponent to redraw.", color: "from-sky-500 to-cyan-500" },
  { key: "doubleAttackPowerUsedAt", icon: Zap, label: "2x Attack", desc: "Your next strike deals double damage.", color: "from-purple-600 to-fuchsia-500" },
  { key: "defensePowerUsedAt", icon: Shield, label: "3x Defense", desc: "Blocks the next hit with 3x defense.", color: "from-emerald-600 to-teal-500" },
];

export default function PowerUps() {
  const [user, setUser] = useState(null);
  const [replenishing, setReplenishing] = useState(null);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      setUser(me);
    })();
  }, []);

  const handleReplenish = async (key) => {
    if (!user || (user.coins || 0) < POWER_REPLENISH_COST || replenishing) return;
    setReplenishing(key);
    const updated = await base44.auth.updateMe({ [key]: null, coins: (user.coins || 0) - POWER_REPLENISH_COST });
    setUser(updated);
    setReplenishing(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1B2A]">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white px-6 py-8">
      <Link to="/play" className="inline-flex items-center gap-1 text-white/60 text-sm mb-8">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black">Power Ups</h1>
        <span className="flex items-center gap-1 text-amber-400 font-bold text-sm">
          <Coins className="w-4 h-4" /> {(user.coins || 0).toLocaleString()}
        </span>
      </div>
      <p className="text-white/50 text-sm mb-6">Each power can be used once every 24 hours. Already used it today? Replenish it instantly for {POWER_REPLENISH_COST.toLocaleString()} LC.</p>

      <div className="space-y-4">
        {POWERS.map((p) => {
          const ready = isPowerReady(user[p.key]);
          const Icon = p.icon;
          return (
            <div key={p.key} className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl">
              <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${p.color} shrink-0`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold">{p.label}</p>
                <p className="text-white/50 text-xs">{p.desc}</p>
              </div>
              {ready ? (
                <span className="text-emerald-400 text-xs font-bold">Available</span>
              ) : (
                <button
                  onClick={() => handleReplenish(p.key)}
                  disabled={(user.coins || 0) < POWER_REPLENISH_COST || replenishing === p.key}
                  className="flex items-center gap-1 bg-amber-500 disabled:opacity-40 text-[#0D1B2A] font-bold text-xs px-3 py-2 rounded-xl active:scale-95 transition-transform whitespace-nowrap"
                >
                  {replenishing === p.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `Replenish · ${POWER_REPLENISH_COST.toLocaleString()} LC`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}