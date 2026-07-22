import React from "react";
import GameCard from "./GameCard";
import { ArrowUpCircle } from "lucide-react";

export default function CardGrid({ cards, onDelete, selectedId, onSelect, bulkMode, selectedIds = [], onUpgrade }) {
  if (!cards.length) {
    return <p className="text-center text-slate-400 py-12 px-6">No cards yet. Generate some to build your deck!</p>;
  }
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 p-4">
      {cards.map((card) => {
        const isSelected = !bulkMode && selectedId === card.id;
        return (
          <div
            key={card.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect?.(card)}
            className="relative flex justify-center cursor-pointer"
          >
            <GameCard
              card={card}
              size="md"
              onDelete={bulkMode ? undefined : onDelete}
              glow={bulkMode ? selectedIds.includes(card.id) : isSelected}
            />
            {isSelected && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpgrade?.(card.id);
                }}
                className="absolute inset-0 m-auto w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_20px_rgba(251,191,36,0.7)] active:scale-90 transition-transform"
              >
                <ArrowUpCircle className="w-8 h-8 text-white" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}