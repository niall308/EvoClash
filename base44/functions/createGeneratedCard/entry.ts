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

    // Re-verify the free-creation allowance and coin cost against the real,
    // server-counted card total — never trust the client's coin/limit checks.
    const ownedCards = await base44.entities.Card.filter({ ownerId: user.id });
    const status = getCreationStatus(user, ownedCards.length);
    if (status.needsPayment && (user.coins || 0) < EXTRA_CREATURE_COST) {
      return Response.json({ error: 'Not enough coins' }, { status: 400 });
    }

    const card = await base44.entities.Card.create({ ...safeCardData, deckId, ownerId: user.id });

    const userUpdate = buildCreationUpdate(user, ownedCards.length);
    const updatedUser = Object.keys(userUpdate).length ? await base44.auth.updateMe(userUpdate) : user;

    return Response.json({ card, user: updatedUser });
  } catch (error) {
    console.error('createGeneratedCard error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});