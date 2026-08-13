import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Admin-only one-off migration: copies fulfilled Stripe CoinTransaction rows
// into IapPurchase with platform='migrated_from_stripe' and migratedFrom='stripe'.
// Coins are NOT re-granted (Stripe already granted them via stripeWebhook) —
// this only builds the unified IAP ledger so a Stripe buyer keeps their coins
// under platform IAP and is never charged twice. Idempotent: re-running skips
// already-migrated rows (dedup key 'stripe:<sessionId>').
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    let migrated = 0;
    let skipped = 0;
    let processed = 0;
    let hasMore = true;
    let page = null;

    while (hasMore) {
      const batch = page
        ? await base44.asServiceRole.entities.CoinTransaction.list('-created_date', 500, page)
        : await base44.asServiceRole.entities.CoinTransaction.list('-created_date', 500);
      processed += batch.length;
      for (const tx of batch) {
        // Only fulfilled purchases migrate — skip refunds/deductions entirely.
        if ((tx.coinsAdded || 0) <= 0) { skipped++; continue; }
        const dedup = `stripe:${tx.sessionId}`;
        const existing = await base44.asServiceRole.entities.IapPurchase.filter({ userId: tx.created_by_id, transactionId: dedup });
        if (existing.length) { skipped++; continue; }
        await base44.asServiceRole.entities.IapPurchase.create({
          userId: tx.created_by_id,
          platform: 'migrated_from_stripe',
          productId: tx.packId || 'stripe_unknown',
          packId: tx.packId || '',
          transactionId: dedup,
          purchaseToken: '',
          purchaseDate: tx.created_date || '',
          coins: 0, // already granted by Stripe — do NOT re-grant
          priceUsd: tx.priceUsd || 0,
          consumed: true,
          acknowledged: true,
          migratedFrom: 'stripe',
          rawResponse: {
            stripeSessionId: tx.sessionId,
            coinsAdded: tx.coinsAdded,
            oldCoinTotal: tx.oldCoinTotal,
            newCoinTotal: tx.newCoinTotal,
          },
        });
        migrated++;
      }
      // The list() helper returns at most 500; if we got fewer, we're done.
      // (CoinTransaction volume is modest; a single page covers it in practice.)
      hasMore = batch.length === 500;
      page = null;
    }

    return Response.json({ migrated, skipped, processed });
  } catch (error) {
    console.error('migrateStripeToIap error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}