# EvoClash — In-App Purchase (IAP) layer

Native in-app purchases for the iOS/Android builds of EvoClash, plus a
server-side receipt-validation + entitlement ledger that works the moment any
client can hand us a receipt. Stripe stays for the **web** build only.

> **Platform status (read first):** Base44's iOS/Android builds are a
> lightweight native wrapper around a WebView of the published web app, and
> **do not currently expose a StoreKit / Google Play Billing bridge**. True
> native IAP therefore cannot ship until Base44 releases their roadmap'd
> billing integration. Everything here is built so you flip to native IAP the
> day that bridge lands — with **zero** Stripe-for-digital flow left in the
> iOS/Android build (App Review compliance) in the meantime.

## What this implements

| Part | Where |
|---|---|
| Receipt-validation backend | `base44/functions/validateIapReceipt/entry.ts` |
| Acknowledge/consume backend | `base44/functions/acknowledgeIapPurchase/entry.ts` |
| Entitlement + restore status | `base44/functions/getIapStatus/entry.ts` |
| Stripe→IAP migration (admin) | `base44/functions/migrateStripeToIap/entry.ts` |
| Reconciliation report (admin) | `base44/functions/iapReconcileReport/entry.ts` |
| Apple/Google verification + JWT | `base44/shared/iapValidation.ts` |
| Idempotent entitlement grant | `base44/shared/iapEntitlement.ts` |
| Product catalog (source of truth) | `base44/shared/iapProducts.ts` |
| Purchase ledger entity | `base44/entities/IapPurchase.jsonc` |
| Client IAPManager (backends) | `src/lib/iapManager.js` |
| Native/web detection | `src/lib/platformDetect.js` |
| Client catalog mirror | `src/lib/iapCatalog.js` |
| Purchase UI control | `src/components/payments/PurchaseButton.jsx` |
| Restore Purchases UI | `src/components/payments/RestorePurchasesButton.jsx` |
| Buy Coins screen (wired) | `src/pages/BuyCoins.jsx` |
| Product manifest | `artifacts/iap/product-manifest.json` |
| Reconciliation CSV template | `artifacts/iap/reconciliation_report.csv` |
| Env var names (no secrets) | `.env.example` (repo root) |

## Endpoints

All via `base44.functions.invoke('<name>', payload)`.

- **`validateIapReceipt`** — `{ platform: 'apple'|'google', productId, receiptOrToken }`
  Validates with Apple `verifyReceipt` (prod→sandbox fallback) or Google Play
  Developer API `purchases.products.get` (service-account JWT), records an
  idempotent `IapPurchase` (dedup on `(userId, platform, transactionId)`), and
  grants LC coins. Returns 503 `not configured` when the platform secret is
  unset (credential-gated). Accept any receipt under `IAP_MOCK_VALIDATION=true`.
- **`acknowledgeIapPurchase`** — `{ platform, productId, purchaseToken }`
  Consumes (consumables) or acknowledges (non-consumables) a Google purchase and
  marks the stored record. No-op for Apple (StoreKit finishes consumables).
- **`getIapStatus`** — `{}` returns the caller's `IapPurchase` history + coin
  balance (RLS scopes to own records). Powers Restore Purchases.
- **`migrateStripeToIap`** — admin only. Copies fulfilled `CoinTransaction`
  rows into `IapPurchase` with `platform='migrated_from_stripe'`,
  `migratedFrom='stripe'`. **Does not re-grant coins** (Stripe already did).
  Idempotent (dedup key `stripe:<sessionId>`).
- **`iapReconcileReport`** — admin only. Returns `{ stripeOnly[], both[],
  totals }` listing users with Stripe buys vs. platform IAP.

## Product IDs (enter in the consoles)

| Pack | Apple ID | Google ID | Type | Price |
|---|---|---|---|---|
| 25,000 LC | `com.evoclash.coin_pack_small` | `coin_pack_small` | consumable | $1.99 |
| 80,000 LC | `com.evoclash.coin_pack_medium` | `coin_pack_medium` | consumable | $5.99 |
| 175,000 LC | `com.evoclash.coin_pack_large` | `coin_pack_large` | consumable | $11.99 |

