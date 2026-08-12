import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Starts a server-side AI-battle session. Enforces single-active-per-user (closes
// the concurrent-match reward race + the dodge-by-reload vector): any prior active
// session is closed as `abandoned` (no rewards, no loss), then this one is created.
// Idempotent on matchId (handles dev StrictMode double-invoke). The session is the
// key finalizeAIBattle uses to grant rewards exactly once.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { matchId, difficulty, opponentName } = await req.json().catch(() => ({}));
    if (!matchId) return Response.json({ error: 'matchId required' }, { status: 400 });

    const existing = await base44.asServiceRole.entities.AiMatch.filter({ matchId });
    if (existing[0]) {
      return Response.json({ matchId, opponentName: existing[0].opponentName || opponentName || 'AI', resumed: true });
    }

    // Single-active: close any prior active session for this user as abandoned.
    const active = await base44.asServiceRole.entities.AiMatch.filter({ userId: user.id, status: 'active' });
    const now = new Date().toISOString();
    if (active.length) {
      await Promise.all(
        active.map((m) =>
          base44.asServiceRole.entities.AiMatch.update(m.id, { status: 'abandoned', finishedAt: now })
        )
      );
    }

    await base44.asServiceRole.entities.AiMatch.create({
      userId: user.id,
      matchId,
      difficulty: difficulty || 'Normal',
      status: 'active',
      startedAt: now,
      opponentName: opponentName || 'AI',
    });

    return Response.json({ matchId, opponentName: opponentName || 'AI' });
  } catch (error) {
    console.error('startAiMatch error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});