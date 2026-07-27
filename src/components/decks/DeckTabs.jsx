import React from "react";
import { Trash2, Star } from "lucide-react";

export default function DeckTabs({ decks, activeDeckId, viewingDeckId, onView, onDelete }) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-3">
      {decks.map((deck) => (
        <div
          key={deck.id}
          onClick={() => onView(deck.id)}
          className={`flex items-center gap-2 shrink-0 px-3 py-2 rounded-full text-xs font-bold cursor-pointer border whitespace-nowrap ${
            deck.id === viewingDeckId ? "bg-amber-500 border-amber-500 text-black" : "bg-white/5 border-white/10 text-white/70"
          }`}
        >
          {deck.id === activeDeckId && <Star className="w-3 h-3 fill-current" />}
          {deck.name}
          {deck.id !== activeDeckId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(deck.id);
              }}
              className="text-white/40 hover:text-red-400"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}