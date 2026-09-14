import React, { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import GameCard from "@/components/cards/GameCard";
import AiDeckCardViewer from "@/components/admin/AiDeckCardViewer";
import { base44 } from "@/api/base44Client";

export default function AiDeckCardsModal({ difficulty, cards, onClose, onCountChange }) {
  const [localCards, setLocalCards] = useState(cards || []);
  const [viewerIndex, setViewerIndex] = useState(null);
  const [creatures, setCreatures] = useState([]);

  useEffect(() => { setLocalCards(cards || []); }, [cards]);

  useEffect(() => {
    base44.entities.Creature.list().then(setCreatures).catch(() => {});
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h2 className="text-white font-bold">{difficulty} Deck — {localCards.length} cards</h2>
        <button onClick={onClose} className="text-white/60 hover:text-white p-2 -m-2" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {!cards ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-white/50" />
          </div>
        ) : (
          <div className="flex flex-wrap gap-3 justify-center">
            {localCards.map((c, i) => (
              <button key={c.id} onClick={() => setViewerIndex(i)} className="active:scale-95 transition" aria-label={`View ${c.name}`}>
                <GameCard card={c} size="sm" />
              </button>
            ))}
          </div>
        )}
      </div>

      {viewerIndex !== null && (
        <AiDeckCardViewer
          cards={localCards}
          startIndex={viewerIndex}
          difficulty={difficulty}
          creatures={creatures}
          onCardsChange={(next) => { setLocalCards(next); onCountChange?.(); }}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
}