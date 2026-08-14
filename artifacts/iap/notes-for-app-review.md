# EvoClash — Notes for App Review (Apple)

App name: **EvoClash**
Bundle id: `com.primallegends.app` (set as `APPLE_BUNDLE_ID`)
Platforms: iOS only (no Android / Google Play build exists).
Monetization: Apple In-App Purchases (consumable coin packs). No other
monetization and no external purchase links.

---

## 1. Demo account (please use this to review)

See `reviewer-credentials.md`. Short version:

- Email: `evo.clash1916+demo@gmail.com`
- Password: provided in the App Store Connect "Demo Account Information"
  field (see `reviewer-credentials.md` for the value to paste).
- Pre-funded with 100,000 LC so reviewers can exercise the game without
  spending. **Login is required** to play (the game is account-based — cards,
  decks and progress are per-user).

After login, the reviewer lands on the Home menu (no onboarding gate for the
seeded demo account — the `isDemo` flag bypasses any first-run flow). One step
is required before a battle: open **Deck**, create a deck, set it active, and
add the 15 starter cards. Then all game modes work.

## 2. In-App Purchases offered

Three consumable coin packs ("LC" = Legend Coins, in-game currency):

| Product | Apple product ID | Type | Price |
|---|---|---|---|
| 25,000 LC Pack | `com.primallegends.coin_pack_small` | consumable | $1.99 |
| 80,000 LC Pack | `com.primallegends.coin_pack_medium` | consumable | $5.99 |
| 175,000 LC Pack | `com.primallegends.coin_pack_large` | consumable | $11.99 |

Source of truth: `base44/shared/iapProducts.ts`; client mirror:
`src/lib/iapCatalog.js`.

## 3. IAP functionality status — READ THIS BEFORE TESTING PURCHASES

The native iOS build is a WebView wrapper of the published web app. The
platform's StoreKit payment bridge is **not yet available in this build**, so
real StoreKit purchases cannot currently complete from inside the app. To stay
compliant with App Review Guidelines (no non-IAP digital-goods purchase flow
inside the iOS app), the **Buy Coins** screen on the iOS build intentionally
does **not** render a Stripe/external buy button — it shows a compliant notice:
"Purchases are available via App Store IAP in the store build."

What IS implemented and functional end-to-end now:

- The full **server-side receipt validation** pipeline
  (`base44/functions/validateIapReceipt/entry.ts`) — production `verifyReceipt`
  with automatic sandbox fallback (status 21007), bundle-id check, idempotent
  entitlement grant, and LC credit — is live and credential-gated against
  Apple's servers.
- **Restore Purchases** (`RestorePurchasesButton.jsx` → `getIapStatus`) is
  present on the Buy Coins screen and queries the user's purchase ledger.
- Receipt **acknowledgment** bookkeeping (`acknowledgeIapPurchase`) is present.

Purchases will go live the moment the platform exposes the StoreKit bridge;
no app-side change to the buy flow will be needed. If your review needs a
functioning purchase path, please coordinate via the resolution center — the
blocker is the platform's bridge release, not this app's IAP code. The demo
account is pre-funded exactly so reviewers can validate the game *without*
needing to complete a real purchase.

## 4. Sandbox testing (for reviewers with a sandbox tester)

1. App Store Connect → Users & Access → Sandbox → Test Accounts (create one).
2. On a sandbox install, sign in with the sandbox tester, open **Buy Coins**.
3. Note: as above, the buy row currently shows the compliant "available via
   App Store IAP" notice rather than a live StoreKit sheet until the native
   bridge is active.
4. The backend validator is already enabled against sandbox receipts and will
   record entitlements idempotently. Replay of the same receipt yields no
   double-grant.

**Dev / mock mode (NOT shipped to App Store):** setting the server secret
`IAP_MOCK_VALIDATION=true` bypasses Apple's servers and accepts any receipt
for a known product. This is a development-only toggle and is **not** set for
the review build.

## 5. Existing Apple secrets configured on the backend

The app already has these App Store Connect credentials stored as Base44 app
secrets (names only — values are not in the repo):

- `APPLE_ISSUER_ID`
- `APPLE_KEY_ID`
- `APPLE_PRIVATE_KEY_BASE64` (the `.p8` key, base64-encoded)
- `APPLE_BUNDLE_ID`

Two validation paths are supported:

- **Option A** — `verifyReceipt` (StoreKit 1 receipt blob). Requires
  `APPLE_SHARED_SECRET`. **Not yet provided** → `validateIapReceipt` returns
  `503 APPLE_SHARED_SECRET not configured` (credential-gated, by design).
- **Option B** — App Store Server API (StoreKit 2 `transactionId`), using the
  keys above. Known issue: Apple returns **401 Unauthorized** for the signed
  ES256 JWT; the likely cause is the App Store Connect API key's assigned role
  not including the In-App Purchase capability. Fix path is in
  `artifacts/iap/README.md` §"Required secrets".

> Apple: neither credential gap affects gameplay or the rest of the app. They
> only gate live receipt validation, which is not exercised on the current
> build (see §3).

## 6. No external payment / account links

The iOS build contains **no** Stripe checkout, no external web purchase links,
no "sign up via website" prompts, and no links to external purchase pages.
Account management (sign-up, password reset, profile) is handled in-app via
the platform's standard auth screens.

## 7. Test paths to verify (no purchase needed, using the demo account)

- **Story Mode**: Home → Story → play any unlocked stage match.
- **AI Battle**: Home → Play → choose a difficulty → battle.
- **PvP (offline)**: Home → Play → create/join an offline lobby; take turns.
- **PvP (live code)**: Home → Play → Create Lobby → share the code.
- **Deck building**: Home → Deck → create deck → add starter cards → set
  active.
- **Power-ups, Trades, Milestones, Leaderboards, Profile**: all reachable
  from Home.
- **Restore Purchases**: Buy Coins → "Restore" button (returns the user's
  purchase ledger; will be empty for the demo account, by design).

## 8. Privacy / data

- The app collects an email address for account creation only.
- No analytics SDK other than the platform's built-in event tracking.
- No advertising SDKs.
- Players can delete their account and data from Profile → Delete Account
  (`base44/functions/deleteAccount`).