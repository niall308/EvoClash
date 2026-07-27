import React from "react";
import { Check } from "lucide-react";
import GameCard from "./GameCard";

export default function CardGrid({ cards, onDelete, selectedId, onSelect, bulkMode, selectedIds = [] }) {
  if (!cards.length) {
    return <p className="text-center text-slate-400 py-12 px-6">No cards yet. Generate some to build your deck!</p>;
  }
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 p-4">
      {cards.map((card) => {
        const isSelected = !bulkMode && selectedId === card.id;
        const isBulkSelected = bulkMode && selectedIds.includes(card.id);
        return (
          <div
            key={card.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect?.(card)}
            className={`relative flex justify-center cursor-pointer rounded-2xl ${isBulkSelected ? "ring-2 ring-amber-400" : ""}`}
          >
            <GameCard
              card={card}
              size="md"
              onDelete={bulkMode ? undefined : onDelete}
              glow={!bulkMode && isSelected}
            />
            {isBulkSelected && (
              <div className="absolute top-1 right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-black" strokeWidth={3} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}