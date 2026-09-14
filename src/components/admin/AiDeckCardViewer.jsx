import React, { useState } from "react";
import { X, ChevronLeft, ChevronRight, Trash2, Plus, Loader2 } from "lucide-react";
import GameCard from "@/components/cards/GameCard";
import { base44 } from "@/api/base44Client";
import { DECK_COMPOSITIONS } from "@/lib/aiDeckGenerator";
import { generateRandomCard, generateHybridCard } from "@/lib/cardGenerator";

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Full-screen enlarged viewer for one AI deck card. Left/right arrows step
// through the whole deck, Remove deletes the shown card, and Add New Card
// generates + persists one fresh AiDeckCard following the deck composition.
export default function AiDeckCardViewer({ cards, startIndex, difficulty, creatures, onCardsChange, onClose }) {
  const [list, setList] = useState(cards);
  const [idx, setIdx] = useState(Math.min(startIndex, (cards?.length || 1) - 1));
  const [busy, setBusy] = useState(null);

  const clamp = (i) => (list.length ? Math.max(0, Math.min(i, list.length - 1)) : 0);
  const current = list[idx];

  const go = (delta) => setIdx((i) => clamp(i + delta));

  const remove = async () => {
    if (!current || busy) return;
    setBusy("remove");
    try {
      await base44.entities.AiDeckCard.delete(current.id);
      const next = list.filter((c) => c.id !== current.id);
      setList(next);
      onCardsChange?.(next);
      setIdx((i) => Math.min(i, next.length - 1));
    } finally {
      setBusy(null);
    }
  };

  const addOne = async () => {
    if (busy) return;
    setBusy("add");
    try {
      const comp = DECK_COMPOSITIONS[difficulty] || DECK_COMPOSITIONS.Easy;
      const slot = randomFrom(comp);
      let card;
      if (slot.hybrid) {
        const hybrids = (creatures || []).filter((c) => c.role === "hyper_rare");
        const hc = hybrids.length ? randomFrom(hybrids) : { baseName: "Chimera" };
        card = generateHybridCard(hc);
      } else {
        card = generateRandomCard(slot.tier, { creatures });
      }
      const { data } = await base44.functions.invoke("generateCardArt", {
        baseName: card.baseName,
        type: card.type,
        isHybrid: !!card.isHybrid,
      });
      const created = await base44.entities.AiDeckCard.create({ ...card, imageUrl: data.url, difficulty });
      const next = [...list, created];
      setList(next);
      onCardsChange?.(next);
      setIdx(next.length - 1);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex flex-col items-center justify-center p-4">
      <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white p-2" aria-label="Close">
        <X className="w-6 h-6" />
      </button>

      <p className="text-white/70 text-sm mb-3">{list.length ? `${idx + 1} / ${list.length}` : "Deck empty"}</p>

      <div className="flex items-center gap-4">
        <button onClick={() => go(-1)} disabled={!list.length || idx === 0} className="p-3 rounded-full bg-white/10 text-white disabled:opacity-30 active:scale-95 transition" aria-label="Previous card">
          <ChevronLeft className="w-7 h-7" />
        </button>
        {current ? <GameCard card={current} size="lg" /> : <div className="w-40 h-56 flex items-center justify-center text-white/40 text-sm">No cards</div>}
        <button onClick={() => go(1)} disabled={!list.length || idx === list.length - 1} className="p-3 rounded-full bg-white/10 text-white disabled:opacity-30 active:scale-95 transition" aria-label="Next card">
          <ChevronRight className="w-7 h-7" />
        </button>
      </div>

      <div className="flex gap-3 mt-5">
        <button onClick={remove} disabled={!current || busy === "remove"} className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 text-white font-bold disabled:opacity-50 active:scale-95 transition">
          {busy === "remove" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Remove
        </button>
        <button onClick={addOne} disabled={busy === "add"} className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 text-white font-bold disabled:opacity-50 active:scale-95 transition">
          {busy === "add" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add New Card
        </button>
      </div>
      {busy === "add" && <p className="text-white/50 text-xs mt-2 animate-pulse">Generating card art...</p>}
    </div>
  );
}