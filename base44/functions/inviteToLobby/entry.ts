import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { lobbyId, toUserId } = await req.json();
    if (!lobbyId || !toUserId) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Only the host of their own open lobby can send invites for it.
    const lobbyMatches = await base44.entities.GameLobby.filter({ id: lobbyId, created_by_id: user.id });
    const lobby = lobbyMatches[0];
    if (!lobby) return Response.json({ error: 'Lobby not found' }, { status: 404 });
    if (lobby.status !== 'open') return Response.json({ error: 'Lobby is no longer open' }, { status: 400 });

    // Recipient must be a real, existing registered user (not an arbitrary string).
    const recipient = await base44.asServiceRole.entities.User.get(toUserId);
    if (!recipient) return Response.json({ error: 'Player not found' }, { status: 404 });

    // Fixed, server-controlled template — subject/body are never client-supplied.
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: recipient.email,
      subject: "You've been invited to a lobby!",
      body: `You've been invited to join a lobby. Enter this code in the app to join: ${lobby.code}`,
    });

    return Response.json({ status: 'sent' });
  } catch (error) {
    console.error('inviteToLobby error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});