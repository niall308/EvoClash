// Shared helper for enforcing the "up to 10 concurrent offline battles" cap,
// used by both sendBattleInvite and respondBattleRequest.
export const MAX_ACTIVE_OFFLINE_MATCHES = 10;

export async function countActiveOfflineMatches(base44: any, userId: string): Promise<number> {
  const [asP1, asP2] = await Promise.all([
    base44.asServiceRole.entities.PvpMatch.filter({ player1Id: userId, matchType: 'offline', status: 'active' }),
    base44.asServiceRole.entities.PvpMatch.filter({ player2Id: userId, matchType: 'offline', status: 'active' }),
  ]);
  return asP1.length + asP2.length;
}