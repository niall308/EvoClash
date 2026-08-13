import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { findIapProductByAppleId } from '../../shared/iapProducts.ts';

// POST /iap/acknowledge  { platform: 'apple', productId, transactionId? }
// Apple-only. For StoreKit consumables the client finishes the transaction
// via SKPaymentQueue; the server only marks the stored IapPurchase record as
// consumed+acknowledged for bookkeeping. Idempotent and safe to call
// repeatedly. (Android/Google Play is not supported.)
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { productId, transactionId } = await req.json().catch(() => ({}));
    if (!productId) return Response.json({ error: 'productId required' }, { status: 400 });
    const product = findIapProductByAppleId(productId);
    if (!product) return Response.json({ error: 'unknown product' }, { status: 400 });

    let matches;
    if (transactionId) {
      matches = await base44.asServiceRole.entities.IapPurchase.filter({
        userId: user.id,
        platform: 'apple',
        transactionId,
      });
    } else {
      matches = await base44.asServiceRole.entities.IapPurchase.filter(
        { userId: user.id, platform: 'apple', productId },
        '-created_date',
        1
      );
    }
    if (matches.length) {
      await base44.asServiceRole.entities.IapPurchase.update(matches[0].id, {
        consumed: true,
        acknowledged: true,
      });
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error('acknowledgeIapPurchase error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}