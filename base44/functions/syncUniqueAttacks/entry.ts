import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { buildUniqueAttackFields, normalizeTarget, normalizeEffectType, clampPercent } from '../../shared/uniqueAttackNormalize.ts';

// Admin-only maintenance function. Stamps the admin-authored Unique Attack
// fields (uniqueAttackName / uniqueAttackPercent / uniqueAttackTarget /
// uniqueAttackEffect / uniqueAttackEffectType) from each configured Creature
// onto every existing Card and AiDeckCard that shares its baseName, so the
// in-game resolver uses the configured attack instead of the static JSON
// fallback.
//
// This is the copy-at-creation backfill: editing a Creature does NOT change
// cards that already exist until an admin runs this. Newly created cards are
// stamped automatically at creation time (createGeneratedCard / AdminAiDecks).
//
// Normalization performed on every stamped card:
//   - percent clamped to 0–200
//   - target normalized to single|all (legacy "multi" → "all")
//   - effectType normalized to the canonical enum (legacy names → canonical)
//   - malformed UA repaired (invalid effectType → "none", percent → clamped)
//
// Creatures with no UA configured are stamped with empty fields so reverting a
// creature's UA and re-syncing clears it from cards (the resolver then falls
// back to data/uniqueAttacks.json).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const creatures = await base44.asServiceRole.entities.Creature.list(1000);
    const uaByBase: Record<string, object> = Object.fromEntries(
      creatures.map((c) => [c.baseName, buildUniqueAttackFields(c)])
    );
    const configuredCount = creatures.filter(
      (c) => !!c.uniqueAttackName || (c.uniqueAttackPercent || 0) > 0 || !!c.uniqueAttackEffect
    ).length;

    const stamp = async (entity: 'Card' | 'AiDeckCard') => {
      const all = await base44.asServiceRole.entities[entity].filter({}, undefined, 1000);
      const updates = all
        .filter((c: any) => uaByBase[c.baseName])
        .map((c: any) => ({ id: c.id, ...uaByBase[c.baseName] }));
      for (let i = 0; i < updates.length; i += 500) {
        await base44.asServiceRole.entities[entity].bulkUpdate(updates.slice(i, i + 500));
      }
      return { matched: updates.length, total: all.length, hasMore: all.length === 1000 };
    };

    const cards = await stamp('Card');
    const aiCards = await stamp('AiDeckCard');

    return Response.json({
      configuredCreatures: configuredCount,
      cardsUpdated: cards.matched,
      aiDeckCardsUpdated: aiCards.matched,
      cardsTotal: cards.total,
      aiDeckCardsTotal: aiCards.total,
      hasMore: cards.hasMore || aiCards.hasMore,
    });
  } catch (error) {
    console.error('syncUniqueAttacks error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});