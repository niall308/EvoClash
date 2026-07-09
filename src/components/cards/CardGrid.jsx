import React from "react";
import GameCard from "./GameCard";

export default function CardGrid({ cards, onDelete }) {
  if (!cards.length) {
    return <p className="text-center text-slate-400 py-12 px-6">No cards yet. Generate some to build your deck!</p>;
  }
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 p-4">
      {cards.map((card) => (
        <GameCard key={card.id} card={card} size="md" onDelete={onDelete} />
      ))}
    </div>
  );
}