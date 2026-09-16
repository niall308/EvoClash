import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Server-side guard for the Unique Attack feature. Records that a player used a
// given card's unique attack on a match session, so the attack cannot be
// replayed after a reconnect or by a tampered client. Works for BOTH battle
// session types:
//   - AI battles:  { matchId, cardId }  → AiMatch.usedUniqueAttacks ($addToSet)
//   - PvP battles: { matchCode, cardId } → PvpMatch.usedUniqueAttacks ($addToSet)
//
// Idempotent: a second call for the same (session, cardId) returns
// alreadyUsed=true and does NOT grant another use. The client tracks `used`
// locally for instant UI; this call is the authoritative record both clients
// must honor (especially in PvP, where the shared match record syncs the used
// list to the opponent's client via realtime).
const MAX_PERCENT = 200;

function normalizeTarget(t) {
  return t === 'all' || t === 'multi' ? 'all' : 'single';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { matchId, matchCode, cardId } = await req.json().catch(() => ({}));
    if (!cardId) return Response.json({ error: 'cardId required' }, { status: 400 });
    if (!matchId && !matchCode) return Response.json({ error: 'matchId or matchCode required' }, { status: 400 });

    let usedField = 'usedUniqueAttacks';
    let record;
    let isParticipant = false;

    if (matchCode) {
      // PvP path
      const matches = await base44.asServiceRole.entities.PvpMatch.filter({ code: matchCode });
      record = matches[0];
      if (!record) return Response.json({ error: 'match not found' }, { status: 404 });
      isParticipant = record.player1Id === user.id || record.player2Id === user.id;
      if (!isParticipant && user.role !== 'admin') return Response.json({ error: 'forbidden' }, { status: 403 });
      if (record.status !== 'active') return Response.json({ error: 'match not active' }, { status: 409 });
    } else {
      // AI path
      const matches = await base44.asServiceRole.entities.AiMatch.filter({ matchId });
      record = matches[0];
      if (!record) return Response.json({ error: 'match not found' }, { status: 404 });
      if (record.userId !== user.id) return Response.json({ error: 'forbidden' }, { status: 403 });
      if (record.status !== 'active') return Response.json({ error: 'match not active' }, { status: 409 });
    }

    const used: string[] = record[usedField] || [];
    const alreadyUsed = used.includes(cardId);
    if (!alreadyUsed) {
      // $addToSet is atomic — no read-modify-write race across concurrent calls
      // (critical for PvP where two clients may act near-simultaneously).
      const entity = matchCode ? 'PvpMatch' : 'AiMatch';
      await base44.asServiceRole.entities[entity].updateMany(
        { id: record.id },
        { $addToSet: { [usedField]: cardId } }
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