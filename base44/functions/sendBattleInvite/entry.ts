import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { toUserId, toUserName } = await req.json();
    if (!toUserId) return Response.json({ error: 'Missing toUserId' }, { status: 400 });
    if (toUserId === user.id) return Response.json({ error: 'You cannot battle yourself' }, { status: 400 });

    const battleRequest = await base44.entities.BattleRequest.create({
      toUserId,
      toUserName: toUserName || '',
      fromUserName: user.username || user.full_name,
    });

    const toUser = await base44.asServiceRole.entities.User.get(toUserId).catch(() => null);
    if (toUser?.email && toUser.notifyBattleInvites !== false) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: toUser.email,
        subject: `${user.username || user.full_name} wants to battle you!`,
        body: `Hi ${toUser.full_name || 'Champion'},\n\n${user.username || user.full_name} has challenged you to a battle in EvoClash. Open the app to accept or decline within 24 hours.\n\n— The EvoClash Team`,
      });
    }

    return Response.json({ battleRequest });
  } catch (error) {
    console.error('sendBattleInvite error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});