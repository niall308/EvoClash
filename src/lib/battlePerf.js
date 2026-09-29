// Performance helpers for the battle turn pipeline.
//
// The original loop fired a long synchronous block of buff math + power
// consumption + damage resolution, then sat inside hardcoded 600–3000ms
// setTimeout sleeps. On mid-range mobile devices the synchronous block
// dropped frames (no paint between commits) and the fixed waits made the
// turn feel sluggish. These helpers do two things:
//
//   1. adaptiveDelay() — scale every beat by a coarse device-speed tier so
//      fast devices get snappy timing and slower devices keep just enough
//      time to read the action, instead of one fixed 3s pause for everyone.
//   2. nextFrame() — resolve on the next requestAnimationFrame so the caller
//      can yield between heavy state commits, letting the browser paint the
//      intermediate state instead of janking through one giant sync block.
//
// Neither helper changes any battle rule, damage value, or turn order — they
// only affect *when* work runs and *how long* the purely-visual beats last.

let _speedFactor = null;

// Coarse device-speed tier, detected once and cached. Lower factor = faster
// device = shorter waits. We combine core count (navigator.hardwareConcurrency)
// and RAM (navigator.deviceMemory, where available) into one multiplier.
function getSpeedFactor() {
  if (_speedFactor !== null) return _speedFactor;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4; // GB; optional API, falls back to 4
  let f;
  if (cores >= 8 && mem >= 4) f = 0.45;     // flagship / desktop
  else if (cores >= 6 || mem >= 4) f = 0.6;  // mid-range phones (the target)
  else if (cores >= 4) f = 0.75;             // low-end phones
  else f = 0.9;                               // very low-end — keep beats readable
  _speedFactor = f;
  return f;
}

// Scale a base delay by the device tier, clamped to a 180ms floor so no beat
// is too fast to perceive. Replaces hardcoded sleep(ms) values in the loop.
export function adaptiveDelay(baseMs) {
  return Math.max(180, Math.round(baseMs * getSpeedFactor()));
}

// Resolves on the next animation frame. Inserted between heavy synchronous
// state commits so the browser paints the consumed-power / pre-damage state
// before the next phase mutates state again.
export function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}