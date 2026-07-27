import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Returns the 20 most recent distinct opponents from the user's finished PvP matches.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [asP1, asP2] = await Promise.all([
      base44.asServiceRole.entities.PvpMatch.filter({ player1Id: user.id }, '-created_date', 50),
      base44.asServiceRole.entities.PvpMatch.filter({ player2Id: user.id }, '-created_date', 50),
    ]);
    const matches = [...asP1, ...asP2].sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());

    const opponents = [];
    const seen = new Set();
    for (const m of matches) {
      const isP1 = m.player1Id === user.id;
      const opponentId = isP1 ? m.player2Id : m.player1Id;
      const opponentName = isP1 ? m.player2Name : m.player1Name;
      if (!opponentId || opponentId === user.id || seen.has(opponentId)) continue;
      seen.add(opponentId);
      opponents.push({ id: opponentId, full_name: opponentName || 'Anonymous' });
      if (opponents.length >= 20) break;
    }

    return Response.json({ opponents });
  } catch (error) {
    console.error('getRecentOpponents error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});