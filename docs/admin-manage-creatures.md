# Admin: Manage Creatures — tiered upgrade-guide images & Unique Attack

This enhances the **Admin → Manage Creatures** screen so admins can:

1. **Generate tiered upgrade-guide images (Tier 1–4)** for a creature, with a detailed prompt and style preset, and **approve them as guides** for the card generator (without creating any card).
2. **Add/edit each creature's Unique Attack** (name, percent, target, effects).

Built on the existing Base44 patterns (entities = schema, backend functions = controllers, SDK on the client). There is **no SQL migration** — the schema changes below ARE the migration (Base44 entities create their own tables; additive fields default, no backfill).

## What changed

### Data model (entities)
- **`Creature`** — `uniqueAttackName`, `uniqueAttackPercent` (1–1000), `uniqueAttackTarget` (`single`/`all`), `uniqueAttackEffects` (`string[]`), `referenceImageUrl` (creature-level default reference, still read by the card-art generator).
- **`CreatureImage`** — `creatureId`, `tier` (1–4, default 1), `url`, `storageKey`, `status` (`pending`/`approved`/`rejected`), `isGuide` (bool; true once approved as a guide), `isDefaultForTier` (bool; default guide for that creature + tier), `generatedBy` (`base44-core`|`manual`), `authorId`, `authorName`, `notes`, `prompt` (the admin's detailed prompt, stored for traceability), `stylePreset`, `isDefault` (creature-level default reference), `errorMessage`. Publicly readable (image URLs), admin-only writes.
- **`CreatureAuditLog`** — `creatureId`, `imageId`, `tier`, `action`, `userId`, `userName`, `note`. Admin-only read/write. Actions: `generate_requested`, `generate_completed`, `generate_failed`, `image_uploaded`, `image_approved`, `image_rejected`, `default_changed`, `unique_attack_updated`, `approve_guide`, `reject_image`, `set_default`, `guide_used`.

### Backend functions (admin-only writes)
- `generateCreatureImages` — `{ creatureId, tier(1–4), prompt, count(1–5), style }` → validates tier (400 if out of range), creates `count` pending records carrying `tier`+`prompt`+`style`, generates via the image provider using a combined guide prompt, fills urls. Per-image failures kept with `errorMessage`.
- `uploadCreatureImage` — `{ creatureId, url, tier, prompt?, style? }` → records a manual upload with tier + prompt metadata (`generatedBy='manual'`).
- `approveCreatureImage` — `{ imageId, setDefaultForTier?, note? }` → `status='approved'`, `isGuide=true`; optionally clears `isDefaultForTier` on other same-tier images and sets it on this one. 409 if image still generating (no url). Audits `approve_guide` (+ `set_default` when applicable).
- `rejectCreatureImage` — `{ imageId, note }` → `status='rejected'`, `isGuide=false`, `isDefaultForTier=false`; clears creature-level default if it was the default. Audits `reject_image`.
- `setDefaultCreatureImage` — `{ imageId, tier? }`. With `tier`: per-tier guide default (`isDefaultForTier`, must be an approved guide). Without `tier`: creature-level default (`isDefault`, mirrors `Creature.referenceImageUrl`).
- `getCreatureGuideImages` — `{ creatureId, tier? }` → normalized approved-guide list (`isGuide=true`): `{ imageId, tier, imageUrl, promptText, stylePreset, isDefaultForTier, uniqueAttackSummary }`.
- `useGuideInCardGenerator` — `{ imageId }` → validates `status='approved' && isGuide` (400 otherwise — a rejected/pending image is blocked server-side), returns the normalized guide payload, audits `guide_used`.
- `generateCardArt` — now accepts an optional `guideImageId`; validated server-side (must be an approved guide belonging to the same creature) and used as the reference image, overriding the creature's default. Used by the player card generator and the admin AI-deck generator.
- `updateCreatureUniqueAttack` — unchanged.

All write actions append a `CreatureAuditLog` row (who/when/tier/note).

### Image provider
- Default: the platform's `Core.GenerateImage` integration (no API key). Pluggable via `IMAGE_PROVIDER` (see `.env.example`); an external provider can be slotted into `base44/shared/creatureImages.ts`.

### Prompt template (tiered guide image)
The admin's detailed prompt is combined with the creature name, tier, theme, per-tier guidance, and unique-attack summary before sending to the image model. Template (`base44/shared/creatureImages.ts → buildGuideImagePrompt`):

> `Creature: {name}. Tier: {tier}. Theme: {style}. Admin instructions: {admin_prompt}. Tier enhancement: {tier_guidance} Visual: full-body, 4:5 aspect ratio, transparent/neutral background suitable for cropping to card, high-res (>=2048 preferred), clear silhouette, no watermarks. Palette: {palette}. Unique attack: {unique_attack_summary}. Deliverable: image(s) suitable as a card art guide[; include a close-up detail for armor/patterns when tier>=3].`

Tier guidance: **T1** base design · **T2** enhanced gear/light armor · **T3** elaborate armor + elemental effects + runes · **T4** legendary/epic with particle effects, halo, dramatic lighting.

Example (T4 Tyrannosaurus): `Creature: Tyrannosaurus Rex. Tier: 4. Theme: Trading-card art. Admin instructions: A towering T-Rex wearing ornate obsidian armor with molten veins and ancient runes, roaring over a volcanic cliff. Tier enhancement: Legendary/epic — iconic, ornate, highly stylized with particle effects, halo glow, and dramatic lighting; make silhouette readable at thumbnail size. Visual: full-body, 4:5 aspect ratio, transparent/neutral background suitable for cropping to card, high-res (>=2048 preferred), clear silhouette, no watermarks. Palette: volcanic reds and molten gold. Unique attack: Devouring Chomp — 120% single — Bleed 2 turns. Deliverable: image(s) suitable as a card art guide; include a close-up detail for armor/patterns.`

## How to use it (admin)

1. Go to **Admin → Manage Creatures**. Tap a creature row to expand it.
2. **Images tab**
   - **Generate Image(s)** → pick a **Tier** (1–4), enter a **detailed prompt** (required; "Insert template" prefills a starter), pick count (1–5) and a style preset. "Preview combined prompt" shows exactly what the server sends. Generate creates `pending` thumbnails tagged with the tier.
   - **Import Image** → pick a tier + optional prompt, then upload a file or paste a URL (recorded `pending`, `manual`).
   - Gallery is **grouped by tier**. Each tile shows a tier badge (T1–T4), a status badge (PENDING/APPROVED/REJECTED), and a green **GUIDE** badge once approved as a guide.
   - Actions per tile: **Approve as Guide** (sets approved + isGuide), **Reject Image**, **Set as Default for Tier** (per-tier guide default, crown badge), **★** (creature-level reference), and **Use in Card Generator** (opens `/generate?creature=…&guide=…` prefilled).
   - **Activity** feed lists every audited action.
3. **Details tab** — an **Upgrade Guides** panel shows the current default guide per tier (T1–T4) and the creature's Unique Attack summary.
4. **Unique Attack tab** — set name, percent (1–1000), target, effect tags; live `floor(baseAttack × percent/100)` preview.
5. **Card generator** (`/generate`, admin) — when a creature is selected, a **Choose Guide** panel lists approved guides grouped by tier; picking one passes `guideImageId` to `generateCardArt`, which uses that guide as the reference image (validated server-side).

## Important guarantees
- **No card is auto-created or modified** when a guide image is generated/approved. Approval only marks the image as eligible; a card is created only when an admin explicitly generates one in the card generator.
- A **rejected** image is blocked server-side: `useGuideInCardGenerator` and `generateCardArt` both return 400 for a non-approved/non-guide image.
- **Only one default guide per creature per tier** (`isDefaultForTier`); setting a new one clears the previous for that tier.
- Approving while a generation is still pending returns **409** (no url yet).

## Env config
See `.env.example`. Only `IMAGE_PROVIDER` is optional (defaults to `base44-core`). A future external image API can use `IMAGE_API_KEY`.

## Tests
- `tests/creatureImages.test.js` — unique-attack validators + preview + creature resolver.
- `tests/guideImages.test.js` — tier validation/clamp + `buildGuideImagePrompt` (template contents, tier>=3 close-up, unique-attack summary, clamping).
- Run with `npx vitest run` (vitest is fetched on demand; not installed in this sandbox).

## QA checklist
- [ ] Generate a Tier 2 image with a detailed prompt: a `pending` T2 thumbnail appears, then shows the generated art under the **Tier 2** group.
- [ ] Approve an image as guide: status → APPROVED, green GUIDE badge appears, it shows in the card generator **Choose Guide** list for that creature.
- [ ] Set as Default for Tier: crown badge appears; only one default per tier.
- [ ] Reject an image: status → REJECTED, GUIDE badge gone, not shown in the guide picker.
- [ ] Try to use a rejected image in the card generator (`/generate?creature=…&guide=<rejectedId>`): generation fails server-side (400) — blocked.
- [ ] Import an image with tier + prompt metadata, then approve as guide — same flow applies.
- [ ] Audit feed shows: generate_requested, generate_completed, approve_guide, reject_image, set_default, guide_used.
- [ ] Tier out of range (0 / 5) on generate/upload → 400.
- [ ] Non-admin cannot call generate/approve/reject/set-default/use-guide (403) — RLS + role checks.
- [ ] Unique Attack: set name/percent/target/effects, Save; verify clamp (0 and 5000).
- [ ] Localized strings + aria-labels present on all new controls.

## Deployment & rollback
1. **Deploy**: entities + functions + frontend ship together on publish. New fields (`tier`, `isGuide`, `isDefaultForTier`) are additive with defaults; existing `CreatureImage` rows get tier=1, isGuide=false, isDefaultForTier=false. Existing `Creature` data is unaffected.
2. **Rollback**: revert the entity schemas and delete the new functions (`getCreatureGuideImages`, `useGuideInCardGenerator`). Existing data stays; the added fields were additive/nullable.

## Changelog
- **Tiered upgrade-guide images**: generate Tier 1–4 guide images with a detailed prompt + style preset; approve as guide / reject; per-tier default guide; Use-in-card-generator; Upgrade Guides summary panel. Guide images feed the card generator as a server-validated reference.
- New `CreatureImage` fields: `tier`, `isGuide`, `isDefaultForTier`. New `CreatureAuditLog` actions: `approve_guide`, `reject_image`, `set_default`, `guide_used` (+ `tier` column). New functions: `getCreatureGuideImages`, `useGuideInCardGenerator`. `generateCardArt` now accepts `guideImageId`.

## Risk & mitigation (one line)
_Risk:_ image generation/storage cost and exposure of an external API key. _Mitigation:_ admin-only role checks + RLS on all write paths, the keyless platform `GenerateImage` as the default provider, `IMAGE_API_KEY` stored only as a server-side secret (never shipped to the client), and prompt + tier persisted on every record for audit/traceability.