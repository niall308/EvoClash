# Admin: Manage Creatures — image generation/approval & Unique Attack

This overhauls the **Admin → Manage Creatures** screen so admins can:

1. **Generate and approve creature images** without creating a new card each time.
2. **Add/edit each creature's Unique Attack** (name, percent, target, effects).

It is built on the existing Base44 patterns (entities = schema, backend functions = controllers, SDK on the client). There is **no SQL migration** — the schema changes below ARE the migration (Base44 entities create their own tables).

## What changed

### Data model (entities)
- **`Creature`** — added `uniqueAttackName`, `uniqueAttackPercent` (1–1000), `uniqueAttackTarget` (`single`/`all`), `uniqueAttackEffects` (`string[]`). `referenceImageUrl` now mirrors the default approved `CreatureImage`'s url (still read by the card-art generator).
- **`CreatureImage`** (new) — `creatureId`, `url`, `storageKey`, `status` (`pending`/`approved`/`rejected`), `generatedBy` (`base44-core`|`manual`), `authorId`, `authorName`, `notes`, `prompt`, `stylePreset`, `isDefault`, `errorMessage`. Publicly readable (image URLs), admin-only writes.
- **`CreatureAuditLog`** (new) — `creatureId`, `imageId`, `action`, `userId`, `userName`, `note`. Admin-only read/write.

### Backend functions (admin-only)
- `generateCreatureImages` — `{ creatureId, prompt, count(1–5), style }` → creates `count` pending records, generates via the image provider, fills urls. Per-image failures kept with `errorMessage`.
- `uploadCreatureImage` — `{ creatureId, url }` → records a manual upload (`generatedBy='manual'`).
- `approveCreatureImage` — `{ imageId, setDefault, note }` → `status='approved'`; optionally sets default + mirrors `Creature.referenceImageUrl`. 409 if image still generating (no url).
- `rejectCreatureImage` — `{ imageId, note }` → `status='rejected'`; clears default if it was the default.
- `setDefaultCreatureImage` — `{ imageId }` → sets default among approved images.
- `updateCreatureUniqueAttack` — `{ creatureId, name, percent, target, effects }` → validates + writes to the Creature.

All write actions append a `CreatureAuditLog` row (who/when/note).

### Image provider
- Default provider: the platform's `Core.GenerateImage` integration (no API key needed). Pluggable via `IMAGE_PROVIDER` env var (see `.env.example`); an external provider can be slotted into `base44/shared/creatureImages.ts`.

## How to use it (admin)

1. Go to **Admin → Manage Creatures**.
2. Tap a creature row to expand it.
3. **Images tab**
   - **Generate Image(s)** → enter a prompt, pick count (1–5) and a style preset, Generate. Thumbnails appear as `pending`.
   - **Import Image** → upload a file or paste a URL (recorded as `pending`, `manual`).
   - On each tile: **Approve** (green) / **Reject** (red) open a confirm-with-optional-note dialog. **★** sets an approved image as the default reference (mirrors onto `Creature.referenceImageUrl`).
   - Status badges: Pending (yellow), Approved (green), Rejected (gray). Rejected images stay in history.
4. **Unique Attack tab**
   - Set Attack Name, Percent Damage (1–1000), Target (single/all), and effect tags.
   - Live preview shows `floor(baseAttack × percent / 100)` at a sample base attack of 1000.
   - Save writes the creature's Unique Attack. It appears in the row summary and in the card inspector (`CardStatsModal`) via `getCreatureUniqueAttack`.

## Important guarantees
- **No card is auto-created** when images are generated/approved. Card creation stays a separate flow.
- Approving an image only sets the creature image(s); `Creature.referenceImageUrl` is updated only when an admin sets a default.

## Env config
See `.env.example`. Only `IMAGE_PROVIDER` is optional (defaults to `base44-core`). A future external image API can use `IMAGE_API_KEY`.

## Tests
Unit tests: `tests/creatureImages.test.js` (validators + preview + creature resolver). Run with `npx vitest run` (vitest is fetched on demand). Backend permission/flow tests are covered by the QA checklist below.

## QA checklist
- [ ] Generate 1 image: a `pending` thumbnail appears, then shows the generated art.
- [ ] Approve an image (with optional note): status → Approved; optionally set default → `Creature.referenceImageUrl` updates.
- [ ] Reject an image (with note): status → Rejected; stays in gallery/history.
- [ ] Import an image via file upload: appears as `pending`, `generatedBy=manual`.
- [ ] Import via pasted URL: appears correctly.
- [ ] Unique Attack: set name/percent/target/effects, Save, see it in the row summary and the card inspector. Verify percent clamp (try 0 and 5000).
- [ ] Permission: a non-admin cannot call generate/approve/reject (RLS + role checks return 403/401).
- [ ] Audit feed shows: generate_requested, generate_completed, image_approved, image_rejected, default_changed, unique_attack_updated.

## Deployment & rollback
1. **Deploy**: entities + functions + frontend ship together on publish. The new entities create their own tables; existing `Creature` records get the new nullable fields with defaults (no data backfill needed).
2. **Rollback**: revert the `Creature` schema to its prior fields and delete the `CreatureImage` / `CreatureAuditLog` entities + the 6 functions. Existing `Creature` data is unaffected (the added fields were additive/nullable). Reverting does not delete already-generated `CreatureImage` rows, but they become unreachable once the entity is removed.

## Changelog
- **Manage Creatures overhaul**: per-creature image generation (1–5 at a time) with style presets, manual import, approve/reject with notes, default-image management, and an audit feed. Images no longer require creating a card.
- **Unique Attack per creature**: new admin editor (name, percent 1–1000, single/all target, effect tags) with live damage preview; shown in the creature row and card inspector.
- New entities: `CreatureImage`, `CreatureAuditLog`. New functions: `generateCreatureImages`, `uploadCreatureImage`, `approveCreatureImage`, `rejectCreatureImage`, `setDefaultCreatureImage`, `updateCreatureUniqueAttack`.

## Risk & mitigation (one line)
_Risk:_ image generation costs (API/storage) and exposure of an external API key. _Mitigation:_ admin-only role checks + RLS on all write paths, the platform's built-in (keyless) `GenerateImage` as the default provider, and `IMAGE_API_KEY` stored only as a server-side secret never shipped to the client.