# "Claim All" Milestones — QA Checklist & PR Summary

## PR Summary

Made the Milestones "Claim All" button reliable, atomic, and correctly synced to
its audio.

### Changed files
- `base44/functions/claimAllMilestones/entry.ts` — **NEW** atomic backend
  function. Claims every earned-but-unclaimed milestone for the current user in a
  single `updateMe` (total coins + every claim counter at once). Returns the list
  of per-milestone rewards granted so the UI can animate each one. A replay finds
  nothing claimable and grants nothing → idempotent.
- `src/components/profile/ClaimAllButton.jsx` — **NEW** focused button component.
  Always visible; greyed + `aria-disabled` + tooltip when nothing is claimable.
  On click plays ONLY `button_tap`; after the single atomic server call it runs one
  staggered coin-fly burst per confirmed reward and fires `reward_claim` as each
  burst appears (never on click, never before animation). In-flight ref + server
  idempotency make rapid double/triple taps safe. Shows "Claiming…", an error
  "Retry" state (no audio/animation on failure), and a live claimable count.
- `src/components/profile/MilestonesSection.jsx` — uses `<ClaimAllButton>`
  instead of an inline loop. Single per-row claim now also fires `reward_claim`
  at the moment its coin animation appears.
- `docs/claim-all-qa.md` — this checklist.

### Audio assets used (admin-managed `SoundAsset` records, keyed by `key`)
- `button_tap` — the click SFX, played once on tap.
- `reward_claim` — the coin collection SFX, played as each coin-fly burst appears.

Both are played through the centralized SFX module `src/lib/soundEngine.js` via
`play(key)`, which debounces the same key (~70ms) to avoid stacking. The burst
stagger (90ms) is intentionally above that debounce so each of 1/3/20 rewards
plays its own coin sound.

## Manual test procedure

Open the published app (or preview) and the Milestones page.

### Test 1 — desktop & mobile, 1 / 3 / 20 rewards
1. Seed claimable milestones as needed (admin: set small targets on metrics the
   test account already exceeds) so the "Claim All" button shows count 1, then 3,
   then 20.
2. Resize:
   - desktop: `window.__base44_preview.setViewport('desktop')`
   - mobile:   `window.__base44_preview.setViewport('mobile')`
3. Tap **Claim All**.
   - **Expect:** a single `button_tap` sound at the moment of click (before any
     animation).
   - **Expect:** one `reward_claim` sound aligned with each coin-fly burst
     (≈90ms apart). For 20 rewards the timeline lasts ~1.8s + 0.9s last burst.
   - **Expect:** the button shows "Claiming…" then the bursts; afterwards it reverts
     to a greyed "Claim All (0)" with tooltip "No milestone rewards to claim right
     now" and `aria-disabled`.
4. Verify the global coin balance increases by the sum of the rewards and the
   milestone rows flip to "Claimed".

### Test 2 — network latency & failure
1. In browser devtools, throttle the network to "Slow 3G" and click Claim All.
   - **Expect:** button shows "Claiming…" spinner; no coin audio until the call
     resolves and the animation starts.
2. Force a failure: set network to "Offline" (or block the function URL) and click.
   - **Expect:** ~2s "Retry" error state; **no coin audio and no animation**.
     `aria-disabled` returns after the error clears.
3. Restore the network and retry — should now complete normally and grant exactly
   once (server is idempotent).

### Test 3 — rapid double/triple clicks
1. With claimable milestones present, double/triple-tap the button as fast as
   possible.
   - **Expect:** only the first tap is honored (in-flight ref). Subsequent taps
     are dropped. Exactly ONE `button_tap` and the configured number of
     `reward_claim` bursts — never doubled.
2. Click again immediately after completion while 0 are claimable: button is
   greyed + `aria-disabled`; tapping it does nothing and plays no audio.

### Test 4 — native WebView (iOS), `VITE_NATIVE_BUILD=true`
1. Build the iOS native app and open the Milestones page.
2. Tap Claim All.
   - **Expect:** `button_tap` plays (the tap is the user gesture that unlocks iOS
     audio for the page). Each `reward_claim` plays with its burst. No separate
     AudioContext resume is needed — `soundEngine` uses HTMLAudioElement one-shots
     created inside the click handler, which is a first-party user gesture.
3. Background the app mid-animation, return, and tap again — audio resumes on the
   new tap (gesture).

## Sample audio-timing verification log (1 reward)

```
T+0.0ms   click  -> play("button_tap")            [click SFX]
T+0.0ms   button -> "Claiming…" spinner
T+~120ms  server 'claimAllMilestones' resolves
          data.claimed = [{ id, coins }]
T+120ms   status -> "animating"
T+120ms   setTimeout #0 fires
          -> play("reward_claim")                 [coin SFX, burst 0 appears]
          -> CoinFlyAnimation key=<ts>-0 renders at button origin
T+~1020ms burst 0 onDone -> removed
T+~1020ms user refreshed, coins-claimed dispatched
          button -> greyed "Claim All (0)", aria-disabled=true
```

Repeat with 3 rewards → `reward_claim` at T+120, T+210, T+300ms.
Repeat with 20 rewards → `reward_claim` every ~90ms across ~1.8s.