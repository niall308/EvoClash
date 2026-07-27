// Shared daily-reward config used by claimDailyReward.
// Reward is a 4-digit number formed from independent slot digits:
// digit 1 (thousands): 0-2, weighted so 0 is common and 2 is rare (jackpot range).
// digits 2-4 (hundreds/tens/ones): 0-9, uniform.
const DIGIT_1_WEIGHTS = [
  { value: 0, weight: 70 },
  { value: 1, weight: 25 },
  { value: 2, weight: 5 },
];

function pickDigit1() {
  const totalWeight = DIGIT_1_WEIGHTS.reduce((sum, r) => sum + r.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of DIGIT_1_WEIGHTS) {
    roll -= entry.weight;
    if (roll <= 0) return entry.value;
  }
  return DIGIT_1_WEIGHTS[0].value;
}

export function pickReward() {
  const d1 = pickDigit1();
  const d2 = Math.floor(Math.random() * 10);
  const d3 = Math.floor(Math.random() * 10);
  const d4 = Math.floor(Math.random() * 10);
  return d1 * 1000 + d2 * 100 + d3 * 10 + d4;
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