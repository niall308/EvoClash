import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Starts a server-side Story Mode battle session. finalizeStoryBattle requires
// an active session that has aged past a playable minimum before granting any
// rewards — this records the start time on the user's StoryProgress so a client
// can't loop finalizeStoryBattle with win=true to mint rewards without playing.
// Only the user's current, unfinished story match can start a session.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { stage, match } = await req.json().catch(() => ({}));
    const s = Number(stage);
    const m = Number(match);
    if (!Number.isInteger(s) || !Number.isInteger(m) || s < 1 || s > 10 || m < 1 || m > 8) {
      return Response.json({ error: 'invalid stage/match' }, { status: 400 });
    }

    const progressList = await base44.asServiceRole.entities.StoryProgress.filter({ userId: user.id });
    const progress = progressList[0];
    if (!progress) return Response.json({ error: 'no story progress' }, { status: 400 });

    const curStage = Number(progress.currentStage) || 1;
    const curMatch = Number(progress.currentMatch) || 1;
    // Admins may start a session for any unplayed stage; everyone else must be at the current match.
    if ((s !== curStage || m !== curMatch) && user.role !== 'admin') {
      return Response.json({ error: 'not your current story match' }, { status: 400 });
    }
    if ((progress.completedMatches || []).includes(`${s}-${m}`)) {
      return Response.json({ error: 'already completed' }, { status: 400 });
    }

    await base44.asServiceRole.entities.StoryProgress.update(progress.id, {
      storyBattleStartedAt: new Date().toISOString(),
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error('startStoryBattle error', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});