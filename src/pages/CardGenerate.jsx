import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { generateRandomCard } from "@/lib/cardGenerator";
import GameCard from "@/components/cards/GameCard";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CardGenerate() {
  const [count, setCount] = useState(null);
  const [newCard, setNewCard] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      const user = await base44.auth.me();
      const cards = await base44.entities.Card.filter({ created_by_id: user.id });
      setCount(cards.length);
    })();
  }, []);

  const handleGenerate = async () => {
    if (count >= 50) return;
    setGenerating(true);
    setNewCard(null);
    const cardData = generateRandomCard(1);
    const created = await base44.entities.Card.create(cardData);
    await new Promise((r) => setTimeout(r, 400));
    setNewCard(created);
    setCount((c) => c + 1);
    setGenerating(false);
  };

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white px-6 py-6 flex flex-col items-center">
      <div className="w-full">
        <Link to="/" className="inline-flex items-center gap-1 text-white/60 text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>
      <h1 className="text-2xl font-black mb-1">AI Generate</h1>
      <p className="text-white/50 text-xs mb-8">{count === null ? "Loading..." : `${count}/50 cards owned`}</p>

      <div className="h-56 flex items-center justify-center mb-8">
        <AnimatePresence mode="wait">
          {newCard && (
            <motion.div key={newCard.id} initial={{ rotateY: 180, scale: 0.5, opacity: 0 }} animate={{ rotateY: 0, scale: 1, opacity: 1 }} transition={{ duration: 0.6 }}>
              <GameCard card={newCard} size="lg" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating || count >= 50}
        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-fuchsia-500 px-8 py-4 rounded-full font-bold shadow-lg active:scale-95 transition-transform disabled:opacity-40"
      >
        {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
        {count >= 50 ? "Deck Full" : "Generate Card"}
      </button>
    </div>
  );
}