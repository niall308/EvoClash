# Unique Attack — QA Checklist & Unit Test Examples

## Feature summary
Each creature can have a once-per-game Unique Attack (see `data/uniqueAttacks.json`).
A deep-purple button (sized to match the power-up buttons) appears above the player's
deck on the right side of the 1v1 battle screen when the active card has an unused
unique attack. Clicking it opens the normal attack-timing confirmation, then deals
`floor(card.attack * percent / 100)` damage (defense/crit/bonus still apply via
`computeDamage`) and applies any mapped effect. The attack is then locked for the
match (button shows a purple **USED** badge; the card shows a USED ribbon).

## Files
- `data/uniqueAttacks.json` — creature → unique attack definitions (source of truth)
- `src/lib/uniqueAttacks.js` — resolver, clamp, effect-type map, i18n keys
- `src/components/battle/UniqueAttackButton.jsx` — purple button + sword SVG + aria
- `src/components/cards/GameCard.jsx` — USED ribbon on the card when `uniqueAttackUsed`
- `src/components/cards/CardStatsModal.jsx` — Unique Attack row in card inspector
- `src/components/battle/PlayerHand.jsx` — Unique Attack row in pre-play popup
- `src/hooks/useBattleMatch.js` — per-game used tracking + `useUniqueAttack` + percent scaling + effect application
- `src/components/battle/BattleScreen.jsx` — button placement + confirmation panel
- `base44/entities/AiMatch.jsonc` — `usedUniqueAttacks` field
- `base44/functions/recordUniqueAttack/entry.ts` — server-side reuse guard

## Manual QA checklist (1v1 AI battle)
1. Start a 1v1 AI battle with a deck that includes a creature with a unique attack
   (e.g. **Tyrannosaurus Rex** → *Devouring Chomp*, 130%, single).
2. Play the Rex. On your turn, with the Rex active: **expected** — the purple
   Unique Attack button appears above the deck on the right, aligned with the
   power-up buttons on the left. It shows the sword icon and "Devouring Chomp".
3. Tap the button. **expected** — the attack-timing bar appears, with a purple
   confirmation panel above it showing the name, "130% • Single target", and
   "1 use this game".
4. Lock the timing bar. **expected** — damage is dealt (scaled to 130% of the
   Rex's attack, before defense). The button now shows a greyed **USED** badge and
   is disabled. The active card gains a small purple "USED" ribbon.
5. On a later turn (play the Rex again, or it survives), the button stays disabled
   with the USED badge — it cannot be used a second time this match.
6. Open the card inspector (tap the card in hand/deck). **expected** — a purple
   "Unique Attack: Devouring Chomp" block shows the percent, target, and (if any)
   the effect text.
7. **Phoenix** → *Rebirth Flare*: after the unique attack, the Phoenix heals 50% HP.
8. **Basilisk** → *Petrifying Gaze*: after the unique attack, the opponent's active
   card shows "Half Attack active (1 left)" and deals 50% less damage next turn.
9. **Unicorn** → *Rainbow Slide*: after the unique attack, your active card heals 30%.
10. Start a brand new match with the same Rex. **expected** — the unique attack is
    available again (used resets per match).
11. Accessibility: the button has `aria-label="Use Unique Attack: <name>"` and a
    matching `title` tooltip; it is keyboard-focusable with a purple focus ring.

## Server-side reuse guard
- `recordUniqueAttack` appends the card id to `AiMatch.usedUniqueAttacks` (idempotent).
- A second call for the same (matchId, cardId) returns `{ alreadyUsed: true }` and
  does not grant another use — this is the authoritative check a reconnected client
  must honor.

## Unit test examples (run in the preview console or a node REPL against the libs)

```js
// 1. Resolver + clamp
import { getUniqueAttackDefinition, clampPercent, cardUniqueAttack } from "@/lib/uniqueAttacks";
const rex = getUniqueAttackDefinition("Tyrannosaurus Rex");
console.assert(rex.name === "Devouring Chomp", "name");
console.assert(rex.percent === 130, "percent");
console.assert(rex.target === "single", "target");
console.assert(rex.effectType === "none", "no effect");
console.assert(getUniqueAttackDefinition("Moa Bird") === null, "creatures without a UA return null");
console.assert(clampPercent(0) === 1, "clamp min");
console.assert(clampPercent(5000) === 1000, "clamp max");
console.assert(cardUniqueAttack({ baseName: "Phoenix" }).effectType === "healSelf50", "card resolver");

// 2. Damage scaling (uniqueAttackDamage is the raw pre-defense amount floor(attack*percent/100))
import { uniqueAttackDamage } from "@/lib/uniqueAttacks";
const card = { attack: 1000, baseName: "Tyrannosaurus Rex" };
console.assert(uniqueAttackDamage(card, rex) === 1300, "130% of 1000 = 1300");
const raptor = getUniqueAttackDefinition("Velociraptor");
console.assert(uniqueAttackDamage({ attack: 1000 }, raptor) === 750, "75% of 1000 = 750");

// 3. Button visibility contract (behavioral spec for the hook)
// The button renders only when ALL hold:
//   phase === "battle" && turn === "player" && !readied && playerCard
//   && cardUniqueAttack(playerCard) != null
//   && !usedUniqueAttacks[playerCard.id]
// After useUniqueAttack() + timing lock + attack("player", m, { uniqueAttack: def }):
//   usedUniqueAttacks[playerCard.id] === true  (client)
//   recordUniqueAttack(matchId, cardId) returned { alreadyUsed: false }
// A repeat call returns { alreadyUsed: true }  (server rejects reuse)
```

## Effect mapping (recognized vs custom)
| effectType | source text | mechanic applied |
|------------|-------------|-----------------|
| `none` | (none / "None") | — |
| `healSelf50` | "restores 50% of Phoenix card health" (Phoenix) | heal active player card 50% max HP |
| `halfAttackTarget1` | "Card that was attacked does 50% less damage next turn" (Basilisk) | reuse existing Half Attack (1 turn) on the AI card |
| `healAll30` | "heals all user player cards by 30%" (Unicorn) | heal active player card 30% (1v1 has one active card) |
| `custom` | "5% chance 1 opponent card is discarded" (Siren — not in repo) | descriptive text only — needs design mapping |

> Note: Cerberus, Medusa, Siren, and Cyclops are **not** present in the repo's
> creature list, so their entries are kept in `data/uniqueAttacks.json` for
> completeness but never resolve to a live card and are never fired.