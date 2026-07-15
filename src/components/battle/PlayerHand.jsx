import React from "react";
import GameCard from "@/components/cards/GameCard";

export default function PlayerHand({ hand, onSelect }) {
  if (!hand || hand.length === 0) return null;

  return (
    <div className="flex gap-1 justify-center items-end px-2 py-2 w-full">
      {hand.map((card) => (
        <button key={card.id} onClick={() => onSelect(card)} className="shrink-0 active:scale-95 transition-transform">
          <GameCard card={card} size="hand" />
        </button>
      ))}
    </div>
  );
}