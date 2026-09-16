import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Server-side guard for the Unique Attack feature in PvP. Records that a player
// used a given card's unique attack on the PvpMatch session
// (player{1,2}UsedUniqueAttacks), so the attack cannot be replayed after a
// reconnect or by a tampered client — mirroring the AI guard in recordUniqueAttack.
//
// Idempotent + atomic: a second call for the same (match, card) returns
// alreadyUsed=true and does NOT grant another use. $addToSet makes the write
// race-free across concurrent calls. The client tracks `used` locally for
// instant UI and seeds it from this field on reconnect; this call is the
// authoritative record the client must honor on replay.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { matchCode, cardId } = await req.json().catch(() => ({}));
    if (!matchCode || !cardId) {
      return Response.json({ error: 'matchCode and cardId required' }, { status: 400 });
    }

    const matches = await base44.asServiceRole.entities.PvpMatch.filter({ code: matchCode });
    const match = matches[0];
    if (!match) return Response.json({ error: 'match not found' }, { status: 404 });
    if (match.status !== 'active') return Response.json({ error: 'match not active' }, { status: 409 });

    const isP1 = match.player1Id === user.id;
    const isP2 = match.player2Id === user.id;
    if (!isP1 && !isP2) return Response.json({ error: 'forbidden' }, { status: 403 });

    const field = isP1 ? 'player1UsedUniqueAttacks' : 'player2UsedUniqueAttacks';
    const used: string[] = (isP1 ? match.player1UsedUniqueAttacks : match.player2UsedUniqueAttacks) || [];
    const alreadyUsed = used.includes(cardId);
    if (!alreadyUsed) {
      // $addToSet is atomic — no read-modify-write race across concurrent calls.
      await base44.asServiceRole.entities.PvpMatch.updateMany(
        { id: match.id },
        { $addToSet: { [field]: cardId } }
      );
    }
    return Response.json({
      alreadyUsed,
      usedUniqueAttacks: alreadyUsed ? used : [...used, cardId],
    });
  } catch (error) {
    console.error('recordPvpUniqueAttack error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});