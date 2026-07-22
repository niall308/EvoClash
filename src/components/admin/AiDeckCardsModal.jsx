import React from "react";
import { X, Loader2 } from "lucide-react";
import GameCard from "@/components/cards/GameCard";

export default function AiDeckCardsModal({ difficulty, cards, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h2 className="text-white font-bold">{difficulty} Deck — {cards ? cards.length : "..."} cards</h2>
        <button onClick={onClose} className="text-white/60 hover:text-white p-2 -m-2">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {!cards ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-white/50" />
          </div>
        ) : (
          <div className="flex flex-wrap gap-3 justify-center">
            {cards.map((c) => (
              <GameCard key={c.id} card={c} size="sm" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}