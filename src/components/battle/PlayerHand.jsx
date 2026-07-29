import React, { useState } from "react";
import { X } from "lucide-react";
import GameCard from "@/components/cards/GameCard";

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
      <span className="text-white/50 text-xs">{label}</span>
      <span className="font-bold text-sm">{value}</span>
    </div>
  );
}

export default function PlayerHand({ hand, onSelect }) {
  const [previewCard, setPreviewCard] = useState(null);

  if (!hand || hand.length === 0) return null;

  return (
    <div className="flex gap-1 justify-center items-end px-2 py-2 w-full flex-wrap">
      {hand.map((card) => (
        <button key={card.id} onClick={() => setPreviewCard(card)} className="shrink-0 active:scale-95 transition-transform">
          <GameCard card={card} size="hand" />
        </button>
      ))}

      {previewCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6" onClick={() => setPreviewCard(null)}>
          <div
            className="bg-[#132338] rounded-2xl p-5 w-full max-w-xs max-h-[85vh] overflow-y-auto flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setPreviewCard(null)} className="self-end -mt-2 -mr-2 text-white/50">
              <X className="w-5 h-5" />
            </button>
            <GameCard card={previewCard} size="lg" />
            <div className="w-full space-y-2">
              <Row label="Name" value={previewCard.name} />
              <Row label="Category" value={previewCard.category} />
              <Row label="Type" value={previewCard.isHybrid ? "Hybrid" : previewCard.type} />
              <Row label="Tier" value={previewCard.tier} />
              <Row label="Attack" value={previewCard.attack} />
              <Row label="Defense" value={previewCard.defense} />
              <Row label="Bonus Damage" value={previewCard.bonusDamage || 0} />
            </div>
            <button
              onClick={() => {
                onSelect(previewCard);
                setPreviewCard(null);
              }}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-3 rounded-xl active:scale-95 transition-transform"
            >
              Play This Card
            </button>
          </div>
        </div>
      )}
    </div>
  );
}