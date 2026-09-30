import { base44 } from "@/api/base44Client";

// Singleton sound engine (no React). Loads SoundAsset records once, manages the
// two looping BGM tracks (menu / in-game) and plays one-shot action SFX through a
// priority + concurrency model so intense battles don't clip, stack into a wall
// of noise, or drain battery on mobile. Components import `play`; SoundProvider
// drives lifecycle/toggles.

let assets = {}; // key -> { fileUrl, isLoop }
let settings = { menuMusic: true, inGameMusic: true, actions: true };
let bgmAudio = null; // current BGM HTMLAudioElement
let currentBgmKey = null;
let loaded = false;

// ---- SFX priority / concurrency policy -------------------------------------
// Higher tier = always audible. Low tiers are dropped first when the concurrent
// cap is hit and silenced first in low-power mode, so the sounds players care
// about (hits, defeats, rewards, win/lose) always cut through.
const PRIORITY = { critical: 3, normal: 2, low: 1 };
const PRIORITY_FOR_KEY = {
  win: "critical", lose: "critical", rank_up: "critical",
  card_defeat: "critical", critical_hit: "critical", reward_claim: "critical",
  attack: "normal", card_flip: "normal", card_gen: "normal",
  unique_card_gen: "normal", card_upgrade: "normal",
  button_tap: "low",
};
const VOLUME_FOR_PRIORITY = { critical: 0.7, normal: 0.55, low: 0.4 };

const MAX_CONCURRENT_SFX = 6;       // hard cap on simultaneous one-shots
const LOW_POWER_MAX_CONCURRENT = 3; // cap while in low-power mode
const SAME_KEY_THROTTLE_MS = 70;     // same key re-fired within this window is dropped
const LOW_PRIORITY_THROTTLE_MS = 110; // low-priority keys throttle a bit harder
const BGM_NORMAL_VOLUME = 0.35;
const BGM_DUCK_VOLUME = 0.12;       // BGM volume while a critical SFX is playing
const BGM_DUCK_HOLD_MS = 700;        // how long the duck holds after the critical SFX
// Auto low-power: if this many SFX fire inside the window, throttle low-priority
// sounds for the cooldown to protect battery and tame a noisy burst.
const BURST_THRESHOLD = 12;
const BURST_WINDOW_MS = 1000;
const BURST_COOLDOWN_MS = 3000;

// Per-key last-fire timestamp (throttle), rolling fire history (burst detect),
// and the active one-shot pool: { audio, key, priority, startedAt, release }.
const lastFireAt = {};
const recentFires = [];
let lowPowerMode = false;        // manual override (e.g. battery saver / setting)
let burstLowPowerUntil = 0;     // auto-cooldown expiry timestamp
let bgmDucked = false;
let bgmDuckTimer = null;
const playingPool = new Set();

export function isSoundLoaded() {
  return loaded;
}

function isLowPowerActive() {
  return lowPowerMode || Date.now() < burstLowPowerUntil;
}

// (Re)fetch all SoundAsset records and rebuild the in-memory map. Called on app
// start and after any admin upload/delete so changes take effect immediately.
export async function loadSoundAssets() {
  try {
    const list = await base44.entities.SoundAsset.list(undefined, 100);
    const next = {};
    for (const a of list) next[a.key] = { fileUrl: a.fileUrl, isLoop: !!a.isLoop };
    assets = next;
    loaded = true;
    refreshBgm();
  } catch {
    // First run before any assets exist, or a transient read error — stay silent.
  }
}

// Apply the user's sound toggles and re-evaluate the active BGM track.
export function setSoundSettings(s) {
  settings = {
    menuMusic: s.menuMusic !== false,
    inGameMusic: s.inGameMusic !== false,
    // The user field is `actionSounds` (see NotificationSettings). Gates every
    // one-shot SFX except the win/lose stingers, which ride the in-game music
    // toggle instead.
    actions: s.actionSounds !== false,
  };
  refreshBgm();
}

// Manual low-power toggle (e.g. wired to a battery-saver setting). While on,
// low-priority SFX are dropped and the concurrent cap tightens.
export function setLowPowerMode(on) {
  lowPowerMode = !!on;
}

// Start (or respawn) the BGM track for the given route path.
export function setBgmForRoute(path) {
  const isBattle = path.startsWith("/battle") || path.startsWith("/pvp-battle") || path.includes("/story-battle");
  const targetKey = isBattle ? "ingame_bgm" : "menu_bgm";
  if (currentBgmKey === targetKey) {
    refreshBgm();
    return;
  }
  currentBgmKey = targetKey;
  if (bgmAudio) {
    bgmAudio.pause();
    bgmAudio = null;
  }
  refreshBgm();
}

export function stopBgm() {
  if (bgmAudio) {
    bgmAudio.pause();
    bgmAudio = null;
  }
  if (bgmDuckTimer) {
    clearTimeout(bgmDuckTimer);
    bgmDuckTimer = null;
  }
  bgmDucked = false;
  currentBgmKey = null;
}

