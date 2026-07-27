import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { validateCardData } from '../../shared/cardValidation.ts';

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

    const card = await base44.entities.Card.create({ ...safeCardData, deckId, ownerId: user.id });
    return Response.json({ card });
  } catch (error) {
    console.error('createGeneratedCard error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});