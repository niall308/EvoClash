import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Server-side guard for the Unique Attack feature. Records that a player used a
// given card's unique attack on the AI match session (AiMatch.usedUniqueAttacks),
// so the attack cannot be replayed after a reconnect or by a tampered client.
//
// Idempotent: a second call for the same (matchId, cardId) returns alreadyUsed=true
// and does NOT grant another use. The client tracks `used` locally for instant UI;
// this call is the authoritative record the client must honor on rejoin/replay.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { matchId, cardId } = await req.json().catch(() => ({}));
    if (!matchId || !cardId) return Response.json({ error: 'matchId and cardId required' }, { status: 400 });

    const match = (await base44.asServiceRole.entities.AiMatch.filter({ matchId }))[0];
    if (!match) return Response.json({ error: 'match not found' }, { status: 404 });
    if (match.userId !== user.id) return Response.json({ error: 'forbidden' }, { status: 403 });
    if (match.status !== 'active') return Response.json({ error: 'match not active' }, { status: 409 });

    const used: string[] = match.usedUniqueAttacks || [];
    const alreadyUsed = used.includes(cardId);
    if (!alreadyUsed) {
      // $addToSet is atomic — no read-modify-write race across concurrent calls.
      await base44.asServiceRole.entities.AiMatch.updateMany(
        { id: match.id },
        { $addToSet: { usedUniqueAttacks: cardId } }
      );
    }
    return Response.json({
      alreadyUsed,
      usedUniqueAttacks: alreadyUsed ? used : [...used, cardId],
    });
  } catch (error) {
    console.error('recordUniqueAttack error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});