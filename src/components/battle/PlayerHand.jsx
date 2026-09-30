import React, { useState, memo, useCallback } from "react";
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

// Memoized hand card. Hand card objects are stable references (they only change
// when the hand itself changes), so memoizing on `card` + the stable `onPeek`
// callback prevents all hand GameCards from re-rendering every time a preview
// opens or closes — the main source of jank when inspecting cards on low-end
// devices. reduceGlowAnimation drops the continuous maxed-T4 pulse here so the
// device isn't compositing several infinite opacity animations at once; the
// static glow is preserved so maxed cards still read as special.
const HandCard = memo(function HandCard({ card, onPeek }) {
  return (
    <button onClick={() => onPeek(card)} className="shrink-0 active:scale-95 transition-transform">
      <GameCard card={card} size="hand" reduceGlowAnimation />
    </button>
  );
});

// Memoized preview modal. Renders the polished full card plus the stat sheet,
// but only mounts while a card is being inspected. Memoized so unrelated parent
// re-renders don't re-run the (relatively heavy) GameCard + Image layout, and
// uses a static glow (no pulse) since the player is just reading stats, not
// battling. `contain: layout paint` isolates the modal's paint/layout work from
// the rest of the screen.
const PreviewModal = memo(function PreviewModal({ card, onClose, onPlay }) {
  const ua = cardUniqueAttack(card);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6" onClick={onClose}>
      <div
        className="bg-[#132338] rounded-2xl p-5 w-full max-w-xs max-h-[85vh] overflow-y-auto flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
        style={{ contain: "layout paint" }}
      >
        <button onClick={onClose} className="self-end -mt-2 -mr-2 text-white/50">
          <X className="w-5 h-5" />
        </button>
        <GameCard card={card} size="lg" reduceGlowAnimation />
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
            onPlay(card);
            onClose();
          }}
          className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-3 rounded-xl active:scale-95 transition-transform"
        >
          Play This Card
        </button>
      </div>
    </div>
  );
});

export default function PlayerHand({ hand, onSelect }) {
  const [previewCard, setPreviewCard] = useState(null);
  // Stable callbacks so the memoized children skip re-render when only the
  // preview target changes.
  const closePreview = useCallback(() => setPreviewCard(null), []);
  const peek = useCallback((card) => setPreviewCard(card), []);

  if (!hand || hand.length === 0) return null;

  return (
    <div className="flex gap-1 justify-center items-end px-2 py-2 w-full flex-wrap">
      {hand.map((card) => (
        <HandCard key={card.id} card={card} onPeek={peek} />
      ))}
      {previewCard && (
        <PreviewModal card={previewCard} onClose={closePreview} onPlay={onSelect} />
      )}
    </div>
  );
}