Full manifest: `artifacts/iap/product-manifest.json`.

## Required secrets (set in Base44 → Settings → Secrets before live validation)

> Nothing is committed. None of these are set yet — validation is credential-gated.

| Env var | Purpose |
|---|---|
| `APPLE_SHARED_SECRET` | Apple `verifyReceipt` shared secret (consumables). |
| `APPLE_ISSUER_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY_PATH` (or `_BASE64`) | Optional App Store Server API upgrade. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` (raw) **or** `GOOGLE_SERVICE_ACCOUNT_JSON_PATH` | Google Play service account JSON with `androidpublisher.purchases` scope. |
| `GOOGLE_PLAY_PACKAGE_NAME` | Android package id, e.g. `com.evoclash.app`. |
| `IAP_MOCK_VALIDATION` | `true` for dev/sandbox only; never in production. |
| `VITE_NATIVE_BUILD` / `VITE_USE_STRIPE_IN_NATIVE` | Client build flags (see `.env.example`). |

**Stop & request:** Do NOT proceed to live receipt verification or store
upload until the Apple and Google credentials above are provided through Base44
secrets and explicitly approved.

## Migration & reconciliation (no double-charging)

1. Run `migrateStripeToIap` once (admin). Existing Stripe buyers get
   `migrated_from_stripe` `IapPurchase` rows; coins are NOT re-granted.
2. Run `iapReconcileReport` to get `stripeOnly` / `both` lists; export to
   `reconciliation_report.csv`.
3. Stripe stays honored **on web only**. iOS/Android never show Stripe.

## Sandbox / QA steps

**Apple (StoreKit sandbox):**
1. App Store Connect → Users & Access → Sandbox → Test Accounts (create one).
2. Create the 3 consumable IAPs with the Apple IDs above (In-App Purchases).
3. Run on a sandbox device/build; purchase; `validateIapReceipt` receives the
   sandbox receipt (auto-retries the sandbox URL on status 21007).
4. Verify an `IapPurchase` row is created and coins granted once (replay the
   same receipt → `alreadyValid: true`, no double grant).
5. Restore Purchases → `getIapStatus` returns the row on a second device.

**Google (Play internal test):**
1. Play Console → Internal test track; upload AAB; add test accounts.
2. Create the 3 consumable products with the Google IDs above.
3. Purchase; `validateIapReceipt` validates via `purchases.products.get`;
   client then calls `acknowledgeIapPurchase` to consume.
4. Replay / re-buy / restore — same idempotency and restore checks as Apple.

**Dev without credentials:** set `IAP_MOCK_VALIDATION=true` —
`validateIapReceipt` accepts any receipt for a known productId and grants
coins, letting you exercise the full server + UI flow end-to-end.

**Edge cases to verify:** interrupted purchase (re-validate → idempotent),
duplicate transaction (alreadyValid), consume-then-rebuy (Google), expired
subscription (n/a now — all consumable), restore across devices.

## Branch / PR

This workspace has no 2-way GitHub repo sync configured, so a PR can't be
opened from here. To deliver as a PR locally:

```bash
git checkout -b feat/iap-storekit-play-billing
git add -A
git commit -m "feat(iap): add StoreKit/Play receipt-validation backend, IAPManager, Stripe gating, migration"
git push -u origin feat/iap-storekit-play-billing
# open PR on GitHub against main
```

Want the GitHub repo sync wired up first so future PRs open from the builder?
Say the word and I'll set up the Base44 ↔ GitHub 2-way connection.

## Remaining manual steps

- [ ] Create the 3 products in **App Store Connect** with the Apple IDs above.
- [ ] Create the 3 products in **Play Console** with the Google IDs above.
- [ ] Provide `APPLE_SHARED_SECRET` + Google service-account JSON via Base44 secrets, then re-test `validateIapReceipt` against real sandbox receipts.
- [ ] When Base44 ships the native billing bridge, wire `NativeIAPBackend._bridge()` receipt callback → `validateReceiptServerSide`.
- [ ] Set `VITE_NATIVE_BUILD=true` for the iOS/Android package builds.
``