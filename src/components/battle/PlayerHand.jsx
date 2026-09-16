import React, { useState } from "react";
import { X, Swords } from "lucide-react";
import GameCard from "@/components/cards/GameCard";
import { cardUniqueAttack, UNIQUE_ATTACK_I18N } from "@/lib/uniqueAttacks";

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

  const ua = previewCard ? cardUniqueAttack(previewCard) : null;

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
              {ua && (
                <div className="w-full bg-purple-900/30 border border-purple-500/40 rounded-lg px-3 py-2 space-y-1">
                  <div className="flex items-center gap-1 text-purple-200 text-xs font-bold">
                    <Swords className="w-3 h-3" /> Unique Attack: {ua.name}
                  </div>
                  <div className="text-white/70 text-xs">
                    {ua.percent}% • {ua.target === "all" ? UNIQUE_ATTACK_I18N.allTargets : UNIQUE_ATTACK_I18N.singleTarget}
                  </div>
                  {ua.effectType === "none" ? (
                    <div className="text-white/40 text-xs">{UNIQUE_ATTACK_I18N.noEffect}</div>
                  ) : ua.effectType === "custom" ? (
                    <div className="text-amber-400 text-xs">{UNIQUE_ATTACK_I18N.customEffect}</div>
                  ) : (
                    <div className="text-white/60 text-xs">{ua.effect}</div>
                  )}
                </div>
              )}
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