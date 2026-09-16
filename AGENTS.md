# AGENTS.md

## Project Context

This is a Base44 app repository. Treat it as user-owned application code, keep changes focused on the user's request, and preserve existing project conventions.

Start with `README.md` for local setup, environment variables, and publish workflow.

## Base44 References

- CLI overview: https://docs.base44.com/developers/references/cli/get-started/overview.md
- Agent skills: https://docs.base44.com/developers/backend/overview/skills.md

If your agent supports Agent Skills, install or update Base44 skills before Base44-specific work:

```bash
npx skills add base44/skills
```

## Key Files

- `src/`: frontend application source.
- `src/api/base44Client.js`: frontend Base44 SDK client.
- `vite.config.js`: Vite config and Base44 Vite plugin setup.
- `.env.local`: local-only environment values; never commit secrets.

## Working Notes

- Use `base44 dev` as the default local development command when you need the local Base44 backend. It can run the backend and frontend together.
- When docs or code mention the frontend being started automatically, that usually means the Base44 project config includes `site.serveCommand`, for example `"serveCommand": "npm run dev"` in `base44/config.jsonc`.
- Use `npm run dev` only for frontend-only work against the hosted Base44 backend.
- Prefer the existing Base44 CLI workflow over adding new npm scripts for Base44-specific tasks.
- Reuse the existing SDK client and Vite plugin patterns before adding new Base44 integration paths.
- Run the relevant checks from `package.json` before finishing code changes.

## Unique Attack — Canonical Model

A creature's Unique Attack is configured on the Manage Creatures admin screen and stored as flat `uniqueAttack*` fields (the `uniqueAttack` prefix is required because `Card` already has a `name` field). The canonical fields are:

- `uniqueAttackName` — display name
- `uniqueAttackPercent` — damage percentage, **0–200** (one canonical max everywhere: schema, resolver, backend, UI)
- `uniqueAttackTarget` — `"single"` or `"all"` (legacy `"multi"` is normalized to `"all"`)
- `uniqueAttackEffectType` — a predefined effect id from `EFFECT_TYPES` in `src/lib/uniqueAttacks.js` (`none`, `heal_self`, `heal_team`, `heal_team_on_destroy`, `half_attack_target`, `custom`)
- `uniqueAttackEffectPercent` — optional numeric parameter for percentage-scaled effects (0–200)
- `uniqueAttackEffectDuration` — optional turn count for duration effects
- `uniqueAttackEffect` — admin-facing display text only; the mechanic is driven by `effectType`, never by parsing this text

**Effect resolution is centralized.** `src/lib/uniqueAttacks.js` exports `resolveUniqueAttackEffect` / `applyUniqueAttackEffect`: a pure registry that decides what an effect does and when it triggers (e.g. `heal_team_on_destroy` fires only when the attack destroyed at least one opposing card). Battle hooks pass mode-specific state mutators (`healSelf`, `healTeam`, `halfAttackTarget`, `log`) and the registry owns the rules. Add new effects there, not in the hooks.

**Card-vs-Creature copy model (chosen, documented):** cards **copy** the attack at creation (`createGeneratedCard`, `AdminAiDecks`) rather than resolving dynamically from the Creature record at battle time. This keeps PvP/AI opponents self-contained (no cross-user Creature lookups mid-match). Editing a creature does **not** auto-update existing cards — run the admin **Sync UA to Cards** action (`syncUniqueAttacks`) to backfill. New cards always receive normalized data.

**Precedence:** admin-authored fields stamped on the card take precedence over the static fallback in `data/uniqueAttacks.json`, which only applies to creatures with no admin configuration. Legacy creatures configured with only `uniqueAttackEffect` free text still resolve via `mapEffectType` until migrated to an explicit `effectType`.

**Usage rule:** once per card per match. Client state is presentational; the authoritative guard is server-side `AiMatch.usedUniqueAttacks` (via `recordUniqueAttack`, idempotent `$addToSet`). `PvpMatch.usedUniqueAttacks` exists as a dormant field for when unique attacks are wired into PvP (not yet implemented — see follow-ups).

## Card Creation Limits — Frontend/Backend Contract

`src/lib/cardCreationLimits.js` (frontend, optimistic UX) and `base44/shared/cardCreationLimits.ts` (backend, authoritative) intentionally mirror the same free-creation/coin-cost rules because backend functions cannot import frontend source. The **backend is authoritative**: `createGeneratedCard` re-validates limits, coin balance, deck ownership, and card data server-side and never trusts client checks. The frontend copy only exists to give instant pre-flight feedback before spending coins. If you change the rules, update **both** files and keep their constants (`FREE_CARDS_INITIAL`, `FREE_CREATIONS_PER_DAY`, `EXTRA_CREATURE_COST`) in sync.