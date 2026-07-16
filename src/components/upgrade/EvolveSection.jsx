import React from "react";
import { Sparkles, Loader2 } from "lucide-react";

export default function EvolveSection({ canEvolve, cost, coins, evolving, onEvolve, tier }) {
  const affordable = coins >= cost;
  return (
    <div className="bg-gradient-to-r from-purple-600/20 to-fuchsia-500/20 border border-purple-400/30 rounded-xl p-4 mt-4">
      <p className="font-bold text-sm flex items-center gap-1 mb-1">
        <Sparkles className="w-4 h-4 text-purple-300" /> Evolve to Tier {tier + 1}
      </p>
      <p className="text-[10px] text-white/50 mb-3">
        {canEvolve
          ? "All upgrade progress complete — evolve for a new look and stronger stats."
          : "Complete this card's upgrade progress on your Profile screen to unlock evolution."}
      </p>
      <button
        onClick={onEvolve}
        disabled={!canEvolve || !affordable || evolving}
        className="w-full flex items-center justify-center gap-2 bg-purple-600 disabled:bg-white/10 disabled:text-white/30 py-2.5 rounded-full font-bold text-sm"
      >
        {evolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {evolving ? "Evolving..." : `Evolve — ${cost} LC`}
      </button>
    </div>
  );
}