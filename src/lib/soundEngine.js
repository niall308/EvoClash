import { base44 } from "@/api/base44Client";

// Singleton sound engine (no React) — loads SoundAsset records once, manages the
// two looping background-music tracks (menu vs in-game) and plays one-shot action
// SFX. Components import `play` directly; SoundProvider drives lifecycle/toggles.

let assets = {}; // key -> { fileUrl, isLoop }
let settings = { menuMusic: true, inGameMusic: true, actions: true };
let bgmAudio = null; // current BGM HTMLAudioElement
let currentBgmKey = null;
let loaded = false;
let lastActionKey = null;
let lastActionTime = 0;
// Holds strong refs to in-flight one-shot Audio elements so the browser can't
// garbage-collect them before the (async) media has loaded/finished. Without
// this, rarely-fired SFX (card_defeat, win, lose, reward_claim) would get
// collected mid-load and play silently while hot keys (button_tap, attack)
// stayed cached and worked.
const playingPool = new Set();

export function isSoundLoaded() {
  return loaded;
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
  } catch (e) {
    // First run before any assets exist, or a transient read error — stay silent.
  }
}

// Apply the user's sound toggles and re-evaluate the active BGM track.
export function setSoundSettings(s) {
  settings = {
    menuMusic: s.menuMusic !== false,
    inGameMusic: s.inGameMusic !== false,
    // The user field is `actionSounds` (see NotificationSettings). Gate every
    // one-shot SFX except the win/lose stingers, which ride the in-game music
    // toggle instead.
    actions: s.actionSounds !== false,
  };
  refreshBgm();
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
  currentBgmKey = null;
}

// Play a one-shot action SFX by key. Throttles the same key to avoid stacking
// when an event fires rapidly (e.g. quick taps).
export function play(key) {
  // Win/lose are match-end stingers that belong with the in-game music toggle;
  // every other one-shot SFX (button taps, attacks, flips, rewards, etc.) is
  // gated by the action-sounds toggle.
  if (key === "win" || key === "lose") {
    if (!settings.inGameMusic) return;
  } else if (!settings.actions) {
    return;
  }
  const asset = assets[key];
  if (!asset) return;
  const now = Date.now();
  if (key === lastActionKey && now - lastActionTime < 70) return;
  lastActionKey = key;
  lastActionTime = now;
  try {
    const a = new Audio(asset.fileUrl);
    a.loop = false;
    a.volume = 0.55;
    playingPool.add(a);
    const release = () => playingPool.delete(a);
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

// Internal: make sure the current BGM track matches the active key + settings.
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
    bgmAudio.volume = 0.35;
    bgmAudio.play().catch(() => {});
  } else if (bgmAudio.paused) {
    bgmAudio.play().catch(() => {});
  }
}