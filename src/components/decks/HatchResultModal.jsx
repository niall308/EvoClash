import React from "react";
import { Sparkles, Loader2, Coins, Plus } from "lucide-react";
import GameCard from "@/components/cards/GameCard";

const SELL_VALUE = 100000;

// Shown after an egg hatches. The player must choose to add the new card to a
// deck or sell it for a flat coin payout — there is no dismiss-X so the card is
// never left orphaned without a deck.
export default function HatchResultModal({ card, onAddToDeck, onSell, busy }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
      <div className="bg-[#0D1B2A] rounded-3xl border border-amber-500/30 p-5 w-full max-w-xs flex flex-col items-center gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 text-amber-300 font-black text-lg">
          <Sparkles className="w-5 h-5" /> Egg Hatched!
        </div>
        <GameCard card={card} size="lg" />
        <div className="text-center">
          <p className="font-bold text-white">{card.name}</p>
          <p className="text-white/50 text-xs">
            Tier {card.tier} · {card.isHybrid ? "Hybrid" : card.type}
          </p>
        </div>
        <div className="w-full space-y-2">
          <button
            onClick={onAddToDeck}
            disabled={busy}
            className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold py-3 rounded-full disabled:opacity-50 active:scale-95 transition-transform"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add to Deck
          </button>
          <button
            onClick={onSell}
            disabled={busy}
            className="w-full flex items-center justify-center gap-1.5 bg-white/10 text-amber-300 font-bold py-3 rounded-full disabled:opacity-50 active:scale-95 transition-transform"
          >
            <Coins className="w-4 h-4" /> Sell for {SELL_VALUE.toLocaleString()} LC
          </button>
        </div>
      </div>
    </div>
  );
}