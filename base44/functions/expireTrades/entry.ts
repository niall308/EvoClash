import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Marks pending trades older than 1 week as expired, and permanently
// deletes trades that have been expired for more than 30 days.
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

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const expireResult = await base44.asServiceRole.entities.TradeRequest.updateMany(
      { status: 'pending', created_date: { $lt: oneWeekAgo } },
      { $set: { status: 'expired' } }
    );

    const deleteResult = await base44.asServiceRole.entities.TradeRequest.deleteMany({
      status: 'expired',
      updated_date: { $lt: thirtyDaysAgo },
    });

    return Response.json({
      expired: expireResult?.updated || 0,
      deleted: deleteResult?.deleted || 0,
    });
  } catch (error) {
    console.error('expireTrades error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});