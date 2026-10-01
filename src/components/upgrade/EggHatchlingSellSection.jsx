import React, { useState } from "react";
import { Coins, Loader2 } from "lucide-react";

// Shown on the Card Upgrade screen once an egg hatchling has been upgraded to
// its Tier 4 form. Sells the card (deletes it) for a flat 200,000 LC via the
// sellHatchling backend function, which re-validates ownership and upgrade
// state server-side. A two-tap confirm prevents an accidental sell of a
// one-of-a-kind upgraded card.
export default function EggHatchlingSellSection({ sellValue, onSell, busy }) {
  const [armed, setArmed] = useState(false);
  return (
    <div className="bg-gradient-to-r from-emerald-500/15 to-green-400/15 border border-emerald-400/30 rounded-xl p-4 mt-4">
      <p className="font-bold text-sm flex items-center gap-1 mb-1">
        <Coins className="w-4 h-4 text-emerald-300" /> Sell This Card
      </p>
      <p className="text-[10px] text-white/50 mb-3">
        Permanently sell this upgraded hatchling for {sellValue.toLocaleString()} LC. This can't be undone.
      </p>
      <button
        onClick={() => {
          if (busy) return;
          if (!armed) {
            setArmed(true);
            return;
          }
          onSell();
        }}
        disabled={busy}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-full font-bold text-sm active:scale-95 transition-transform disabled:opacity-60 ${
          armed
            ? "bg-red-600 text-white"
            : "bg-gradient-to-r from-emerald-500 to-green-400 text-black"
        }`}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
        {busy ? "Selling..." : armed ? "Tap again to confirm sell" : `Sell — ${sellValue.toLocaleString()} LC`}
      </button>
    </div>
  );
}