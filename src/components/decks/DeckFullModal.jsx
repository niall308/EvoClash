import React, { useEffect, useState } from "react";
import { X, Loader2, RefreshCw, PlusCircle, AlertTriangle } from "lucide-react";
import GameCard from "@/components/cards/GameCard";
import { base44 } from "@/api/base44Client";
import { DECK_COST, MAX_CARDS_PER_DECK, MAX_DECKS } from "@/lib/gameConstants";

// Shown when a player tries to add a new card (from the creature generator or an
// egg hatch) to a deck that already holds MAX_CARDS_PER_DECK cards. The player
// must either remove an existing card to make room (then the new card takes its
// slot) or buy a brand-new deck and add the card there. There is no silent
// dismiss-on-backdrop: the player must explicitly pick a path or cancel.
export default function DeckFullModal({ newCard, deckId, decksCount, canAffordDeck, onReplace, onBuyNewDeck, onClose, busy }) {
  const [deckCards, setDeckCards] = useState(null);
  const [step, setStep] = useState("choose"); // "choose" | "pick"
  const [pickId, setPickId] = useState(null);

  useEffect(() => {
    (async () => {
      const cards = await base44.entities.Card.filter({ deckId }, "-created_date", 1000);
      setDeckCards(cards);
    })();
  }, [deckId]);

  const maxDecksReached = (decksCount ?? 0) >= MAX_DECKS;

  const confirmReplace = () => {
    const c = (deckCards || []).find((x) => x.id === pickId);
    if (c) onReplace(c);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/85 flex items-end sm:items-center justify-center" onClick={busy ? undefined : onClose}>
      <div
        className="w-full max-w-md bg-[#0D1B2A] rounded-t-3xl sm:rounded-3xl border border-white/10 p-5 max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" /> Deck Full
          </h2>
          <button onClick={onClose} disabled={busy} aria-label="Close">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {step === "choose" ? (
          <>
            <p className="text-white/60 text-sm mb-4 text-center">
              This deck already has {MAX_CARDS_PER_DECK} cards. Remove one to make room, or buy a new deck for this card.
            </p>
            {newCard && (
              <div className="flex justify-center mb-4">
                <GameCard card={newCard} size="sm" reduceGlowAnimation />
              </div>
            )}
            <div className="space-y-2">
              <button
                onClick={() => setStep("pick")}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold py-3 rounded-full active:scale-95 transition-transform"
              >
                <RefreshCw className="w-4 h-4" /> Remove a card to make room
              </button>
              <button
                onClick={onBuyNewDeck}
                disabled={busy || !canAffordDeck || maxDecksReached}
                className="w-full flex items-center justify-center gap-2 bg-white/10 text-white font-bold py-3 rounded-full disabled:opacity-40 active:scale-95 transition-transform"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                {maxDecksReached ? `Max decks reached (${MAX_DECKS})` : `Buy a new deck — ${DECK_COST.toLocaleString()} LC`}
              </button>
              <button onClick={onClose} disabled={busy} className="w-full text-white/50 text-xs font-bold py-2">
                Cancel
              </button>
            </div>
            {!canAffordDeck && !maxDecksReached && (
              <p className="text-red-400 text-[11px] text-center mt-2">Not enough LC for a new deck</p>
            )}
          </>
        ) : (
          <>
            <p className="text-white/60 text-sm mb-3">Tap a card to remove it and add your new card.</p>
            {!deckCards ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-white/50" />
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto pb-2">
                {deckCards.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setPickId(c.id)}
                    className={`rounded-lg overflow-hidden ${pickId === c.id ? "ring-2 ring-amber-400" : "ring-1 ring-white/10"}`}
                  >
                    <GameCard card={c} size="xs" reduceGlowAnimation />
                  </button>
                ))}
              </div>
            )}
            {pickId && (
              <div className="sticky bottom-0 mt-3 pt-2 bg-[#0D1B2A] border-t border-white/10">
                <button
                  onClick={confirmReplace}
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-3 rounded-full active:scale-95 transition-transform"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Remove & add new card
                </button>
                <button onClick={() => setStep("choose")} disabled={busy} className="w-full text-white/50 text-xs font-bold py-2 mt-1">
                  Back
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}