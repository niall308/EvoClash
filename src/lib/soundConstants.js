// The complete catalog of in-game sounds. Each entry maps to a SoundAsset record
// (keyed by `key`) that an admin uploads in the Sound Manager. The engine reads
// these records at runtime to know which file URL to play and whether to loop.
export const SOUND_KEYS = [
  { key: "menu_bgm", label: "Menu Background Music", category: "menu", isLoop: true },
  { key: "ingame_bgm", label: "In-Game Background Music", category: "ingame", isLoop: true },
  { key: "button_tap", label: "Button Tap", category: "action" },
  { key: "reward_claim", label: "Reward Claim", category: "action" },
  { key: "card_flip", label: "Card Flip", category: "action" },
  { key: "attack", label: "Attack Sound", category: "action" },
  { key: "critical_hit", label: "Critical Hit", category: "action" },
  { key: "card_defeat", label: "Card Defeat", category: "action" },
  { key: "win", label: "Win Sound", category: "action" },
  { key: "lose", label: "Lose Sound", category: "action" },
  { key: "rank_up", label: "Level Up Rank Sound", category: "action" },
  { key: "card_upgrade", label: "Upgrade Card Sound", category: "action" },
  { key: "unique_card_gen", label: "Unique Card Generation Sound", category: "action" },
  { key: "card_gen", label: "Card Generation Sound", category: "action" },
  { key: "heal", label: "Heal Sound", category: "action" },
];

export const SOUND_MAP = Object.fromEntries(SOUND_KEYS.map((s) => [s.key, s]));