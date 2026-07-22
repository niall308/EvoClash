import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { buildDeckCards, DECK_COMPOSITIONS } from "@/lib/aiDeckGenerator";
import { STYLE_REFERENCE_URL } from "@/lib/gameConstants";

const DIFFICULTIES = Object.keys(DECK_COMPOSITIONS);

export default function AdminAiDecks() {
  const [counts, setCounts] = useState({});
  const [generating, setGenerating] = useState(null);
  const [progress, setProgress] = useState(0);

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
    const creatureList = await base44.entities.Creature.list();
    const hybridCreatures = creatureList.filter((c) => c.role === "hyper_rare");
    const cards = buildDeckCards(difficulty, hybridCreatures.length > 0 ? hybridCreatures : [{ baseName: "Chimera" }]);
    const finished = [];
    for (const card of cards) {
      const { url } = await base44.integrations.Core.GenerateImage({
        prompt: `A ${card.type}-type ${card.baseName}, dynamic full-body creature illustration, matching the exact art style, color palette, lighting, and mystical trading-card aesthetic of the reference image, centered on a plain background, no text, no border, no frame`,
        existing_image_urls: [STYLE_REFERENCE_URL],
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
    <div className="min-h-screen bg-[#0D1B2A] text-white px-6 py-6">
      <Link to="/admin" className="inline-flex items-center gap-1 text-white/60 text-sm mb-6 py-2 px-1 -ml-1">
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
                "Generate"
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}