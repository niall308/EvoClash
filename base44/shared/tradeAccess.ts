// Shared access check for trade endpoints. A player may view another player's
// tradeable cards and propose a trade if they are friends OR have recently
// battled that player in a finished PvP match (the "Recent Players" flow).
// Used by getFriendCards and proposeTrade so both gates stay in sync.

export async function canTradeWith(base44, userId, targetId) {
  if (!targetId || targetId === userId) return false;

  // Friend check (RLS-scoped to the caller's own Friend records).
  const friendship = await base44.entities.Friend.filter({ created_by_id: userId, friendUserId: targetId });
  if (friendship.length > 0) return true;

  // Recent finished PvP opponent check (either side of the match).
  const [asP1, asP2] = await Promise.all([
    base44.asServiceRole.entities.PvpMatch.filter({ player1Id: userId, player2Id: targetId, status: 'finished' }, '-created_date', 1),
    base44.asServiceRole.entities.PvpMatch.filter({ player1Id: targetId, player2Id: userId, status: 'finished' }, '-created_date', 1),
  ]);
  return asP1.length > 0 || asP2.length > 0;
}