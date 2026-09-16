import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { validateCardData } from '../../shared/cardValidation.ts';
import { getCreationStatus, buildCreationUpdate, EXTRA_CREATURE_COST } from '../../shared/cardCreationLimits.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { cardData, deckId, forced } = await req.json();
    if (!cardData || typeof cardData !== 'object') {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    // The client only allows picking a specific creature (bypassing the random
    // roll) for admins. Re-verify that against the real server-side session
    // instead of trusting the client's claim, since client state is spoofable.
    if (forced && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Never trust raw client-supplied stats/tier/isHybrid — validate against
    // legitimate server-side ranges and rebuild a clean object before saving.
    const allCreatures = await base44.entities.Creature.list();
    const hybridBaseNames = allCreatures.filter((c) => c.category === 'Hybrid').map((c) => c.baseName);
    const creaturesByCategory = allCreatures.reduce((acc, c) => {
      (acc[c.category] ||= []).push(c.baseName);
      return acc;
    }, {});
    let safeCardData;
    try {
      safeCardData = validateCardData(cardData, hybridBaseNames, creaturesByCategory);
    } catch (validationError) {
      return Response.json({ error: validationError.message }, { status: 400 });
    }

    // Stamp the admin-authored Unique Attack fields from the Creature entity
    // onto the new card so the in-game resolver (src/lib/uniqueAttacks) reads
    // the configured attack instead of the static JSON fallback.
    const creatureByBaseName = allCreatures.find((c) => c.baseName === safeCardData.baseName);
    const uniqueAttackFields = creatureByBaseName
      ? {
          uniqueAttackName: creatureByBaseName.uniqueAttackName || '',
          uniqueAttackPercent: Math.max(0, Math.min(200, Number(creatureByBaseName.uniqueAttackPercent) || 0)),
          uniqueAttackTarget: creatureByBaseName.uniqueAttackTarget === 'all' || creatureByBaseName.uniqueAttackTarget === 'multi' ? 'all' : 'single',
          uniqueAttackEffectType: creatureByBaseName.uniqueAttackEffectType || 'none',
          uniqueAttackEffectPercent: Math.max(0, Math.min(200, Number(creatureByBaseName.uniqueAttackEffectPercent) || 0)),
          uniqueAttackEffectDuration: Math.max(0, Math.min(10, Number(creatureByBaseName.uniqueAttackEffectDuration) || 0)),
          uniqueAttackEffect: creatureByBaseName.uniqueAttackEffect || '',
        }
      : {};

    // Re-verify the free-creation allowance and coin cost against the real,
    // server-counted card total — never trust the client's coin/limit checks.
    // Explicit high limit: the SDK default cap (~50) would silently truncate a
    // larger collection, undercounting here and granting free creations beyond the
    // daily allowance. 1000 is far beyond any realistic collection (5 decks).
    const ownedCards = await base44.entities.Card.filter({ ownerId: user.id }, undefined, 1000);
    const status = getCreationStatus(user, ownedCards.length);
    if (status.needsPayment && (user.coins || 0) < EXTRA_CREATURE_COST) {
      return Response.json({ error: 'Not enough coins' }, { status: 400 });
    }

    // Validate deckId belongs to the user — never trust the client's deckId,
    // which could point at another user's deck or an arbitrary string. Deck RLS
    // (created_by_id === user.id) means a foreign deck returns nothing here.
    if (!deckId) return Response.json({ error: 'deckId is required' }, { status: 400 });
    let deck = null;
    try { deck = await base44.entities.Deck.get(deckId); } catch {}
    if (!deck) return Response.json({ error: 'Invalid deck' }, { status: 400 });

    const card = await base44.entities.Card.create({ ...safeCardData, ...uniqueAttackFields, deckId, ownerId: user.id });

    const userUpdate = buildCreationUpdate(user, ownedCards.length);
    const updatedUser = Object.keys(userUpdate).length ? await base44.auth.updateMe(userUpdate) : user;

    return Response.json({ card, user: updatedUser });
  } catch (error) {
    console.error('createGeneratedCard error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});