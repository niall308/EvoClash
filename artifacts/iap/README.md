# EvoClash — Apple In-App Purchase (IAP) layer

Apple in-app purchases for the iOS build of EvoClash, plus a server-side
receipt-validation + entitlement ledger that works the moment any client can
hand us a receipt. Stripe stays for the **web** build only. **Android / Google
Play is intentionally NOT supported** — there is no Google code and no Google
credentials are required.

> **Platform status (read first):** Base44's iOS build is a lightweight native
> wrapper around a WebView of the published web app, and **does not currently
> expose a StoreKit bridge**. True native IAP therefore cannot ship until Base44
> releases their roadmap'd billing integration. Everything here is built so
> you flip to native IAP the day that bridge lands — with **zero**
> Stripe-for-digital flow left in the iOS build (App Review compliance) in the
> meantime.

## What this implements

| Part | Where |
|---|---|
| Apple receipt-validation backend | `base44/functions/validateIapReceipt/entry.ts` |
| Apple acknowledge (record marker) | `base44/functions/acknowledgeIapPurchase/entry.ts` |
| Entitlement + restore status | `base44/functions/getIapStatus/entry.ts` |
| Stripe→IAP migration (admin) | `base44/functions/migrateStripeToIap/entry.ts` |
| Reconciliation report (admin) | `base44/functions/iapReconcileReport/entry.ts` |
| Apple `verifyReceipt` (prod→sandbox) | `base44/shared/iapValidation.ts` |
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

## Endpoints (Apple only)

All via `base44.functions.invoke('<name>', payload)`.

- **`validateIapReceipt`** — `{ platform: 'apple', productId, receipt, userId? }`
  Validates with Apple `verifyReceipt` (production with sandbox fallback on
  status 21007), optionally checks the bundle id against `APPLE_BUNDLE_ID`,
  records an idempotent `IapPurchase` (dedup on `(userId, platform, transactionId)`),
  and grants LC coins. Returns 503 `APPLE_SHARED_SECRET not configured` when
  the secret is unset (credential-gated). Accept any receipt under
  `IAP_MOCK_VALIDATION=true`.
- **`acknowledgeIapPurchase`** — `{ platform: 'apple', productId, transactionId? }`
  Marks the stored record consumed+acknowledged. For StoreKit consumables the
  client finishes the transaction via `SKPaymentQueue`; this is bookkeeping only.
- **`getIapStatus`** — `{}` returns the caller's `IapPurchase` history + coin
  balance (RLS scopes to own records). Powers Restore Purchases.
- **`migrateStripeToIap`** — admin only. Copies fulfilled `CoinTransaction`
  rows into `IapPurchase` with `platform='migrated_from_stripe'`,
  `migratedFrom='stripe'`. **Does not re-grant coins** (Stripe already did).
  Idempotent (dedup key `stripe:<sessionId>`). **PAUSED — do not run until you
  review `reconciliation_report.csv` and approve.**
- **`iapReconcileReport`** — admin only. Returns `{ stripeOnly[], both[],
  totals }` listing users with Stripe buys vs. Apple IAP.

## Product IDs (enter in App Store Connect)

| Pack | Apple ID | Type | Price |
|---|---|---|---|
| 25,000 LC | `com.primallegends.coin_pack_small` | consumable | $1.99 |
| 80,000 LC | `com.primallegends.coin_pack_medium` | consumable | $5.99 |
| 175,000 LC | `com.primallegends.coin_pack_large` | consumable | $11.99 |

Bundle id (expected): `com.primallegends.app`. Full manifest:
`artifacts/iap/product-manifest.json`.

## Required secrets (set in Base44 → Settings → Secrets before live validation)

> Nothing is committed. None of these are set yet — validation is credential-gated.
> You said you'll provide them; the exact secret names the backend reads:

**Option A — `verifyReceipt` (consumables, simplest):**
- `APPLE_SHARED_SECRET`

