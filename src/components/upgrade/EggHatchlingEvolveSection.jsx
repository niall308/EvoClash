import React from "react";
import { Sparkles, Loader2 } from "lucide-react";

// Special evolve section shown only for egg-hatchling baby cards (Tier 3,
// not yet upgraded). Evolves them into their unique Tier 4 upgraded form using
// the creature's configured upgraded image/name and the special stat spread.
export default function EggHatchlingEvolveSection({ cost, coins, evolving, onEvolve }) {
  const affordable = (coins || 0) >= cost;
  return (
    <div className="bg-gradient-to-r from-amber-500/20 to-yellow-400/20 border border-amber-400/30 rounded-xl p-4 mt-4">
      <p className="font-bold text-sm flex items-center gap-1 mb-1">
        <Sparkles className="w-4 h-4 text-amber-300" /> Evolve to Upgraded Form
      </p>
      <p className="text-[10px] text-white/50 mb-3">
        Egg hatchlings evolve into a special Tier 4 form with one stat between 10,000–12,500 and a unique upgraded look.
      </p>
      <button
        onClick={onEvolve}
        disabled={!affordable || evolving}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black disabled:from-white/10 disabled:to-white/10 disabled:text-white/30 py-2.5 rounded-full font-bold text-sm active:scale-95 transition-transform"
      >
        {evolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {evolving ? "Evolving..." : `Evolve — ${cost.toLocaleString()} LC`}
      </button>
    </div>
  );
}