// Play a one-shot action SFX by key. Throttles repeat keys, enforces a concurrent
// cap with priority-based eviction (important cues preempt lesser ones), ducks
// BGM during critical events, and auto-enters low-power mode during bursts.
export function play(key) {
  // Win/lose are match-end stingers that belong with the in-game music toggle;
  // every other one-shot SFX is gated by the action-sounds toggle.
  if (key === "win" || key === "lose") {
    if (!settings.inGameMusic) return;
  } else if (!settings.actions) {
    return;
  }
  const asset = assets[key];
  if (!asset) return;

  const priority = PRIORITY_FOR_KEY[key] || "normal";
  const priorityVal = PRIORITY[priority];
  const now = Date.now();

  // Throttle the same key so rapid re-fires (quick taps, multi-hit effects) don't stack.
  const throttleMs = priority === "low" ? LOW_PRIORITY_THROTTLE_MS : SAME_KEY_THROTTLE_MS;
  if (now - (lastFireAt[key] || 0) < throttleMs) return;
  lastFireAt[key] = now;

  // Burst detection: too many SFX in a short window auto-enables low-power for
  // the cooldown, protecting battery and keeping the mix readable on mobile.
  recentFires.push(now);
  while (recentFires.length && now - recentFires[0] > BURST_WINDOW_MS) recentFires.shift();
  if (recentFires.length >= BURST_THRESHOLD) burstLowPowerUntil = now + BURST_COOLDOWN_MS;

  const lowPower = isLowPowerActive();
  // Low-power drops low-priority SFX entirely so the device only spends audio on
  // things the player needs to hear.
  if (lowPower && priorityVal <= PRIORITY.low) return;

  const maxConcurrent = lowPower ? LOW_POWER_MAX_CONCURRENT : MAX_CONCURRENT_SFX;

  // Enforce the concurrent cap. When full, evict the lowest-priority oldest entry
  // that ranks below the incoming sound. If nothing lower exists, the incoming
  // sound yields — which keeps a slot free so a later critical cue always lands.
  if (playingPool.size >= maxConcurrent) {
    let victim = null;
    for (const entry of playingPool) {
      if (PRIORITY[entry.priority] >= priorityVal) continue; // not lower than incoming
      if (
        !victim ||
        PRIORITY[entry.priority] < PRIORITY[victim.priority] ||
        (PRIORITY[entry.priority] === PRIORITY[victim.priority] && entry.startedAt < victim.startedAt)
      ) {
        victim = entry;
      }
    }
    if (victim) {
      victim.release();
    } else {
      return; // nothing lower to preempt — drop this one
    }
  }

  // Duck BGM so important cues cut through cleanly instead of fighting the music.
  if (priority === "critical") duckBgm();

  try {
    const a = new Audio(asset.fileUrl);
    a.loop = false;
    a.volume = VOLUME_FOR_PRIORITY[priority];
    const entry = { audio: a, key, priority, startedAt: now };
    const release = () => {
      if (entry.released) return;
      entry.released = true;
      playingPool.delete(entry);
      try { a.pause(); a.src = ""; } catch { /* already torn down */ }
    };
    entry.release = release;
    playingPool.add(entry);
    a.addEventListener("ended", release, { once: true });
    a.addEventListener("error", release, { once: true });
    a.play().catch(release);
  } catch {
    // Audio not available — ignore.
  }
}

// Preview an arbitrary file URL from the admin screen (bypasses the action toggle
// so admins can hear audio before/after uploading). Returns the Audio element so
// the caller can stop it.
export function playFileUrl(fileUrl, isLoop) {
  if (!fileUrl) return null;
  try {
    const a = new Audio(fileUrl);
    a.loop = !!isLoop;
    a.volume = 0.5;
    a.play().catch(() => {});
    return a;
  } catch {
    return null;
  }
}

// ---- BGM internals ---------------------------------------------------------

function duckBgm() {
  bgmDucked = true;
  applyBgmVolume();
  if (bgmDuckTimer) clearTimeout(bgmDuckTimer);
  bgmDuckTimer = setTimeout(unduckBgm, BGM_DUCK_HOLD_MS);
}

function unduckBgm() {
  bgmDucked = false;
  bgmDuckTimer = null;
  applyBgmVolume();
}

function applyBgmVolume() {
  if (bgmAudio) bgmAudio.volume = bgmDucked ? BGM_DUCK_VOLUME : BGM_NORMAL_VOLUME;
}

// Make sure the current BGM track matches the active key + settings, and keep its
// volume in sync with the current duck state.
function refreshBgm() {
  if (!currentBgmKey) return;
  const settingKey = currentBgmKey === "menu_bgm" ? "menuMusic" : "inGameMusic";
  const enabled = settings[settingKey];
  const asset = assets[currentBgmKey];
  if (!enabled || !asset) {
    if (bgmAudio) bgmAudio.pause();
    return;
  }
  if (!bgmAudio || bgmAudio.dataset.key !== currentBgmKey) {
    if (bgmAudio) bgmAudio.pause();
    bgmAudio = new Audio(asset.fileUrl);
    bgmAudio.dataset.key = currentBgmKey;
    bgmAudio.loop = asset.isLoop !== false; // BGM defaults to looping
    applyBgmVolume();
    bgmAudio.play().catch(() => {});
  } else if (bgmAudio.paused) {
    applyBgmVolume();
    bgmAudio.play().catch(() => {});
  } else {
    applyBgmVolume(); // keep duck state in sync on re-evaluation
  }
}