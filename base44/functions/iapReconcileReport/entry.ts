import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Admin-only reconciliation. Returns DETAILED per-transaction rows (one per
// CoinTransaction) for pre-migration review, plus the stripeOnly/both
// overlap summary. Each row classifies the transaction as purchase / refund /
// dispute / deduction so you can exclude refunds/test txns before approving
// migrateStripeToIap. The CSV artifact (artifacts/iap/reconciliation_report.csv)
// is generated from this JSON output by the builder, not by this function.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const txs = await base44.asServiceRole.entities.CoinTransaction.list('-created_date', 1000);
    const iap = await base44.asServiceRole.entities.IapPurchase.list('-created_date', 1000);

    // Join user emails for identification.
    const userIds = [...new Set(txs.map((t: any) => t.created_by_id).filter(Boolean))];
    const users = await Promise.all(userIds.map((id: string) => base44.asServiceRole.entities.User.get(id).catch(() => null)));
    const emailMap = new Map();
    users.forEach((u: any) => { if (u) emailMap.set(u.id, u.email || ''); });

    const classify = (t: any): string => {
      const sid = String(t.sessionId || '');
      if (sid.startsWith('refund:')) return 'refund';
      if (sid.startsWith('dispute:')) return 'dispute';
      if ((t.coinsAdded || 0) < 0) return 'deduction';
      return 'purchase';
    };

    const transactions = txs.map((t: any) => ({
      userId: t.created_by_id,
      email: emailMap.get(t.created_by_id) || '',
      packId: t.packId || '',
      priceUsd: t.priceUsd || 0,
      coinsAdded: t.coinsAdded || 0,
      oldCoinTotal: t.oldCoinTotal ?? null,
      newCoinTotal: t.newCoinTotal ?? null,
      stripeSessionId: t.sessionId || '',
      type: classify(t),
      date: t.created_date || '',
    }));

    const fulfilled = txs.filter((t: any) => (t.coinsAdded || 0) > 0);
    const stripeUserIds = new Set(fulfilled.map((t: any) => t.created_by_id));
    const iapUserIds = new Set(iap.filter((p: any) => p.platform === 'apple').map((p: any) => p.userId));
    const stripeOnly = [...stripeUserIds].filter((u: string) => !iapUserIds.has(u));
    const both = [...stripeUserIds].filter((u: string) => iapUserIds.has(u));

    return Response.json({
      transactions,
      stripeOnly,
      both,
      totals: {
        transactions: transactions.length,
        purchases: transactions.filter((r: any) => r.type === 'purchase').length,
        refunds: transactions.filter((r: any) => r.type === 'refund' || r.type === 'dispute' || r.type === 'deduction').length,
        stripeOnly: stripeOnly.length,
        both: both.length,
        appleRecords: iap.filter((p: any) => p.platform === 'apple').length,
        migratedRecords: iap.filter((p: any) => p.platform === 'migrated_from_stripe').length,
      },
    });
  } catch (error) {
    console.error('iapReconcileReport error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}