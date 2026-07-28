// Basic profanity check used for user-facing text like usernames.
const BANNED_WORDS = [
  "fuck", "shit", "bitch", "asshole", "cunt", "dick", "pussy", "bastard",
  "nigger", "nigga", "faggot", "fag", "retard", "whore", "slut", "cock",
  "twat", "wanker", "motherfucker", "dumbass", "jackass",
];

export function containsProfanity(text: string): boolean {
  const normalized = text.toLowerCase().replace(/[^a-z0-9]/g, "");
  return BANNED_WORDS.some((word) => normalized.includes(word));
}