import React from "react";
import { X } from "lucide-react";
import GameCard from "./GameCard";

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
      <span className="text-white/50 text-xs">{label}</span>
      <span className="font-bold text-sm">{value}</span>
    </div>
  );
}

export default function CardStatsModal({ card, onClose }) {
  if (!card) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6" onClick={onClose}>
      <div
        className="bg-[#132338] rounded-2xl p-5 w-full max-w-xs flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="self-end -mt-2 -mr-2 text-white/50">
          <X className="w-5 h-5" />
        </button>
        <GameCard card={card} size="lg" />
        <div className="w-full space-y-2">
          <Row label="Name" value={card.name} />
          <Row label="Category" value={card.category} />
          <Row label="Type" value={card.isHybrid ? "Hybrid" : card.type} />
          <Row label="Tier" value={card.tier} />
          <Row label="Attack" value={card.attack} />
          <Row label="Defense" value={card.defense} />
          <Row label="Bonus Damage" value={card.bonusDamage || 0} />
          <Row label="Cards Destroyed" value={card.totalWins || 0} />
          <Row label="Games Played" value={card.totalGames || 0} />
          <Row label="Match Wins" value={card.matchWins || 0} />
        </div>
      </div>
    </div>
  );
}