import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Internal shared secret used to authorize the scheduled workflow call.
// Not a real API credential - just prevents anonymous callers from hitting this
// endpoint directly. Must match the value passed by the "Expire Battle Requests" workflow.
const CRON_TOKEN = 'ec_cron_9d4f2a7b1c8e6f30a5d9c2b4e7f1a8c3';

// Marks pending battle (rematch) requests older than 24 hours as expired.
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

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const expireResult = await base44.asServiceRole.entities.BattleRequest.updateMany(
      { status: 'pending', created_date: { $lt: twentyFourHoursAgo } },
      { $set: { status: 'expired' } }
    );

    return Response.json({ expired: expireResult?.updated || 0 });
  } catch (error) {
    console.error('expireBattleRequests error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});