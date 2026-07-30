import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Emails the lobby host when someone joins their code-invite lobby.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { lobbyId } = await req.json();
    const lobbies = await base44.entities.GameLobby.filter({ id: lobbyId });
    const lobby = lobbies[0];
    if (!lobby) return Response.json({ error: 'Lobby not found' }, { status: 404 });
    if (lobby.joinedUserId !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const host = await base44.asServiceRole.entities.User.get(lobby.created_by_id);
    if (!host?.email || host.notifyEmails !== true || host.notifyLobbyJoin !== true) {
      return Response.json({ status: 'skipped' });
    }

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: host.email,
      subject: 'Someone joined your lobby!',
      body: `${user.username || user.full_name} joined your EvoClash lobby. Open the app to start the match!`,
    });

    return Response.json({ status: 'sent' });
  } catch (error) {
    console.error('notifyLobbyJoined error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});