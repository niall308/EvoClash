import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Internal shared secret used to authorize the nightly scheduled workflow call.
// Not a real API credential - just prevents anonymous callers from hitting this
// endpoint directly. Must match the value passed by the "Expire Trade Requests" workflow.
const CRON_TOKEN = 'ec_cron_7f3a1d9c4b2e8f56a0d3c7b1e9f2a4d6';

// Marks pending trades older than 1 week as expired, and permanently
// deletes trades that have been expired for more than 30 days.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const user = await base44.auth.me().catch(() => null);
    const isAdmin = user && user.role === 'admin';
    const isAuthorizedCron = body?.cronToken === CRON_TOKEN;
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