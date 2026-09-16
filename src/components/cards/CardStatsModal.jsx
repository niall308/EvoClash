import React from "react";
import { X, Swords } from "lucide-react";
import GameCard from "./GameCard";
import { cardUniqueAttack, UNIQUE_ATTACK_I18N } from "@/lib/uniqueAttacks";

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
  const ua = cardUniqueAttack(card);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6" onClick={onClose}>
      <div
        className="bg-[#132338] rounded-2xl p-5 w-full max-w-xs max-h-[85vh] overflow-y-auto flex flex-col items-center gap-4"
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
              ) : (
                <div className="text-white/60 text-xs">{ua.effect || ua.effectType}</div>
              )}
            </div>
          )}
          <Row label="Cards Destroyed" value={card.totalWins || 0} />
          <Row label="Games Played" value={card.totalGames || 0} />
          <Row label="Match Wins" value={card.matchWins || 0} />
        </div>
      </div>
    </div>
  );
}