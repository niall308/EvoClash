import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Admin-only reconciliation: lists users with Stripe purchases but no platform
// IAP records (stripeOnly) and users with both (both). Drives the
// artifacts/iap/reconciliation_report.csv deliverable so you can decide per-case
// action before/after migration. Read-only.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const txs = await base44.asServiceRole.entities.CoinTransaction.list('-created_date', 1000);
    const iap = await base44.asServiceRole.entities.IapPurchase.list('-created_date', 1000);

    const fulfilled = txs.filter((t: any) => (t.coinsAdded || 0) > 0);
    const stripeByUser = new Map<string, number>();
    for (const t of fulfilled) stripeByUser.set(t.created_by_id, (stripeByUser.get(t.created_by_id) || 0) + 1);

    const platformIap = iap.filter((p: any) => p.platform === 'apple' || p.platform === 'google');
    const iapByUser = new Map<string, number>();
    for (const p of platformIap) iapByUser.set(p.userId, (iapByUser.get(p.userId) || 0) + 1);

    const rows = (uids: string[]) => uids.map((uid) => ({
      userId: uid,
      stripePurchases: stripeByUser.get(uid) || 0,
      iapPurchases: iapByUser.get(uid) || 0,
    }));

    const stripeUserIds = [...stripeByUser.keys()];
    const stripeOnly = rows(stripeUserIds.filter((u) => !iapByUser.has(u)));
    const both = rows(stripeUserIds.filter((u) => iapByUser.has(u)));

    return Response.json({
      stripeOnly,
      both,
      totals: { stripeOnly: stripeOnly.length, both: both.length, migratedRecords: iap.filter((p: any) => p.platform === 'migrated_from_stripe').length },
    });
  } catch (error) {
    console.error('iapReconcileReport error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}