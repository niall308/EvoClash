import { base44 } from "@/api/base44Client";

// Ensures the user has at least one deck (creates "Deck 1" and migrates any
// un-assigned cards to it), and returns { decks, active }.
// Fresh, uncached decks + active deck for inventory screens (Deck, CardGenerate).
// Unlike ensureActiveDeck it does NOT fetch every card or repair orphans — the
// caller fetches only the deck(s) it actually displays. Always current, so
// post-mutation refreshes (create/delete/setActive) aren't served from a cache.
export async function getDecksAndActive(userId) {
  let decks = await base44.entities.Deck.filter({ created_by_id: userId });
  let active = decks.find((d) => d.isActive);
  if (decks.length === 0) {
    const deck = await base44.entities.Deck.create({ name: "Deck 1", isActive: true });
    return { decks: [deck], active: deck };
  }
  if (!active) {
    active = decks[0];
    await base44.entities.Deck.update(active.id, { isActive: true });
    active = { ...active, isActive: true };
  }
  return { decks, active };
}

export async function ensureActiveDeck(userId) {
  let decks = await base44.entities.Deck.filter({ created_by_id: userId });
  let active = decks.find((d) => d.isActive);

  if (decks.length === 0) {
    const deck = await base44.entities.Deck.create({ name: "Deck 1", isActive: true });
    decks = [deck];
    active = deck;
  } else if (!active) {
    active = decks[0];
    await base44.entities.Deck.update(active.id, { isActive: true });
    active = { ...active, isActive: true };
  }

  // Reassign any cards whose deckId is empty or points to a deck that no
  // longer exists, so cards never vanish from the visible deck after a deck
  // is deleted or its id goes stale.
  const deckIds = new Set(decks.map((d) => d.id));
  const cards = await base44.entities.Card.filter({ ownerId: userId });
  const orphans = cards.filter((c) => !c.deckId || !deckIds.has(c.deckId));
  if (orphans.length) {
    await base44.entities.Card.bulkUpdate(orphans.map((c) => ({ id: c.id, deckId: active.id })));
  }

  return { decks, active };
}

// ---------------------------------------------------------------------------
// Fast battle-entry path (used by src/pages/Battle.jsx).
//
// `ensureActiveDeck` above is correct but slow for battle start: it fetches
// EVERY card the user owns to repair orphaned deckIds, and the caller then
// re-fetches the active deck's cards. `prepareBattleDeck` avoids that double
// fetch by loading only the active deck's cards up front, rendering the battle
// as soon as 15 cards are in hand, and deferring orphan repair to the
// background so it never blocks the cold start. The 15-card gate is still
// enforced exactly: a short deck awaits orphan repair before deciding.
// ---------------------------------------------------------------------------

const BATTLE_MIN_CARDS = 15;
const CACHE_TTL = 15_000; // 15s — fresh enough for navigation, cheap to rebuild

// decks list + active deck, per user
const _deckCache = new Map(); // userId -> { decks, active, expiresAt }
// active-deck cards, per user+deck
const _cardCache = new Map(); // `${userId}:${deckId}` -> { cards, expiresAt }
// last time background orphan repair ran, per user (debounce)
const _orphanCheckedAt = new Map(); // userId -> ts

export function invalidateBattleDeckCache(userId) {
  if (userId) {
    _deckCache.delete(userId);
    _orphanCheckedAt.delete(userId);
    for (const key of [..._cardCache.keys()]) {
      if (key.startsWith(`${userId}:`)) _cardCache.delete(key);
    }
  } else {
    _deckCache.clear();
    _cardCache.clear();
    _orphanCheckedAt.clear();
  }
}

