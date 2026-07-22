import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import CardGrid from "@/components/cards/CardGrid";
import CardFilterBar from "@/components/cards/CardFilterBar";
import DeckTabs from "@/components/decks/DeckTabs";
import NewDeckModal from "@/components/decks/NewDeckModal";
import { ensureActiveDeck } from "@/lib/decks";
import { DECK_COST, MAX_DECKS } from "@/lib/gameConstants";
import { ArrowLeft, Sparkles, Loader2, ArrowUpCircle, ListChecks, PlusCircle, Trash2 } from "lucide-react";

export default function Deck() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [decks, setDecks] = useState(null);
  const [activeDeckId, setActiveDeckId] = useState(null);
  const [cards, setCards] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [filterTier, setFilterTier] = useState("all");
  const [hybridOnly, setHybridOnly] = useState(false);
  const [showNewDeckModal, setShowNewDeckModal] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const load = async () => {
    const me = await base44.auth.me();
    setUser(me);
    const { decks: userDecks, active } = await ensureActiveDeck(me.id);
    setDecks(userDecks);
    setActiveDeckId(active.id);
    const data = await base44.entities.Card.filter({ created_by_id: me.id }, "-created_date");
    setCards(data);
  };

  useEffect(() => {
    load();
  }, []);

  const deckCards = (cards || []).filter((c) => c.deckId === activeDeckId);
  const filteredCards = deckCards.filter(
    (c) =>
      (filterType === "all" || c.type === filterType) &&
      (filterTier === "all" || String(c.tier) === filterTier) &&
      (!hybridOnly || c.isHybrid)
  );

  const handleDelete = async (id) => {
    await base44.entities.Card.delete(id);
    setCards((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleSelect = (card) => {
    if (bulkMode) {
      setSelectedIds((prev) => (prev.includes(card.id) ? prev.filter((i) => i !== card.id) : [...prev, card.id]));
      return;
    }
    setSelectedId((prev) => (prev === card.id ? null : card.id));
  };

  const toggleBulkMode = () => {
    setBulkMode((b) => !b);
    setSelectedIds([]);
    setSelectedId(null);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} card(s)? This cannot be undone.`)) return;
    await base44.entities.Card.deleteMany({ id: { $in: selectedIds } });
    setCards((prev) => prev.filter((c) => !selectedIds.includes(c.id)));
    setSelectedIds([]);
    setBulkMode(false);
  };

  const handleSwitchDeck = async (deckId) => {
    if (deckId === activeDeckId) return;
    await Promise.all([
      base44.entities.Deck.update(deckId, { isActive: true }),
      base44.entities.Deck.update(activeDeckId, { isActive: false }),
    ]);
    setDecks((prev) => prev.map((d) => ({ ...d, isActive: d.id === deckId })));
    setActiveDeckId(deckId);
    setSelectedId(null);
    setSelectedIds([]);
  };

  const handleCreateDeck = async (name) => {
    if (!user || decks.length >= MAX_DECKS || (user.coins || 0) < DECK_COST) return;
    await base44.entities.Deck.update(activeDeckId, { isActive: false });
    const newDeck = await base44.entities.Deck.create({ name, isActive: true });
    const updatedUser = await base44.auth.updateMe({ coins: user.coins - DECK_COST });
    setUser(updatedUser);
    setDecks((prev) => [...prev.map((d) => ({ ...d, isActive: false })), newDeck]);
    setActiveDeckId(newDeck.id);
    setShowNewDeckModal(false);
  };

  const handleDeleteDeck = async (deckId) => {
    if (deckId === activeDeckId) return;
    if (!window.confirm("Delete this deck? Its cards will be moved to your active deck.")) return;
    const cardsToMove = (cards || []).filter((c) => c.deckId === deckId);
    if (cardsToMove.length) {
      await base44.entities.Card.bulkUpdate(cardsToMove.map((c) => ({ id: c.id, deckId: activeDeckId })));
      setCards((prev) => prev.map((c) => (c.deckId === deckId ? { ...c, deckId: activeDeckId } : c)));
    }
    await base44.entities.Deck.delete(deckId);
    setDecks((prev) => prev.filter((d) => d.id !== deckId));
  };

  const loading = !cards || !decks;

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white pb-24">
      <div className="px-6 py-6 flex items-center justify-between">
        <div>
          <Link to="/" className="inline-flex items-center gap-1 text-white/60 text-sm mb-2 py-2 px-1 -ml-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="text-2xl font-black">Your Deck</h1>
          <p className="text-white/50 text-xs">{cards ? `${cards.length}/50 cards (min 15 to play)` : "Loading..."}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleBulkMode}
            className={`flex items-center gap-1 px-3 py-2 rounded-full text-xs font-bold ${
              bulkMode ? "bg-red-600" : "bg-white/10"
            }`}
          >
            <ListChecks className="w-4 h-4" /> {bulkMode ? "Cancel" : "Select"}
          </button>
          <Link to="/generate" className="flex items-center gap-1 bg-purple-600 px-4 py-2 rounded-full text-xs font-bold">
            <Sparkles className="w-4 h-4" /> Generate
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-white/50" />
        </div>
      ) : (
        <>
          <DeckTabs decks={decks} activeDeckId={activeDeckId} onSwitch={handleSwitchDeck} onDelete={handleDeleteDeck} />
          <div className="flex items-center justify-between px-4 pb-2">
            <p className="text-white/40 text-[11px]">{decks.length}/{MAX_DECKS} decks</p>
            {decks.length < MAX_DECKS && (
              <button
                onClick={() => setShowNewDeckModal(true)}
                className="flex items-center gap-1 text-amber-400 text-xs font-bold"
              >
                <PlusCircle className="w-4 h-4" /> Add New Deck
              </button>
            )}
          </div>
          <CardFilterBar
            type={filterType}
            onTypeChange={setFilterType}
            tier={filterTier}
            onTierChange={setFilterTier}
            hybridOnly={hybridOnly}
            onHybridToggle={setHybridOnly}
          />
          <CardGrid
            cards={filteredCards}
            onDelete={handleDelete}
            selectedId={selectedId}
            onSelect={handleSelect}
            bulkMode={bulkMode}
            selectedIds={selectedIds}
          />
        </>
      )}

      {selectedId && !bulkMode && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0D1B2A]/95 border-t border-white/10">
          <button
            onClick={() => navigate(`/card-upgrade/${selectedId}`)}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 py-3 rounded-full font-bold"
          >
            <ArrowUpCircle className="w-5 h-5" /> Upgrade Card
          </button>
        </div>
      )}

      {bulkMode && selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0D1B2A]/95 border-t border-white/10">
          <button
            onClick={handleBulkDelete}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-700 py-3 rounded-full font-bold"
          >
            <Trash2 className="w-5 h-5" /> Delete Selected ({selectedIds.length})
          </button>
        </div>
      )}

      {showNewDeckModal && (
        <NewDeckModal
          cost={DECK_COST}
          canAfford={(user?.coins || 0) >= DECK_COST}
          onCreate={handleCreateDeck}
          onCancel={() => setShowNewDeckModal(false)}
        />
      )}
    </div>
  );
}