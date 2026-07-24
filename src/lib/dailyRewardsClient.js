// Frontend helper mirroring the backend's EST-day logic, used only to decide button eligibility.
export function getEstDateString() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

export function canClaimDailyReward(user) {
  if (!user) return false;
  return user.lastDailyRewardClaimedAt !== getEstDateString();
}