async function loadDecks(userId) {
  const cached = _deckCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached;
  const decks = await base44.entities.Deck.filter({ created_by_id: userId });
  let active = decks.find((d) => d.isActive);

  if (decks.length === 0) {
    const deck = await base44.entities.Deck.create({ name: "Deck 1", isActive: true });
    const entry = { decks: [deck], active: deck, expiresAt: Date.now() + CACHE_TTL };
    _deckCache.set(userId, entry);
    return entry;
  }
  if (!active) {
    active = decks[0];
    await base44.entities.Deck.update(active.id, { isActive: true });
    active = { ...active, isActive: true };
  }
  const entry = { decks, active, expiresAt: Date.now() + CACHE_TTL };
  _deckCache.set(userId, entry);
  return entry;
}

async function loadActiveCards(userId, activeDeck) {
  const key = `${userId}:${activeDeck.id}`;
  const cached = _cardCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.cards;
  const cards = await base44.entities.Card.filter({ ownerId: userId, deckId: activeDeck.id });
  _cardCache.set(key, { cards, expiresAt: Date.now() + CACHE_TTL });
  return cards;
}

// Repairs orphaned cards (empty/stale deckId) into the active deck. Runs in the
// background on the fast path; awaited on the short-deck path so the 15-card
// gate sees rescued cards before redirecting. Debounced per user.
function repairOrphansInBackground(userId, decks, active) {
  const last = _orphanCheckedAt.get(userId) || 0;
  if (Date.now() - last < CACHE_TTL) return; // recently checked — skip
  _orphanCheckedAt.set(userId, Date.now());
  (async () => {
    try {
      const deckIds = new Set(decks.map((d) => d.id));
      const all = await base44.entities.Card.filter({ ownerId: userId });
      const orphans = all.filter((c) => !c.deckId || !deckIds.has(c.deckId));
      if (orphans.length) {
        await base44.entities.Card.bulkUpdate(
          orphans.map((c) => ({ id: c.id, deckId: active.id }))
        );
        // Active deck may have grown — refresh the card cache so the next
        // battle start sees the rescued cards without a re-fetch.
        const merged = orphans.concat(
          all.filter((c) => c.deckId === active.id).map((c) => ({ ...c, deckId: active.id }))
        );
        _cardCache.set(`${userId}:${active.id}`, {
          cards: merged,
          expiresAt: Date.now() + CACHE_TTL,
        });
      }
    } catch {
      // Background housekeeping must never break battle entry.
    }
  })();
}

// Synchronous orphan repair used when the deck is short of 15 cards, so the
// gate can account for rescued cards before redirecting to /play.
async function repairOrphansAndWait(userId, decks, active, knownActiveCards) {
  const deckIds = new Set(decks.map((d) => d.id));
  const all = await base44.entities.Card.filter({ ownerId: userId });
  const orphans = all.filter((c) => !c.deckId || !deckIds.has(c.deckId));
  let activeCards = knownActiveCards.length
    ? knownActiveCards
    : all.filter((c) => c.deckId === active.id);
  if (orphans.length) {
    await base44.entities.Card.bulkUpdate(
      orphans.map((c) => ({ id: c.id, deckId: active.id }))
    );
    activeCards = orphans.map((c) => ({ ...c, deckId: active.id })).concat(activeCards);
  }
  _orphanCheckedAt.set(userId, Date.now());
  _cardCache.set(`${userId}:${active.id}`, {
    cards: activeCards,
    expiresAt: Date.now() + CACHE_TTL,
  });
  return activeCards;
}

// Returns { decks, active, cards, ready }. `ready` is true when the active
// deck has >= 15 cards (after any needed orphan rescue); false otherwise.
export async function prepareBattleDeck(userId) {
  const { decks, active } = await loadDecks(userId);
  const cards = await loadActiveCards(userId, active);

  if (cards.length >= BATTLE_MIN_CARDS) {
    // Deck is battle-ready — repair orphans without blocking the start.
    repairOrphansInBackground(userId, decks, active);
    return { decks, active, cards, ready: true };
  }

  // Short deck: rescue orphaned cards first, then re-check the gate.
  const rescued = await repairOrphansAndWait(userId, decks, active, cards);
  return { decks, active, cards: rescued, ready: rescued.length >= BATTLE_MIN_CARDS };
}