// Rank system: Rank Points (RP) are only earned/lost in PvP matches.
export const RANKS = [
  { name: "Bronze", min: 0, max: 999, color: "#CD7F32" },
  { name: "Silver", min: 1000, max: 1999, color: "#C0C0C0" },
  { name: "Gold", min: 2000, max: 2999, color: "#FFD700" },
  { name: "Apex", min: 3000, max: 3999, color: "#FF8C42" },
  { name: "Feral", min: 4000, max: 4999, color: "#E63946" },
  { name: "Mythic", min: 5000, max: 5999, color: "#B983FF" },
  { name: "Titan", min: 6000, max: 6999, color: "#8D99AE" },
  { name: "Primordial", min: 7000, max: 7999, color: "#6C63FF" },
  { name: "Ascendant", min: 8000, max: 8999, color: "#00E5FF" },
  { name: "Eternal Apex", min: 9000, max: Infinity, color: "#FFD700" },
];

export function getRankIndex(rp) {
  const points = rp || 0;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (points >= RANKS[i].min) return i;
  }
  return 0;
}

export function getRankByRP(rp) {
  const index = getRankIndex(rp);
  return { ...RANKS[index], index, number: index + 1 };
}

// currentStreak: positive number = current consecutive win streak, negative = consecutive loss streak
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

export function updateStreak(currentStreak, isWin) {
  const streak = currentStreak || 0;
  if (isWin) return streak > 0 ? streak + 1 : 1;
  return streak < 0 ? streak - 1 : -1;
}