import React from "react";
import GameCard from "./GameCard";

export default function CardGrid({ cards, onDelete, selectedId, onSelect, bulkMode, selectedIds = [] }) {
  if (!cards.length) {
    return <p className="text-center text-slate-400 py-12 px-6">No cards yet. Generate some to build your deck!</p>;
  }
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 p-4">
      {cards.map((card) => (
        <div
          key={card.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect?.(card)}
          className="flex justify-center cursor-pointer"
        >
          <GameCard
            card={card}
            size="md"
            onDelete={bulkMode ? undefined : onDelete}
            glow={bulkMode ? selectedIds.includes(card.id) : selectedId === card.id}
          />
        </div>
      ))}
    </div>
  );
}