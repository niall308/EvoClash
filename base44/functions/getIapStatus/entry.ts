import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// GET /iap/status  (no params; reads the calling user's own purchases via RLS)
// Returns the caller's active entitlements + purchase history. Powers the
// client "Restore Purchases" flow and `iapManager.restorePurchases()`.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const purchases = await base44.entities.IapPurchase.filter({ userId: user.id }, '-created_date', 200);
    return Response.json({ entitlements: purchases, coins: user.coins || 0 });
  } catch (error) {
    console.error('getIapStatus error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}