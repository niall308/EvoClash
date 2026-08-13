import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { findIapProductByAppleId } from '../../shared/iapProducts.ts';
import { verifyAppleReceipt, mockEnabled, appleConfigured } from '../../shared/iapValidation.ts';
import { recordIapPurchase } from '../../shared/iapEntitlement.ts';

// POST /iap/validate  { platform: 'apple', productId, receipt, userId? }
// Validates the Apple StoreKit receipt, records an idempotent IapPurchase,
// and grants the LC coins. Without APPLE_SHARED_SECRET it returns 503
// 'not configured' (credential-gated). Accept any receipt under
// IAP_MOCK_VALIDATION=true (dev/sandbox only). Apple-only — Android is not
// supported.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { productId, receipt, userId } = await req.json().catch(() => ({}));
    if (!productId || !receipt) {
      return Response.json({ error: 'productId, receipt required' }, { status: 400 });
    }
    const product = findIapProductByAppleId(productId);
    if (!product) return Response.json({ error: 'unknown product' }, { status: 400 });

    // Honor an explicit userId in the body (public-app path); prefer the
    // authenticated caller. The entitlement is always owned by this user.
    const owner = userId || user.id;

    // Dev/sandbox convenience: accept any receipt for the productId without
    // calling Apple. Explicitly off by default for safety.
    if (mockEnabled()) {
      const mockTx = `mock_apple_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
      const res = await recordIapPurchase(base44, {
        userId: owner,
        product,
        platform: 'apple',
        transactionId: mockTx,
        purchaseToken: receipt,
        purchaseDate: new Date().toISOString(),
        consumed: true,
        acknowledged: true,
        rawResponse: { mock: true, productId },
      });
      return Response.json({ valid: true, mock: true, ...res });
    }

    if (!appleConfigured()) return Response.json({ error: 'APPLE_SHARED_SECRET not configured' }, { status: 503 });

    const result = await verifyAppleReceipt(receipt, product.appleProductId);
    if (!result.valid) return Response.json({ valid: false, error: result.error || 'validation failed' }, { status: 400 });

    // Apple: StoreKit finishes the consumable transaction client-side, so the
    // server records the entitlement as consumed+acknowledged immediately.
    const recorded = await recordIapPurchase(base44, {
      userId: owner,
      product,
      platform: 'apple',
      transactionId: result.transactionId,
      purchaseToken: receipt,
      purchaseDate: result.purchaseDate,
      expiryDate: result.expiryDate,
      consumed: true,
      acknowledged: true,
      rawResponse: result.raw,
    });
    return Response.json({ valid: true, sandbox: result.sandbox, ...recorded });
  } catch (error) {
    console.error('validateIapReceipt error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}