import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { generateRandomCard, generateHybridCard } from "@/lib/cardGenerator";
import { STYLE_REFERENCE_URL, HYBRID_CHANCE, CREATURE_ANATOMY, CREATURE_STANCES } from "@/lib/gameConstants";
import { getCreationStatus, buildCreationUpdate, EXTRA_CREATURE_COST } from "@/lib/cardCreationLimits";
import { ensureActiveDeck } from "@/lib/decks";
import GameCard from "@/components/cards/GameCard";
import CreaturePicker from "@/components/generate/CreaturePicker";
import { Sparkles, Loader2, PlusCircle, RefreshCw, Coins } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";

export default function CardGenerate() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [count, setCount] = useState(null);
  const [creatures, setCreatures] = useState([]);
  const [selectedCreature, setSelectedCreature] = useState(null);
  const [previewCard, setPreviewCard] = useState(null);
  const [previewForced, setPreviewForced] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeDeckId, setActiveDeckId] = useState(null);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      setUser(me);
      const cards = await base44.entities.Card.filter({ ownerId: me.id });
      setCount(cards.length);
      const list = await base44.entities.Creature.list();
      setCreatures(list);
      const { active } = await ensureActiveDeck(me.id);
      setActiveDeckId(active.id);
    })();
  }, []);

  const handleGenerate = async () => {
    if (count >= 50 || generating) return;
    setGenerating(true);
    setPreviewCard(null);
    const forced = user?.role === "admin" && selectedCreature ? selectedCreature : null;
    const hybridCreatures = creatures.filter((c) => c.category === "Hybrid");
    const forcedHybrid = forced?.category === "Hybrid";
    const rolledHybrid = !forced && hybridCreatures.length > 0 && Math.random() < HYBRID_CHANCE;
    const useHybrid = forcedHybrid || rolledHybrid;

    const cardData = useHybrid
      ? generateHybridCard(forcedHybrid ? forced : hybridCreatures[Math.floor(Math.random() * hybridCreatures.length)])
      : generateRandomCard(1, { creatures, forcedCreature: forced });

    const stance = CREATURE_STANCES[Math.floor(Math.random() * CREATURE_STANCES.length)];
    const prompt = useHybrid
      ? `A hybrid creature combining two creatures into one, robot-style, design guide: ${cardData.baseName} — ${
          (forcedHybrid ? forced : hybridCreatures.find((c) => c.baseName === cardData.baseName))?.description || ""
        }. Pose: ${stance}. Dynamic full-body illustration true to this exact hybrid description and anatomy. CRITICAL: Match ONLY the art style, color palette, lighting, and mystical trading-card aesthetic of the reference image — its actual creature, face, head shape, and pose must be completely ignored and NOT copied. Centered on a plain background, no text, no border, no frame`
      : `A ${cardData.type}-type ${cardData.baseName}. Its head, face, and full body must look EXACTLY like this: ${CREATURE_ANATOMY[cardData.baseName] || `a creature true to a real ${cardData.baseName}`}. Pose: ${stance}. Dynamic full-body creature illustration, anatomically true to this exact creature. CRITICAL: Do NOT give it a Tyrannosaurus Rex or generic dinosaur face/head unless it is actually a Tyrannosaurus Rex — the head shape above must be followed precisely. Use the reference image ONLY for its art style, color palette, lighting, and mystical trading-card aesthetic — its actual creature, face, head shape, and pose must be completely ignored and NOT copied. Centered on a plain background, no text, no border, no frame`;

    try {
      const { url } = await base44.integrations.Core.GenerateImage({
        prompt,
        existing_image_urls: [STYLE_REFERENCE_URL],
      });
      cardData.imageUrl = url;
      setPreviewCard(cardData);
      setPreviewForced(!!forced);
    } catch (err) {
      toast({ title: "Generation failed", description: "Couldn't generate the card image. Please try again.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
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
    try {
      const [, updatedUser] = await Promise.all([
        base44.functions.invoke("createGeneratedCard", { cardData: previewCard, deckId: activeDeckId, forced: previewForced }),
        Object.keys(userUpdate).length ? base44.auth.updateMe(userUpdate) : Promise.resolve(user),
      ]);
      setUser(updatedUser);
      setCount((c) => c + 1);
      setPreviewCard(null);
      setPreviewForced(false);
    } catch (err) {
      toast({ title: "Couldn't add card", description: "Something went wrong saving this card. Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white px-6 py-6 flex flex-col items-center">
      <h1 className="text-2xl font-black mb-1 mt-2">AI Generate</h1>
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