// Per-user daily quota for paid AI image generation (generateCardArt). Caps the
// unbounded cost/abuse vector where any signed-in user could otherwise loop the
// endpoint 24/7 without creating a card or paying. Counters live on the User
// entity (cardArtDailyCount / cardArtResetAt).
export const CARD_ART_DAILY_LIMIT = 40;
const DAY_MS = 24 * 60 * 60 * 1000;

// Checks the user's daily card-art quota and, if within limits, increments the
// server-side counter (resetting the window when stale). Throws when the user
// is over the daily limit, so the caller returns an error response.
export async function enforceCardArtQuota(base44: any, user: any) {
  const now = Date.now();
  const resetAt = user.cardArtResetAt ? new Date(user.cardArtResetAt).getTime() : 0;
  const within = resetAt && now - resetAt <= DAY_MS;
  const count = within ? Number(user.cardArtDailyCount) || 0 : 0;
  if (count >= CARD_ART_DAILY_LIMIT) {
    throw new Error('Daily card-art generation limit reached. Try again later.');
  }
  const update: any = { cardArtDailyCount: count + 1 };
  if (!within) update.cardArtResetAt = new Date(now).toISOString();
  await base44.asServiceRole.entities.User.update(user.id, update);
}