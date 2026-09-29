import React from "react";
import { Loader2, Swords } from "lucide-react";

// Mobile-friendly, non-blocking loading screen shown while the battle deck
// is being prepared. Gives the player immediate feedback and a clear status
// message instead of a silent spinner. The pulsing card placeholders hint
// that the deck is being summoned.
export default function BattleLoading({ status = "Preparing your deck…" }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0D1B2A] px-6 text-center">
      <div className="flex items-center gap-2 mb-6">
        <Swords className="w-5 h-5 text-amber-400" />
        <span className="text-sm font-bold tracking-wide text-white/80 uppercase">
          Preparing Battle
        </span>
      </div>

      {/* Pulsing card placeholders — hints the deck is loading */}
      <div className="flex gap-2 mb-8">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-12 h-16 rounded-lg bg-white/5 border border-white/10 animate-pulse"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 text-white/70">
        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
        <span className="text-sm font-medium">{status}</span>
      </div>
      <p className="mt-2 text-[11px] text-white/30">
        Summoning your active deck into the arena…
      </p>
    </div>
  );
}