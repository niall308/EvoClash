import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getEstDateString } from '../../shared/dailyRewards.ts';

// Emails users whose daily reward is ready to claim again (once per day).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const user = await base44.auth.me().catch(() => null);
    const isAdmin = user && user.role === 'admin';
    const cronSecret = Deno.env.get('CRON_SECRET');
    const isAuthorizedCron = !!cronSecret && body?.cronToken === cronSecret;
    if (!isAdmin && !isAuthorizedCron) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = getEstDateString();
    const allUsers = await base44.asServiceRole.entities.User.list();

    const toNotify = allUsers.filter(
      (u) =>
        u.email &&
        u.notifyDailyRewardReady !== false &&
        u.lastDailyRewardClaimedAt !== today &&
        u.lastDailyRewardNotifiedAt !== today
    );

    for (const u of toNotify) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: u.email,
        subject: 'Your daily reward is ready!',
        body: `Hi ${u.full_name || 'Champion'},\n\nYour daily LC reward is ready to claim in EvoClash. Open the app to collect your coins!\n\n— The EvoClash Team`,
      });
      await base44.asServiceRole.entities.User.update(u.id, { lastDailyRewardNotifiedAt: today });
    }

    return Response.json({ notified: toNotify.length });
  } catch (error) {
    console.error('notifyDailyRewardReady error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});