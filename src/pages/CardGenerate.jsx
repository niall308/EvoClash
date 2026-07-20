import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { generateRandomCard } from "@/lib/cardGenerator";
import { STYLE_REFERENCE_URL } from "@/lib/gameConstants";
import GameCard from "@/components/cards/GameCard";
import CreaturePicker from "@/components/generate/CreaturePicker";
import { ArrowLeft, Sparkles, Loader2, PlusCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CardGenerate() {
  const [user, setUser] = useState(null);
  const [count, setCount] = useState(null);
  const [creatures, setCreatures] = useState([]);
  const [selectedCreature, setSelectedCreature] = useState(null);
  const [previewCard, setPreviewCard] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      setUser(me);
      const cards = await base44.entities.Card.filter({ created_by_id: me.id });
      setCount(cards.length);
      const list = await base44.entities.Creature.list();
      setCreatures(list);
    })();
  }, []);

  const handleGenerate = async () => {
    if (count >= 50 || generating) return;
    setGenerating(true);
    setPreviewCard(null);
    const forced = user?.role === "admin" && selectedCreature ? selectedCreature : null;
    const cardData = generateRandomCard(1, { creatures, forcedCreature: forced });
    const { url } = await base44.integrations.Core.GenerateImage({
      prompt: `A ${cardData.type}-type ${cardData.baseName}, dynamic full-body creature illustration, matching the exact art style, color palette, lighting, and mystical trading-card aesthetic of the reference image, centered on a plain background, no text, no border, no frame`,
      existing_image_urls: [STYLE_REFERENCE_URL],
    });
    cardData.imageUrl = url;
    setPreviewCard(cardData);
    setGenerating(false);
  };

  const handleAddToDeck = async () => {
    if (!previewCard || saving) return;
    setSaving(true);
    await base44.entities.Card.create(previewCard);
    setCount((c) => c + 1);
    setPreviewCard(null);
    setSaving(false);
  };

  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white px-6 py-6 flex flex-col items-center">
      <div className="w-full">
        <Link to="/" className="inline-flex items-center gap-1 text-white/60 text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>
      <h1 className="text-2xl font-black mb-1">AI Generate</h1>
      <p className="text-white/50 text-xs mb-8">{count === null ? "Loading..." : `${count}/50 cards owned`}</p>

      <div className="w-full flex flex-col md:flex-row gap-6 items-start justify-center">
        <div className="flex-1 flex flex-col items-center">
          <div className="h-56 flex items-center justify-center mb-8">
            <AnimatePresence mode="wait">
              {previewCard && (
                <motion.div key={previewCard.name} initial={{ rotateY: 180, scale: 0.5, opacity: 0 }} animate={{ rotateY: 0, scale: 1, opacity: 1 }} transition={{ duration: 0.6 }}>
                  <GameCard card={previewCard} size="lg" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!previewCard ? (
            <button
              onClick={handleGenerate}
              disabled={generating || count >= 50}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-fuchsia-500 px-8 py-4 rounded-full font-bold shadow-lg active:scale-95 transition-transform disabled:opacity-40"
            >
              {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {count >= 50 ? "Deck Full" : "Generate Card"}
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleAddToDeck}
                disabled={saving || count >= 50}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 rounded-full font-bold shadow-lg active:scale-95 transition-transform disabled:opacity-40"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                Add to Deck
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-2 bg-white/10 px-6 py-3 rounded-full font-bold shadow-lg active:scale-95 transition-transform disabled:opacity-40"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Generate New
              </button>
            </div>
          )}
        </div>

        {isAdmin && (
          <CreaturePicker creatures={creatures} selected={selectedCreature} onSelect={setSelectedCreature} />
        )}
      </div>
    </div>
  );
}