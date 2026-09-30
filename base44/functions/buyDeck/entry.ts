import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Server-authoritative deck purchase. The client used to compute the new coin
// balance itself and write it via base44.auth.updateMe — a client-writable
// economy field. This re-checks the deck count + coin balance against the
// authoritative server state and debits coins server-side, so the client can't
// mint a free deck or forge the balance.
const DECK_COST = 250000;
const MAX_DECKS = 5;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { name } = await req.json().catch(() => ({}));
    if (!name || typeof name !== 'string' || !name.trim()) {
      return Response.json({ error: 'Deck name is required' }, { status: 400 });
    }

    // Deck RLS scopes filter to the caller's own decks.
    const decks = await base44.entities.Deck.filter({});
    if (decks.length >= MAX_DECKS) {
      return Response.json({ error: 'Maximum number of decks reached' }, { status: 400 });
    }
    if ((user.coins || 0) < DECK_COST) {
      return Response.json({ error: 'Not enough coins' }, { status: 400 });
    }

    const active = decks.find((d) => d.isActive);
    if (active) await base44.entities.Deck.update(active.id, { isActive: false });
    const newDeck = await base44.entities.Deck.create({ name: name.trim(), isActive: true });

    // Debit the authoritative balance via the service role — never through the
    // client-writable auth.updateMe path.
    await base44.asServiceRole.entities.User.update(user.id, {
      coins: (user.coins || 0) - DECK_COST,
    });

    const fresh = await base44.auth.me();
    return Response.json({ deck: newDeck, user: fresh });
  } catch (error) {
    console.error('buyDeck error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});