// Single source of truth for in-app purchase product metadata, shared by the
// IAP backend functions. Mirrors COIN_PACKS (base44/shared/coinPacks.ts) so the
// coin packs sold via Stripe on web are the SAME goods sold via StoreKit
// (Apple) / Google Play Billing (native).
//
// Platform product IDs use the reverse-DNS convention com.evoclash.<pack>.

export interface IapProduct {
  packId: string;           // internal id shared with COIN_PACKS
  displayName: string;
  coins: number;
  priceUsd: number;
  stripeProductId: string;   // Stripe product id (web only)
  stripePriceId: string;     // Stripe price id used by createCoinCheckout
  appleProductId: string;    // App Store Connect product id
  googleProductId: string;   // Play Console SKU id
  type: "consumable" | "non-consumable" | "subscription";
  applePricePoint: string;   // suggested Apple price point (USD)
  googlePricePoint: string;  // suggested Google price (USD)
}

export const IAP_PRODUCTS: IapProduct[] = [
  {
    packId: "pack_small",
    displayName: "25,000 LC Pack",
    coins: 25000,
    priceUsd: 2,
    stripeProductId: "prod_UvWeHtPvWo6gcZ",
    stripePriceId: "price_1TwkTYG6EWWnTFwIy8E6Je4P",
    appleProductId: "com.evoclash.coin_pack_small",
    googleProductId: "coin_pack_small",
    type: "consumable",
    applePricePoint: "USD 1.99 (Apple price point)",
    googlePricePoint: "USD 1.99",
  },
  {
    packId: "pack_medium",
    displayName: "80,000 LC Pack",
    coins: 80000,
    priceUsd: 6,
    stripeProductId: "prod_UvWerEbK9bnPWp",
    stripePriceId: "price_1TwkTYG6EWWnTFwIT7o7f7N7",
    appleProductId: "com.evoclash.coin_pack_medium",
    googleProductId: "coin_pack_medium",
    type: "consumable",
    applePricePoint: "USD 5.99 (Apple price point)",
    googlePricePoint: "USD 5.99",
  },
  {
    packId: "pack_large",
    displayName: "175,000 LC Pack",
    coins: 175000,
    priceUsd: 12,
    stripeProductId: "prod_UvWeBlMIU5XSNO",
    stripePriceId: "price_1TwkTYG6EWWnTFwICvABS9RW",
    appleProductId: "com.evoclash.coin_pack_large",
    googleProductId: "coin_pack_large",
    type: "consumable",
    applePricePoint: "USD 11.99 (Apple price point)",
    googlePricePoint: "USD 11.99",
  },
];

export function findIapProductByPackId(packId: string): IapProduct | undefined {
  return IAP_PRODUCTS.find((p) => p.packId === packId);
}

export function findIapProductByPlatformId(platformId: string): IapProduct | undefined {
  return IAP_PRODUCTS.find(
    (p) => p.appleProductId === platformId || p.googleProductId === platformId
  );
}