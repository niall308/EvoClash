import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import CardGrid from "@/components/cards/CardGrid";
import DeckListView from "@/components/cards/DeckListView";
import CardFilterBar from "@/components/cards/CardFilterBar";
import CardActionModal from "@/components/cards/CardActionModal";
import CardStatsModal from "@/components/cards/CardStatsModal";
import DeckCompareModal from "@/components/cards/DeckCompareModal";
import DeckTabs from "@/components/decks/DeckTabs";
import NewDeckModal from "@/components/decks/NewDeckModal";
import { getDecksAndActive } from "@/lib/decks";
import { DECK_COST, MAX_CARDS_PER_DECK, MAX_DECKS } from "@/lib/gameConstants";
import { Sparkles, Loader2, ListChecks, PlusCircle, Trash2, Star, LayoutGrid, List, Egg } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import PullToRefresh from "@/components/common/PullToRefresh";
import EggsModal from "@/components/decks/EggsModal";

export default function Deck() {
  const navigate = useNavigate();
  const { user: authUser, updateUser } = useAuth();
  const [user, setUser] = useState(authUser);
  const [decks, setDecks] = useState(null);
  const [activeDeckId, setActiveDeckId] = useState(null);
  const [viewingDeckId, setViewingDeckId] = useState(null);
  const [cards, setCards] = useState(null);
  const [activeDeckCount, setActiveDeckCount] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [filterTier, setFilterTier] = useState("all");
  const [hybridOnly, setHybridOnly] = useState(false);
  const [showNewDeckModal, setShowNewDeckModal] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [statsCard, setStatsCard] = useState(null);
  const [compareIndex, setCompareIndex] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [showEggs, setShowEggs] = useState(false);

  // Paginated, deck-scoped load: instead of fetching the ENTIRE collection and
  // filtering client-side, we load only the cards for the deck being viewed
  // (a deck is capped at MAX_CARDS_PER_DECK, so each fetch is bounded). The
  // active-deck count is tracked separately so the header stays correct while
  // a non-active deck is open. Switching decks re-fetches just that deck.
  const loadDeckCards = useCallback(async (userId, deckId) => {
    setCards(null);
    const data = await base44.entities.Card.filter(
      { ownerId: userId, deckId },
      "-created_date",
      MAX_CARDS_PER_DECK
    );
    setCards(data);
    return data;
  }, []);

  const loadAll = useCallback(async (me) => {
    setUser(me);
    const { decks: userDecks, active } = await getDecksAndActive(me.id);
    setDecks(userDecks);
    setActiveDeckId(active.id);
    setViewingDeckId(active.id);
    const activeCards = await loadDeckCards(me.id, active.id);
    setActiveDeckCount(activeCards.length);
  }, [loadDeckCards]);

  useEffect(() => {
    if (authUser) loadAll(authUser);
  }, [authUser?.id, loadAll]);

  // `cards` now holds ONLY the viewed deck's cards, so the deckId filter is a
  // no-op — memoize the type/tier/hybrid filter so large decks don't re-filter
  // on every unrelated state tick.
  const filteredCards = useMemo(
    () =>
      (cards || []).filter(
        (c) =>
          (filterType === "all" || c.type === filterType) &&
          (filterTier === "all" || String(c.tier) === filterTier) &&
          (!hybridOnly || c.isHybrid)
      ),
    [cards, filterType, filterTier, hybridOnly]
  );

  const handleDelete = async (id) => {
    const prevCards = cards;
    setCards((prev) => prev.filter((c) => c.id !== id));
    if (viewingDeckId === activeDeckId) setActiveDeckCount((c) => Math.max(0, c - 1));
    if (selectedId === id) setSelectedId(null);
    try {
      await base44.entities.Card.delete(id);
    } catch (err) {
      setCards(prevCards);
      if (viewingDeckId === activeDeckId) setActiveDeckCount((c) => c + 1);
    }
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
    const prevCards = cards;
    const idsToDelete = selectedIds;
    setCards((prev) => prev.filter((c) => !idsToDelete.includes(c.id)));
    if (viewingDeckId === activeDeckId) setActiveDeckCount((c) => Math.max(0, c - idsToDelete.length));
    setSelectedIds([]);
    setBulkMode(false);
    try {
      await base44.entities.Card.deleteMany({ id: { $in: idsToDelete } });
    } catch (err) {
      setCards(prevCards);
      if (viewingDeckId === activeDeckId) setActiveDeckCount((c) => c + idsToDelete.length);
    }
  };

  const handleViewDeck = async (deckId) => {
    if (deckId === viewingDeckId) return;
    setViewingDeckId(deckId);
    setSelectedId(null);
    setSelectedIds([]);
    await loadDeckCards(user.id, deckId);
  };

  const handleSetActiveDeck = async (deckId) => {
    if (deckId === activeDeckId) return;
    await Promise.all([
      base44.entities.Deck.update(deckId, { isActive: true }),
      base44.entities.Deck.update(activeDeckId, { isActive: false }),
    ]);
    setDecks((prev) => prev.map((d) => ({ ...d, isActive: d.id === deckId })));
    setActiveDeckId(deckId);
    // Active count now belongs to the new active deck. If we're viewing it,
    // cards.length is authoritative; otherwise fetch just its count (bounded).
    if (viewingDeckId === deckId) {
      setActiveDeckCount((cards || []).length);
    } else {
      const newActiveCards = await base44.entities.Card.filter(
        { ownerId: user.id, deckId },
        undefined,
        MAX_CARDS_PER_DECK
      );
      setActiveDeckCount(newActiveCards.length);
    }
  };

  const handleCreateDeck = async (name) => {
    if (!user || decks.length >= MAX_DECKS || (user.coins || 0) < DECK_COST) return;
    try {
      // Server-authoritative purchase: buyDeck debits coins + creates the deck
      // server-side, so the client no longer writes the coin balance itself.
      const { data } = await base44.functions.invoke("buyDeck", { name });
      setUser(data.user);
      setDecks((prev) => [...prev.map((d) => ({ ...d, isActive: false })), data.deck]);
      setActiveDeckId(data.deck.id);
      setViewingDeckId(data.deck.id);
      setCards([]);
      setActiveDeckCount(0);
      setShowNewDeckModal(false);
    } catch (err) {
      // Server rejected the purchase (e.g. insufficient coins / max decks); no UI change.
    }
  };

  const handleDeleteDeck = async (deckId) => {
    if (deckId === activeDeckId) return;
    if (!window.confirm("Delete this deck? Its cards will be moved to your active deck.")) return;
    // Fetch the to-be-deleted deck's cards on demand (rare action) so we never
    // hold every deck's cards in memory — only the one being viewed.
    const cardsToMove = await base44.entities.Card.filter(
      { ownerId: user.id, deckId },
      undefined,
      MAX_CARDS_PER_DECK
    );
    if (cardsToMove.length) {
      await base44.entities.Card.bulkUpdate(cardsToMove.map((c) => ({ id: c.id, deckId: activeDeckId })));
    }
    await base44.entities.Deck.delete(deckId);
    setDecks((prev) => prev.filter((d) => d.id !== deckId));
    if (viewingDeckId === deckId) {
      // Switched to the active deck, which just absorbed the moved cards —
      // reload it so the grid and the active count reflect the new total.
      setViewingDeckId(activeDeckId);
      const reloaded = await loadDeckCards(user.id, activeDeckId);
      setActiveDeckCount(reloaded.length);
    } else {
      setActiveDeckCount((c) => c + cardsToMove.length);
    }
  };

  const loading = !cards || !decks;
  const selectedCard = selectedId ? (cards || []).find((c) => c.id === selectedId) : null;

  return (
    <PullToRefresh onRefresh={() => authUser && loadAll(authUser)}>
    <div className="text-white pb-24">
      <div className="px-6 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Your Deck</h1>
          <p className="text-white/50 text-xs">{decks ? `Active deck: ${activeDeckCount}/50 cards (min 15 to play)` : "Loading..."}</p>
        </div>
        <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode((m) => (m === "grid" ? "list" : "grid"))}
          className="flex items-center gap-1 px-3 py-2 rounded-full text-xs font-bold bg-white/10"
          aria-label="Toggle view"
        >
          {viewMode === "grid" ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          {viewMode === "grid" ? "List" : "Grid"}
        </button>
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

      <div className="px-6 pb-3">
        <button
          onClick={() => setShowEggs(true)}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black py-3 rounded-full text-sm font-bold active:scale-95 transition-transform"
        >
          <Egg className="w-4 h-4" /> Creature Eggs
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-white/50" />
        </div>
      ) : (
        <>
          <DeckTabs decks={decks} activeDeckId={activeDeckId} viewingDeckId={viewingDeckId} onView={handleViewDeck} onDelete={handleDeleteDeck} />
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
          {viewingDeckId !== activeDeckId && (
            <div className="px-4 pb-3">
              <button
                onClick={() => handleSetActiveDeck(viewingDeckId)}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 text-black py-2.5 rounded-full text-xs font-bold"
              >
                <Star className="w-4 h-4" /> Set as Active Deck
              </button>
            </div>
          )}
          <CardFilterBar
            type={filterType}
            onTypeChange={setFilterType}
            tier={filterTier}
            onTierChange={setFilterTier}
            hybridOnly={hybridOnly}
            onHybridToggle={setHybridOnly}
          />
          {viewMode === "grid" ? (
            <CardGrid
              cards={filteredCards}
              onDelete={handleDelete}
              selectedId={selectedId}
              onSelect={handleSelect}
              bulkMode={bulkMode}
              selectedIds={selectedIds}
            />
          ) : (
            <DeckListView cards={filteredCards} onSelect={handleSelect} />
          )}
        </>
      )}

      {selectedCard && !bulkMode && (
        <CardActionModal
          card={selectedCard}
          onClose={() => setSelectedId(null)}
          onUpgrade={() => navigate(`/card-upgrade/${selectedCard.id}`)}
          onTrade={() => navigate("/trades")}
          onStats={() => {
            setStatsCard(selectedCard);
            setSelectedId(null);
          }}
          onCompare={() => {
            const pos = filteredCards.findIndex((c) => c.id === selectedCard.id);
            setCompareIndex(pos >= 0 ? pos : 0);
            setSelectedId(null);
          }}
          onDelete={(c) => {
            handleDelete(c.id);
            setSelectedId(null);
          }}
        />
      )}

      {compareIndex !== null && (
        <DeckCompareModal
          cards={filteredCards}
          startIndex={compareIndex}
          onDelete={handleDelete}
          onClose={() => setCompareIndex(null)}
        />
      )}

      {statsCard && <CardStatsModal card={statsCard} onClose={() => setStatsCard(null)} />}

      {bulkMode && selectedIds.length > 0 && (
        <div
          className="fixed left-0 right-0 z-50 p-4 bg-[#0D1B2A]/95 border-t border-white/10"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 4rem)" }}
        >
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

      {showEggs && <EggsModal onClose={() => setShowEggs(false)} onUserUpdate={updateUser} />}
    </div>
    </PullToRefresh>
  );
}