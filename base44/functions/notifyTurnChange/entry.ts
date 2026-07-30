import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Emails the other player when it becomes their turn in an offline PvP match —
// offline matches have no time limit so players may not have the app open.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { matchCode } = await req.json();
    const matches = await base44.entities.PvpMatch.filter({ code: matchCode });
    const match = matches[0];
    if (!match) return Response.json({ error: 'Match not found' }, { status: 404 });
    if (match.matchType !== 'offline' || match.status !== 'active') return Response.json({ status: 'skipped' });
    if (user.id !== match.player1Id && user.id !== match.player2Id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const recipientId = match.turn === 'player1' ? match.player1Id : match.player2Id;
    if (recipientId === user.id) return Response.json({ status: 'skipped' });

    const recipient = await base44.asServiceRole.entities.User.get(recipientId);
    if (!recipient?.email || recipient.notifyEmails !== true || recipient.notifyYourTurn !== true) {
      return Response.json({ status: 'skipped' });
    }

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: recipient.email,
      subject: "It's your turn in EvoClash!",
      body: `Hi ${recipient.full_name || 'Champion'},\n\nIt's your turn in your offline battle against ${user.username || user.full_name}. Open the app to make your move!\n\n— The EvoClash Team`,
    });

    return Response.json({ status: 'sent' });
  } catch (error) {
    console.error('notifyTurnChange error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});