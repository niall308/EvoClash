import { base44 } from "@/api/base44Client";

// Ensures the user has at least one deck (creates "Deck 1" and migrates any
// un-assigned cards to it), and returns { decks, active }.
export async function ensureActiveDeck(userId) {
  let decks = await base44.entities.Deck.filter({ created_by_id: userId });
  let active = decks.find((d) => d.isActive);

  if (decks.length === 0) {
    const deck = await base44.entities.Deck.create({ name: "Deck 1", isActive: true });
    decks = [deck];
    active = deck;
    const cards = await base44.entities.Card.filter({ ownerId: userId });
    const orphans = cards.filter((c) => !c.deckId);
    if (orphans.length) {
      await base44.entities.Card.bulkUpdate(orphans.map((c) => ({ id: c.id, deckId: deck.id })));
    }
  } else if (!active) {
    active = decks[0];
    await base44.entities.Deck.update(active.id, { isActive: true });
    active = { ...active, isActive: true };
  }

  return { decks, active };
}