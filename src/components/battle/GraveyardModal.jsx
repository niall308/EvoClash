import React from "react";
import { X } from "lucide-react";
import GameCard from "@/components/cards/GameCard";

export default function GraveyardModal({ cards, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-4" onClick={onClose}>
      <div
        className="bg-[#1A2E45] border border-white/10 rounded-2xl p-5 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-lg text-white">Discard Pile ({cards.length})</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {cards.map((card, i) => (
            <div key={i} className="shrink-0">
              <GameCard card={card} size="md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}