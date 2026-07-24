// Shared daily-reward config used by claimDailyReward.
// 20 possible coin rewards, weighted so smaller amounts are more common than the jackpot.
export const REWARD_TABLE = [
  { amount: 50, weight: 18 },
  { amount: 75, weight: 16 },
  { amount: 100, weight: 14 },
  { amount: 150, weight: 12 },
  { amount: 200, weight: 10 },
  { amount: 250, weight: 9 },
  { amount: 300, weight: 8 },
  { amount: 400, weight: 7 },
  { amount: 500, weight: 6 },
  { amount: 600, weight: 5 },
  { amount: 750, weight: 4 },
  { amount: 900, weight: 3.5 },
  { amount: 1000, weight: 3 },
  { amount: 1250, weight: 2.5 },
  { amount: 1500, weight: 2 },
  { amount: 1750, weight: 1.5 },
  { amount: 2000, weight: 1 },
  { amount: 2250, weight: 0.75 },
  { amount: 2400, weight: 0.5 },
  { amount: 2500, weight: 0.25 },
];

export function pickReward() {
  const totalWeight = REWARD_TABLE.reduce((sum, r) => sum + r.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const reward of REWARD_TABLE) {
    roll -= reward.weight;
    if (roll <= 0) return reward.amount;
  }
  return REWARD_TABLE[0].amount;
}

// Returns today's calendar date string (YYYY-MM-DD) in the America/New_York (EST/EDT) timezone.
export function getEstDateString() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date()); // en-CA gives YYYY-MM-DD
}