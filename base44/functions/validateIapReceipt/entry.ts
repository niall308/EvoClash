import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { findIapProductByAppleId } from '../../shared/iapProducts.ts';
import { verifyAppleReceipt, verifyAppleTransaction, mockEnabled, appleConfigured, appleServerApiConfigured } from '../../shared/iapValidation.ts';
import { recordIapPurchase } from '../../shared/iapEntitlement.ts';

// POST /iap/validate  { platform: 'apple', productId, receipt?, transactionId?, userId? }
// Two Apple credential modes:
//   (A) receipt blob (StoreKit 1)  → verifyAppleReceipt, needs APPLE_SHARED_SECRET
//   (B) transactionId (StoreKit 2) → verifyAppleTransaction, needs APPLE_ISSUER_ID /
//       APPLE_KEY_ID / APPLE_PRIVATE_KEY_BASE64
// The function picks the path that matches the field + the credentials present,
// and returns a clear 503 explaining exactly which secret is missing when the
// chosen path can't run. Records an idempotent IapPurchase + grants LC coins.
// IAP_MOCK_VALIDATION=true bypasses Apple entirely (dev/sandbox only).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { productId, receipt, transactionId, userId } = await req.json().catch(() => ({}));
    if (!productId) return Response.json({ error: 'productId required' }, { status: 400 });
    if (!receipt && !transactionId) return Response.json({ error: 'receipt or transactionId required' }, { status: 400 });
    const product = findIapProductByAppleId(productId);
    if (!product) return Response.json({ error: 'unknown product' }, { status: 400 });

    // Only admins may credit a purchase to a different account; everyone else
    // is pinned to their own identity so coins/entitlements can't be redirected.
    const owner = (userId && user.role === 'admin') ? userId : user.id;

    if (mockEnabled()) {
      const mockTx = `mock_apple_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
      const res = await recordIapPurchase(base44, {
        userId: owner,
        product,
        platform: 'apple',
        transactionId: mockTx,
        purchaseToken: receipt || transactionId || '',
        purchaseDate: new Date().toISOString(),
        consumed: true,
        acknowledged: true,
        rawResponse: { mock: true, productId, transactionId },
      });
      return Response.json({ valid: true, mock: true, ...res });
    }

    let result;
    if (transactionId) {
      if (!appleServerApiConfigured()) {
        return Response.json({ error: 'App Store Server API credentials not configured (need APPLE_ISSUER_ID / APPLE_KEY_ID / APPLE_PRIVATE_KEY_BASE64) for the transactionId path' }, { status: 503 });
      }
      result = await verifyAppleTransaction(transactionId, product.appleProductId);
    } else {
      // receipt blob path
      if (!appleConfigured()) {
        return Response.json({ error: 'APPLE_SHARED_SECRET not configured for receipt-blob validation; add it, or use the transactionId path (StoreKit 2) with the App Store Server API credentials' }, { status: 503 });
      }
      result = await verifyAppleReceipt(receipt, product.appleProductId);
    }

    if (!result.valid) return Response.json({ valid: false, error: result.error || 'validation failed' }, { status: 400 });

    const recorded = await recordIapPurchase(base44, {
      userId: owner,
      product,
      platform: 'apple',
      transactionId: result.transactionId,
      purchaseToken: receipt || transactionId || '',
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