# EvoClash — App Review demo account credentials

> **Do not commit a real password to the repo.** The password line below is a
> placeholder — set it to the value you chose when redeeming the invite, then
> share this file with Apple via App Store Connect's "Demo Account" field only
> (or paste the details directly into the review notes). Keep the file local /
> out of source control on the store-build branch.

## Demo account (pre-seeded for reviewers)

| Field | Value |
|---|---|
| Email | `evo.clash1916+demo@gmail.com` |
| Password | `__SET_ME__` ← replace with the password you set at invite redemption |
| Display name | DemoPlayer |
| User id (Base44) | `6a7f6827632afa4295df8ed3` |
| Role | `user` (not admin) |
| `isDemo` flag | `true` (marks this as a seeded reviewer account) |
| LC balance | 100,000 (pre-funded for review — no real purchase needed to explore) |
| Card collection | 15 tier-1 starter cards across all 9 elements (Fire, Lava, Water, Ice, Rock, Wind, Earth, Magic, + Dinosaur/Extinct/Mythical creatures) |

## First thing the reviewer must do in-app

There is **no onboarding gate** — after login the reviewer lands directly on the
Home menu. One required step before battling:

1. Tap **Deck** on the Home menu.
2. Create a new deck (name it anything) and set it **Active**.
3. Add the 15 starter cards to it.

Why no deck is pre-created for the account: the platform locks a Deck's
`created_by_id` to the user that creates it, so a deck cannot be pre-seeded for a
different user from the backend. The reviewer creates it themselves (about 4
taps). After that, **Story Mode**, **AI Battle**, and **PvP** are all playable.

## What's playable from this account without spending

- **Story Mode** — full stage map.
- **AI Battle** — Easy / Normal / Hard / Extreme.
- **PvP** — Friends, lobby codes, and offline matches.
- **AI Generate** — mint new creatures (uses LC, already pre-funded).
- **Trades** — card-for-card trades with other players.
- **Profile / Leaderboards / Milestones / Power-Ups / Coin History** — all
  visible and functional.

## Cleanup / teardown (do this after review / before re-submit)

After App Review is done, you can reset the demo state so the next submission
re-seeds cleanly. Recommended manual steps (or run the re-seed script):

1. Reset coins back to 100,000 (no access restriction — use the Profile coin
   actions or a one-off admin update).
2. Optionally delete the reviewer's own deck(s) + any cards they generated
   during review; the 15 seeded starter cards can be left in place.

> No PII or real transactions are stored against this account — it exists
> solely for review.

## Where these values live

- Email/role/`isDemo`/coins → `User` entity (Base44 managed).
- Starter cards → `Card` entity, `ownerId = 6a7f6827632afa4295df8ed3`.
- `isDemo` field → declared on `base44/entities/User.jsonc`.