import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { buildDeckCards, DECK_COMPOSITIONS } from "@/lib/aiDeckGenerator";
import { buildCardImagePrompt } from "@/lib/cardImagePrompt";
import AiDeckCardsModal from "@/components/admin/AiDeckCardsModal";

const DIFFICULTIES = Object.keys(DECK_COMPOSITIONS);

export default function AdminAiDecks() {
  const [counts, setCounts] = useState({});
  const [generating, setGenerating] = useState(null);
  const [progress, setProgress] = useState(0);
  const [viewingDifficulty, setViewingDifficulty] = useState(null);
  const [viewingCards, setViewingCards] = useState(null);

  const openViewCards = async (difficulty) => {
    setViewingDifficulty(difficulty);
    setViewingCards(null);
    const cards = await base44.entities.AiDeckCard.filter({ difficulty });
    setViewingCards(cards);
  };

  useEffect(() => {
    (async () => {
      const all = await Promise.all(DIFFICULTIES.map((d) => base44.entities.AiDeckCard.filter({ difficulty: d })));
      const next = {};
      DIFFICULTIES.forEach((d, i) => (next[d] = all[i].length));
      setCounts(next);
    })();
  }, []);

  const generateDeck = async (difficulty) => {
    setGenerating(difficulty);
    setProgress(0);
    const [creatureList, typeBackgrounds] = await Promise.all([
      base44.entities.Creature.list(),
      base44.entities.TypeBackground.list(),
    ]);
    const hybridCreatures = creatureList.filter((c) => c.role === "hyper_rare");
    const cards = buildDeckCards(difficulty, creatureList, hybridCreatures.length > 0 ? hybridCreatures : [{ baseName: "Chimera" }]);
    const finished = [];
    for (const card of cards) {
      const creatureDescription = card.isHybrid
        ? hybridCreatures.find((c) => c.baseName === card.baseName)?.description || ""
        : "";
      const { prompt, existingImageUrls } = buildCardImagePrompt(card, { typeBackgrounds, creatureDescription });
      const { url } = await base44.integrations.Core.GenerateImage({
        prompt,
        existing_image_urls: existingImageUrls,
      });
      finished.push({ ...card, imageUrl: url, difficulty });
      setProgress(finished.length);
    }
    const existing = await base44.entities.AiDeckCard.filter({ difficulty });
    if (existing.length > 0) {
      await base44.entities.AiDeckCard.deleteMany({ difficulty });
    }
    await base44.entities.AiDeckCard.bulkCreate(finished);
    setCounts((c) => ({ ...c, [difficulty]: finished.length }));
    setGenerating(null);
  };

  return (
    <div className="text-white px-6 py-6">
      <Link to="/admin" className="inline-flex items-center gap-1 text-white/60 text-sm mb-6 min-h-[44px] px-1 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl font-black mb-2">AI Deck Manager</h1>
      <p className="text-white/50 text-sm mb-6">
        Pre-generate the 100-card AI decks used for each difficulty so battles load instantly instead of generating cards live.
      </p>
      <div className="space-y-3">
        {DIFFICULTIES.map((d) => (
          <div key={d} className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-bold">{d}</p>
              <p className="text-white/40 text-xs">{counts[d] ?? "..."} cards stored</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openViewCards(d)}
                disabled={!!generating || !counts[d]}
                className="bg-white/10 text-white text-xs font-bold px-3 py-2 rounded-full disabled:opacity-40"
              >
                View Cards
              </button>
              <button
                onClick={() => generateDeck(d)}
                disabled={!!generating}
                className="bg-amber-500 text-black text-xs font-bold px-3 py-2 rounded-full disabled:opacity-40 flex items-center gap-2"
              >
                {generating === d ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> {progress}/100
                  </>
                ) : (
                  "Regenerate"
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {viewingDifficulty && (
        <AiDeckCardsModal
          difficulty={viewingDifficulty}
          cards={viewingCards}
          onClose={() => setViewingDifficulty(null)}
        />
      )}
    </div>
  );
}