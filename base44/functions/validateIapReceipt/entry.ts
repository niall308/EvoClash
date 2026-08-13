import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { findIapProductByPlatformId } from '../../shared/iapProducts.ts';
import { verifyAppleReceipt, verifyGooglePurchase, mockEnabled, appleConfigured, googleConfigured } from '../../shared/iapValidation.ts';
import { recordIapPurchase } from '../../shared/iapEntitlement.ts';

// POST /iap/validate  { platform: 'apple'|'google', productId, receiptOrToken, userId? }
// Validates the native receipt with Apple/Google (or accepts it under IAP_MOCK_VALIDATION),
// records an idempotent IapPurchase, and grants the LC coins. Without platform
// secrets it returns 503 'not configured' (credential-gated by design).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { platform, productId, receiptOrToken } = await req.json().catch(() => ({}));
    if (!platform || !productId || !receiptOrToken) {
      return Response.json({ error: 'platform, productId, receiptOrToken required' }, { status: 400 });
    }
    if (platform !== 'apple' && platform !== 'google') {
      return Response.json({ error: 'platform must be apple|google' }, { status: 400 });
    }
    const product = findIapProductByPlatformId(productId);
    if (!product) return Response.json({ error: 'unknown product' }, { status: 400 });

    // Dev/sandbox convenience: accept any receipt for the productId without
    // calling Apple/Google. Explicitly off by default for safety.
    if (mockEnabled()) {
      const mockTx = `mock_${platform}_${Date.now()}`;
      const res = await recordIapPurchase(base44, {
        userId: user.id,
        product,
        platform,
        transactionId: mockTx,
        purchaseToken: platform === 'google' ? receiptOrToken : '',
        purchaseDate: new Date().toISOString(),
        consumed: true,
        acknowledged: true,
        rawResponse: { mock: true, productId },
      });
      return Response.json({ valid: true, mock: true, ...res });
    }

    let result;
    if (platform === 'apple') {
      if (!appleConfigured()) return Response.json({ error: 'APPLE_SHARED_SECRET not configured' }, { status: 503 });
      result = await verifyAppleReceipt(receiptOrToken, product.appleProductId);
    } else {
      if (!googleConfigured()) return Response.json({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON not configured' }, { status: 503 });
      result = await verifyGooglePurchase(product.googleProductId, receiptOrToken);
    }
    if (!result.valid) return Response.json({ valid: false, error: result.error || 'validation failed' }, { status: 400 });

    const recorded = await recordIapPurchase(base44, {
      userId: user.id,
      product,
      platform,
      transactionId: result.transactionId,
      purchaseToken: platform === 'google' ? receiptOrToken : '',
      purchaseDate: result.purchaseDate,
      expiryDate: result.expiryDate,
      // Apple: StoreKit finishes the transaction client-side for consumables.
      // Google: the client calls /iap/acknowledge next to consume/acknowledge.
      consumed: platform === 'apple',
      acknowledged: platform === 'apple',
      rawResponse: result.raw,
    });
    return Response.json({ valid: true, sandbox: result.sandbox, ...recorded });
  } catch (error) {
    console.error('validateIapReceipt error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}