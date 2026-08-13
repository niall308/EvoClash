// Client-side mirror of base44/shared/iapProducts.ts Apple product IDs.
// (The frontend can't import base44/shared/*.ts — that's Deno-only — so the
// store-facing IDs are mirrored here and the manifest JSON is the source of
// truth artifact.) Apple only — no Android/Google Play product IDs.
export const IAP_CATALOG = [
  { packId: "pack_small", displayName: "25,000 LC Pack", coins: 25000, priceUsd: 2, appleProductId: "com.primallegends.coin_pack_small", type: "consumable" },
  { packId: "pack_medium", displayName: "80,000 LC Pack", coins: 80000, priceUsd: 6, appleProductId: "com.primallegends.coin_pack_medium", type: "consumable" },
  { packId: "pack_large", displayName: "175,000 LC Pack", coins: 175000, priceUsd: 12, appleProductId: "com.primallegends.coin_pack_large", type: "consumable" },
];

export function catalogByPackId(packId) {
  return IAP_CATALOG.find((p) => p.packId === packId);
}
export function catalogByAppleId(appleId) {
  return IAP_CATALOG.find((p) => p.appleProductId === appleId);
}