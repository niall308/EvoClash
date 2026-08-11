// Stable bot entries injected into the PvP leaderboards so the rankings look
// populated even before many real players have competed. Stats are generated
// once with a fixed seed so the standings stay consistent between calls
// (shuffling every request would look fake/impossible to climb).

const BOT_NAMES = [
  "ShadowReaper", "BlazeFury", "NovaStorm", "IronViper", "CrimsonWolf",
  "FrostByte", "ThunderClaw", "Venom Strike", "RuneWeaver", "StormBringer",
  "Obsidian", "GoldenTalon", "NightHawk", "Ember Tooth", "Tidal Wave",
  "Stone Guardian", "Phantom Edge", "Solaris", "Wraith", "Magma Core",
  "Zephyr", "Onyx", "Cerberus", "Hydra King", "Griffin",
  "Wildfire", "Dread Knight", "Aero", "Cobalt", "Tempest",
  "Ravager", "Spectre", "Drako", "Lycaon", "Kitsune",
  "Boreal", "Ignis", "Maelstrom", "Quake", "Glacial",
  "Sabre", "Talon", "Vortex", "Raptor", "Wyvern",
  "Dusk", "Riptide", "Saber", "Ronin", "Apex",
];

// mulberry32 — tiny deterministic PRNG so bot stats are identical every call.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface LeaderboardBot {
  full_name: string;
  wins: number;
  losses: number;
  streak: number;
  weeklyWins: number;
}

const bots: LeaderboardBot[] = (() => {
  const rng = mulberry32(20260811);
  return BOT_NAMES.map((name) => {
    const wins = 8 + Math.floor(rng() * 420);
    const losses = 2 + Math.floor(rng() * 160);
    const streak = 1 + Math.floor(rng() * 32);
    const weeklyWins = 1 + Math.floor(rng() * 45);
    return { full_name: name, wins, losses, streak, weeklyWins };
  });
})();

export function getBotsForWinsLeaderboard(): { full_name: string; wins: number; losses: number }[] {
  return bots.map((b) => ({ full_name: b.full_name, wins: b.wins, losses: b.losses }));
}

export function getBotsForStreakLeaderboard(): { full_name: string; streak: number }[] {
  return bots.map((b) => ({ full_name: b.full_name, streak: b.streak }));
}

export function getBotsForWeeklyLeaderboard(): { full_name: string; wins: number }[] {
  return bots.map((b) => ({ full_name: b.full_name, wins: b.weeklyWins }));
}