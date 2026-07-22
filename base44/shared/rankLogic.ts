// Shared rank/RP calculation logic used by PvP backend functions.
export const RANKS = [
  { name: "Bronze", min: 0 },
  { name: "Silver", min: 1000 },
  { name: "Gold", min: 2000 },
  { name: "Apex", min: 3000 },
  { name: "Feral", min: 4000 },
  { name: "Mythic", min: 5000 },
  { name: "Titan", min: 6000 },
  { name: "Primordial", min: 7000 },
  { name: "Ascendant", min: 8000 },
  { name: "Eternal Apex", min: 9000 },
];

export function getRankIndex(rp) {
  const points = rp || 0;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (points >= RANKS[i].min) return i;
  }
  return 0;
}

// currentStreak: positive = current win streak, negative = current loss streak
export function calculateRPChange(rp, opponentRP, isWin, pvpGamesPlayed, currentStreak = 0) {
  const myIndex = getRankIndex(rp);
  let delta;

  if ((pvpGamesPlayed || 0) < 10) {
    delta = isWin ? 50 : -25;
  } else {
    const oppIndex = getRankIndex(opponentRP);
    const diff = myIndex - oppIndex;
    let win, loss;
    if (diff === 0) {
      win = 25;
      loss = -15;
    } else if (diff === 1) {
      win = 30;
      loss = -10;
    } else if (diff === -1) {
      win = 15;
      loss = -30;
    } else if (diff >= 2) {
      win = 50;
      loss = -5;
    } else {
      win = 10;
      loss = -50;
    }
    delta = isWin ? win : loss;
    if (isWin && currentStreak >= 5) delta += 5;
    if (!isWin && currentStreak <= -5) delta -= 5;
  }

  const newRP = Math.max(0, (rp || 0) + delta);
  return { delta, newRP };
}