import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Server-side guard for the Unique Attack feature in PvP. Records that a player
// used a given card's unique attack on the shared PvpMatch record
// (PvpMatch.usedUniqueAttacks), so the attack cannot be replayed by a tampered
// client or resubmitted after a reconnect. Both clients read the same PvpMatch
// record, so this array IS the authoritative usage state — client `used` flags
// are presentation-only and must honor this.
//
// Idempotent: a second call for the same (matchCode, cardId) returns
// alreadyUsed=true and does NOT grant another use. $addToSet is atomic, so
// concurrent calls from both clients cannot double-add.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { matchCode, cardId } = await req.json().catch(() => ({}));
    if (!matchCode || !cardId) return Response.json({ error: 'matchCode and cardId required' }, { status: 400 });

    const matches = await base44.entities.PvpMatch.filter({ code: matchCode });
    const match = matches[0];
    if (!match) return Response.json({ error: 'match not found' }, { status: 404 });
    if (match.player1Id !== user.id && match.player2Id !== user.id) {
      return Response.json({ error: 'forbidden' }, { status: 403 });
    }
    // The card id must belong to the caller's side so a player can't mark the
    // opponent's unique attack as used.
    const myPool = match.player1Id === user.id ? match.player1Pool : match.player2Pool;
    const myHand = match.player1Id === user.id ? match.player1Hand : match.player2Hand;
    const ownsCard = [...(myPool || []), ...(myHand || []), match.player1Card, match.player2Card]
      .some((c) => c && c.id === cardId);
    if (!ownsCard) return Response.json({ error: 'card not owned by caller' }, { status: 403 });
    if (match.status !== 'active') return Response.json({ error: 'match not active' }, { status: 409 });

    const used: string[] = match.usedUniqueAttacks || [];
    const alreadyUsed = used.includes(cardId);
    if (!alreadyUsed) {
      await base44.asServiceRole.entities.PvpMatch.updateMany(
        { id: match.id },
        { $addToSet: { usedUniqueAttacks: cardId } }
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