**Option B — App Store Server API (optional upgrade):**
- `APPLE_ISSUER_ID`
- `APPLE_KEY_ID`
- `APPLE_PRIVATE_KEY_BASE64`  (the `.p8` key content, base64-encoded)

**Optional guard (either option):**
- `APPLE_BUNDLE_ID`  (e.g. `com.primallegends.app`; reject receipts whose bundle differs)

**Dev only:**
- `IAP_MOCK_VALIDATION`  (`true` to bypass Apple in sandbox/dev; never in prod)

**Stop & request:** Do NOT proceed to live receipt verification or store upload
until the Apple credentials above are provided through Base44 secrets and
explicitly approved.

## Migration & reconciliation (no double-charging)

1. Run `iapReconcileReport` to get `stripeOnly` / `both` lists → export to
   `reconciliation_report.csv`.
2. **Review the report.** Do NOT run the migration until you approve.
3. When approved, run `migrateStripeToIap` once (admin). Existing Stripe buyers
   get `migrated_from_stripe` `IapPurchase` rows; coins are NOT re-granted.
4. Stripe stays honored **on web only**. iOS never shows Stripe.

## Apple sandbox / QA steps

1. App Store Connect → Users & Access → Sandbox → Test Accounts (create one).
2. Create the 3 consumable IAPs in App Store Connect with the Apple IDs above.
3. Run on a sandbox build; sign in with the sandbox tester; purchase.
4. `validateIapReceipt` receives the sandbox receipt — auto-retries the sandbox
   URL on status 21007 — and records the entitlement + grants coins.
5. Verify an `IapPurchase` row is created and coins granted **once**: replay
   the same receipt → `alreadyValid: true`, no double grant.
6. Restore Purchases → `getIapStatus` returns the row on a second device.

**Dev without credentials:** set `IAP_MOCK_VALIDATION=true` —
`validateIapReceipt` accepts any receipt for a known productId and grants
coins, letting you exercise the full server + UI flow end-to-end.

**Unit checks (runnable now):** with no secrets and mock off, call
`validateIapReceipt` with `{productId:'com.primallegends.coin_pack_small', receipt:'x'}`
→ 503 `APPLE_SHARED_SECRET not configured`; with a bad productId → 400
`unknown product`. Both confirm routing + the credential gate.

## Testing the Stripe-gating UI locally

```bash
VITE_NATIVE_BUILD=true npm run dev      # pretend to be the iOS wrapper
# Browse to /buy-coins — Stripe buy buttons are replaced with the compliant
# "Purchases are available via App Store IAP in the store build." message.
VITE_NATIVE_BUILD=false npm run dev     # normal web build — Stripe works
```

## Branch / PR

This workspace has no 2-way GitHub repo sync configured, so a PR can't be
opened from here. To deliver as a PR locally:

```bash
git checkout -b feat/iap-apple-storekit
git add -A
git commit -m "feat(iap): Apple StoreKit receipt validation, IAPManager, Stripe-gating in native WebView, Stripe→IAP migration (paused)"
git push -u origin feat/iap-apple-storekit
# open PR on GitHub against main
```

Want the Base44 ↔ GitHub 2-way sync wired up first so future PRs open from the
builder? Say the word and I'll set it up.

## Remaining manual steps

- [ ] Create the 3 consumable products in **App Store Connect** with the Apple IDs above.
- [ ] Provide `APPLE_SHARED_SECRET` (Option A) **or** the App Store Server API set (Option B) via Base44 secrets, then re-test `validateIapReceipt` against real sandbox receipts.
- [ ] When Base44 ships the native StoreKit bridge, wire `NativeIAPBackend._bridge()` receipt callback → `validateReceiptServerSide`.
- [ ] Set `VITE_NATIVE_BUILD=true` for the iOS package build.
- [ ] **Review `reconciliation_report.csv` → approve → then run `migrateStripeToIap`.**