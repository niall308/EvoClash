import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { buildDeckCards, DECK_COMPOSITIONS } from "@/lib/aiDeckGenerator";
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

  const refreshCounts = useCallback(async () => {
    const all = await Promise.all(DIFFICULTIES.map((d) => base44.entities.AiDeckCard.filter({ difficulty: d })));
    const next = {};
    DIFFICULTIES.forEach((d, i) => (next[d] = all[i].length));
    setCounts(next);
  }, []);

  useEffect(() => {
    refreshCounts();
    const onFocus = () => refreshCounts();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshCounts]);

  const generateDeck = async (difficulty) => {
    setGenerating(difficulty);
    setProgress(0);
    const creatureList = await base44.entities.Creature.list();
    const hybridCreatures = creatureList.filter((c) => c.role === "hyper_rare");
    const creatureByBase = Object.fromEntries(creatureList.map((c) => [c.baseName, c]));
    const cards = buildDeckCards(difficulty, creatureList, hybridCreatures.length > 0 ? hybridCreatures : [{ baseName: "Chimera" }]);
    const finished = [];
    for (const card of cards) {
      const { data } = await base44.functions.invoke("generateCardArt", {
        baseName: card.baseName,
        type: card.type,
        isHybrid: !!card.isHybrid,
      });
      // Stamp the admin-authored Unique Attack fields from the Creature entity
      // onto every AI deck card so the in-game resolver uses them.
      const c = creatureByBase[card.baseName];
      finished.push({
        ...card,
        imageUrl: data.url,
        difficulty,
        uniqueAttackName: c?.uniqueAttackName || "",
        uniqueAttackPercent: Math.max(0, Math.min(200, c?.uniqueAttackPercent || 0)),
        uniqueAttackTarget: c?.uniqueAttackTarget === "all" || c?.uniqueAttackTarget === "multi" ? "all" : "single",
        uniqueAttackEffectType: c?.uniqueAttackEffectType || "none",
        uniqueAttackEffectPercent: Math.max(0, Math.min(200, c?.uniqueAttackEffectPercent || 0)),
        uniqueAttackEffectDuration: Math.max(0, c?.uniqueAttackEffectDuration || 0),
        uniqueAttackEffect: c?.uniqueAttackEffect || "",
      });
      setProgress(finished.length);
    }
    const existing = await base44.entities.AiDeckCard.filter({ difficulty });
    if (existing.length > 0) {
      await base44.entities.AiDeckCard.deleteMany({ difficulty });
    }
    await base44.entities.AiDeckCard.bulkCreate(finished);
    await refreshCounts();
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
          onCountChange={refreshCounts}
        />
      )}
    </div>
  );
}