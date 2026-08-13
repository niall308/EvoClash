// Shared daily-reward config used by claimDailyReward.
// Reward is rolled in one of three weighted tiers within the 0–1500 range:
//   ~70%: 0–500     (common)
//   ~25%: 501–999   (uncommon)
//   ~5%:  1000–1500 (jackpot)
const REWARD_TIERS = [
  { min: 0, max: 500, weight: 70 },
  { min: 501, max: 999, weight: 25 },
  { min: 1000, max: 1500, weight: 5 },
];

function pickTier() {
  const totalWeight = REWARD_TIERS.reduce((sum, r) => sum + r.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of REWARD_TIERS) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return REWARD_TIERS[0];
}

export function pickReward() {
  const tier = pickTier();
  return Math.floor(Math.random() * (tier.max - tier.min + 1)) + tier.min;
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