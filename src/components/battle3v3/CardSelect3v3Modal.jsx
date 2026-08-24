import React from "react";
import GameCard from "@/components/cards/GameCard";
import { Check, Swords } from "lucide-react";

export default function CardSelect3v3Modal({ hand, selectedIds, onToggle, onConfirm }) {
  const ready = selectedIds.length === 3;
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 px-4" style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}>
      <h2 className="text-xl font-black mb-1">3v3 Battle</h2>
      <p className="text-white/60 text-sm mb-4">Select 3 cards to bring into battle ({selectedIds.length}/3)</p>
      <div className="flex gap-2 mb-6 overflow-x-auto max-w-full">
        {hand.map((c) => {
          const selected = selectedIds.includes(c.id);
          return (
            <button key={c.id} onClick={() => onToggle(c.id)} className="relative shrink-0">
              <div className={`rounded-2xl transition-all ${selected ? "ring-4 ring-amber-400" : "ring-2 ring-white/10"}`}>
                <GameCard card={c} size="xs" />
              </div>
              {selected && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <button
        onClick={onConfirm}
        disabled={!ready}
        className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-3 rounded-full font-bold shadow-lg active:scale-95 transition-transform disabled:opacity-40"
      >
        <Swords className="w-5 h-5" /> Deploy
      </button>
    </div>
  );
}