// Idempotently records a validated Apple IAP purchase and grants the LC
// entitlement. Dedup anchor: (userId, platform, transactionId). A replayed
// validation with the same transaction is a no-op (alreadyValid: true), so
// coins can never be minted twice from a replayed receipt.
import type { IapProduct } from "./iapProducts.ts";

export interface EntitlementResult {
  alreadyValid: boolean;
  purchase?: any;
  coinsGranted?: number;
  newCoinTotal?: number;
}

export async function recordIapPurchase(base44: any, opts: {
  userId: string;
  product: IapProduct;
  platform: "apple";
  transactionId: string;
  purchaseToken?: string; // raw Apple receipt base64
  purchaseDate?: string;
  expiryDate?: string;
  consumed: boolean;
  acknowledged: boolean;
  rawResponse: any;
}): Promise<EntitlementResult> {
  if (!opts.transactionId) throw new Error("transactionId required");

  const existing = await base44.asServiceRole.entities.IapPurchase.filter({
    userId: opts.userId,
    platform: opts.platform,
    transactionId: opts.transactionId,
  });
  if (existing.length) return { alreadyValid: true, purchase: existing[0] };

  const user = await base44.asServiceRole.entities.User.get(opts.userId);
  const newCoinTotal = (user?.coins || 0) + opts.product.coins;
  await base44.asServiceRole.entities.User.update(opts.userId, { coins: newCoinTotal });

  const purchase = await base44.asServiceRole.entities.IapPurchase.create({
    userId: opts.userId,
    platform: opts.platform,
    productId: opts.product.appleProductId,
    packId: opts.product.packId,
    transactionId: opts.transactionId,
    purchaseToken: opts.purchaseToken || "",
    purchaseDate: opts.purchaseDate || new Date().toISOString(),
    expiryDate: opts.expiryDate || "",
    coins: opts.product.coins,
    priceUsd: opts.product.priceUsd,
    consumed: opts.consumed,
    acknowledged: opts.acknowledged,
    migratedFrom: "",
    rawResponse: opts.rawResponse || {},
  });
  return { alreadyValid: false, purchase, coinsGranted: opts.product.coins, newCoinTotal };
}