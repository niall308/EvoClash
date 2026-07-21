import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { generateRandomCard } from "@/lib/cardGenerator";
import { STYLE_REFERENCE_URL } from "@/lib/gameConstants";
import { getCreationStatus, buildCreationUpdate, EXTRA_CREATURE_COST } from "@/lib/cardCreationLimits";
import GameCard from "@/components/cards/GameCard";
import CreaturePicker from "@/components/generate/CreaturePicker";
import { ArrowLeft, Sparkles, Loader2, PlusCircle, RefreshCw, Coins } from "lucide-react";
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

  const status = user ? getCreationStatus(user, count) : null;

  const handleAddToDeck = async () => {
    if (!previewCard || saving || !user) return;
    if (status.needsPayment && (user.coins || 0) < EXTRA_CREATURE_COST) return;
    setSaving(true);
    const userUpdate = buildCreationUpdate(user, count);
    const ownedTypes = user.ownedElementTypesList || [];
    if (!ownedTypes.includes(previewCard.type)) {
      userUpdate.ownedElementTypesList = [...ownedTypes, previewCard.type];
      userUpdate.distinctTypesOwnedCount = userUpdate.ownedElementTypesList.length;
    }
    const [, updatedUser] = await Promise.all([
      base44.entities.Card.create(previewCard),
      Object.keys(userUpdate).length ? base44.auth.updateMe(userUpdate) : Promise.resolve(user),
    ]);
    setUser(updatedUser);
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
      <p className="text-white/50 text-xs mb-1">{count === null ? "Loading..." : `${count}/50 cards owned`}</p>
      <p className="text-[11px] mb-8 h-4">
        {status && !isAdmin && status.pastInitialFree && (
          status.needsPayment ? (
            <span className="text-amber-400">New creatures now cost {EXTRA_CREATURE_COST.toLocaleString()} LC</span>
          ) : (
            <span className="text-white/40">{status.freeRemaining} free creation{status.freeRemaining === 1 ? "" : "s"} left today</span>
          )
        )}
      </p>

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
                disabled={saving || count >= 50 || (status?.needsPayment && (user.coins || 0) < EXTRA_CREATURE_COST)}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 rounded-full font-bold shadow-lg active:scale-95 transition-transform disabled:opacity-40"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : status?.needsPayment ? <Coins className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                {status?.needsPayment ? `Add to Deck — ${EXTRA_CREATURE_COST.toLocaleString()} LC` : "Add to Deck"}
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