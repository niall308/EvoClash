import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { generateRandomCard, generateHybridCard } from "@/lib/cardGenerator";
import { buildCardImagePrompt } from "@/lib/cardImagePrompt";
import { STYLE_REFERENCE_URL, HYBRID_CHANCE } from "@/lib/gameConstants";
import { getCreationStatus, EXTRA_CREATURE_COST } from "@/lib/cardCreationLimits";
import { ensureActiveDeck } from "@/lib/decks";
import GameCard from "@/components/cards/GameCard";
import CreaturePicker from "@/components/generate/CreaturePicker";
import AutoBuildOfferModal from "@/components/generate/AutoBuildOfferModal";
import { Sparkles, Loader2, PlusCircle, RefreshCw, Coins } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";

const AUTO_BUILD_COUNT = 15;

export default function CardGenerate() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [count, setCount] = useState(null);
  const [creatures, setCreatures] = useState([]);
  const [typeBackgrounds, setTypeBackgrounds] = useState([]);
  const [selectedCreature, setSelectedCreature] = useState(null);
  const [previewCard, setPreviewCard] = useState(null);
  const [previewForced, setPreviewForced] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeDeckId, setActiveDeckId] = useState(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [autoBuilding, setAutoBuilding] = useState(false);
  const [autoBuildProgress, setAutoBuildProgress] = useState(0);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      setUser(me);
      const cards = await base44.entities.Card.filter({ ownerId: me.id });
      setCount(cards.length);
      const list = await base44.entities.Creature.list();
      setCreatures(list);
      setTypeBackgrounds(await base44.entities.TypeBackground.list());
      const { active } = await ensureActiveDeck(me.id);
      setActiveDeckId(active.id);
      if (cards.length === 0 && !me.autoBuildOffered) setShowOfferModal(true);
    })();
  }, []);

  const handleDeclineOffer = async () => {
    setShowOfferModal(false);
    const updated = await base44.auth.updateMe({ autoBuildOffered: true });
    setUser(updated);
  };

  const handleAutoBuild = async () => {
    setShowOfferModal(false);
    setAutoBuilding(true);
    setAutoBuildProgress(0);
    const ownedTypes = new Set(user.ownedElementTypesList || []);
    for (let i = 0; i < AUTO_BUILD_COUNT; i++) {
      const cardData = generateRandomCard(1, { creatures });
      const { prompt, existingImageUrls } = buildCardImagePrompt(cardData, { typeBackgrounds });
      try {
        const { url } = await base44.integrations.Core.GenerateImage({ prompt, existing_image_urls: existingImageUrls });
        cardData.imageUrl = url;
        await base44.functions.invoke("createGeneratedCard", { cardData, deckId: activeDeckId, forced: false });
        ownedTypes.add(cardData.type);
        setAutoBuildProgress(i + 1);
      } catch (err) {
        // Skip this card on failure and continue building the rest.
      }
    }
    // totalCardsCreated/coins are already tracked server-side per card by
    // createGeneratedCard; only set the one-time offer flag and owned types here.
    const updated = await base44.auth.updateMe({
      autoBuildOffered: true,
      ownedElementTypesList: Array.from(ownedTypes),
      distinctTypesOwnedCount: ownedTypes.size,
    });
    setUser(updated);
    setCount(AUTO_BUILD_COUNT);
    setAutoBuilding(false);
  };

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

    const creatureDescription = useHybrid
      ? (forcedHybrid ? forced : hybridCreatures.find((c) => c.baseName === cardData.baseName))?.description || ""
      : "";
    const { prompt, existingImageUrls } = buildCardImagePrompt(
      { ...cardData, isHybrid: useHybrid },
      { typeBackgrounds, creatureDescription }
    );

    try {
      const { url } = await base44.integrations.Core.GenerateImage({
        prompt,
        existing_image_urls: existingImageUrls,
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
    try {
      // Coin cost / free-limit counters are enforced and persisted server-side
      // by createGeneratedCard; only the owned-types tracking is client-driven.
      const { data } = await base44.functions.invoke("createGeneratedCard", { cardData: previewCard, deckId: activeDeckId, forced: previewForced });
      let updatedUser = data.user;
      const ownedTypes = updatedUser.ownedElementTypesList || [];
      if (!ownedTypes.includes(previewCard.type)) {
        updatedUser = await base44.auth.updateMe({
          ownedElementTypesList: [...ownedTypes, previewCard.type],
          distinctTypesOwnedCount: ownedTypes.length + 1,
        });
      }
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
    <div className="text-white px-6 py-6 flex flex-col items-center">
      {showOfferModal && <AutoBuildOfferModal onChooseAuto={handleAutoBuild} onChooseManual={handleDeclineOffer} />}
      {autoBuilding && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-6">
          <div className="bg-[#0D1B2A] border border-white/10 rounded-2xl p-6 max-w-sm w-full text-white text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-400" />
            <p className="font-bold mb-2">Building your first {AUTO_BUILD_COUNT} cards...</p>
            <p className="text-white/50 text-sm mb-4">{autoBuildProgress}/{AUTO_BUILD_COUNT} created</p>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-fuchsia-500 transition-all"
                style={{ width: `${(autoBuildProgress / AUTO_BUILD_COUNT) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
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