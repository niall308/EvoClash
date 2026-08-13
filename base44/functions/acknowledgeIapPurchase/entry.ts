import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { findIapProductByPlatformId } from '../../shared/iapProducts.ts';
import { consumeGooglePurchase, acknowledgeGooglePurchase, mockEnabled, googleConfigured } from '../../shared/iapValidation.ts';

// POST /iap/acknowledge  { platform, productId, purchaseToken }
// Consumes (consumables) or acknowledges (non-consumables/subscriptions) a
// Google purchase server-side, then marks the stored IapPurchase
// consumed/acknowledged. Apple consumables are finished client-side by
// StoreKit so this is a no-op for Apple. Idempotent: safe to call repeatedly.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { platform, productId, purchaseToken } = await req.json().catch(() => ({}));
    if (platform !== 'google' && platform !== 'apple') {
      return Response.json({ error: 'platform must be apple|google' }, { status: 400 });
    }
    const product = findIapProductByPlatformId(productId);
    if (!product) return Response.json({ error: 'unknown product' }, { status: 400 });

    let ackResult: any = { acknowledged: true };

    if (platform === 'google') {
      if (mockEnabled()) {
        ackResult = { mocked: true };
      } else if (!googleConfigured()) {
        return Response.json({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON not configured' }, { status: 503 });
      } else if (!purchaseToken) {
        return Response.json({ error: 'purchaseToken required for google' }, { status: 400 });
      } else {
        ackResult = product.type === 'consumable'
          ? await consumeGooglePurchase(product.googleProductId, purchaseToken)
          : await acknowledgeGooglePurchase(product.googleProductId, purchaseToken);
      }
    }

    // Mark the matching stored purchase.
    const matches = await base44.asServiceRole.entities.IapPurchase.filter({
      userId: user.id,
      platform,
      purchaseToken: purchaseToken || '',
    });
    if (matches.length) {
      await base44.asServiceRole.entities.IapPurchase.update(matches[0].id, {
        consumed: true,
        acknowledged: true,
      });
    }

    return Response.json({ ok: true, ...ackResult });
  } catch (error) {
    console.error('acknowledgeIapPurchase error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}