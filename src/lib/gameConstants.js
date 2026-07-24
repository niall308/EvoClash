export const TYPES = ["Fire", "Lava", "Water", "Ice", "Rock", "Wind", "Earth", "Magic"];

export const TYPE_COLORS = {
  Fire: "#FF4500",
  Lava: "#FF6B00",
  Water: "#1E90FF",
  Ice: "#00BFFF",
  Rock: "#8B7355",
  Wind: "#90EE90",
  Earth: "#8B4513",
  Magic: "#9B59B6",
};

export const TYPE_ADVANTAGES = {
  Fire: ["Ice", "Rock", "Wind"],
  Lava: ["Rock", "Earth", "Ice"],
  Water: ["Fire", "Lava", "Magic"],
  Ice: ["Wind", "Earth", "Magic"],
  Rock: ["Earth", "Wind", "Ice"],
  Wind: ["Magic", "Water", "Lava"],
  Earth: ["Wind", "Ice", "Magic"],
  Magic: ["Rock", "Fire", "Lava"],
};

export const CATEGORIES = ["Dinosaur", "Extinct Animal", "Mythical Creature"];
export const HYBRID_CATEGORY = "Hybrid";
export const HYPER_RARE_TYPE = "Hyper Rare";
export const HYBRID_CHANCE = 0.005; // 0.5% chance per generation
export const HYBRID_TIERS = [3, 4];
export const HYBRID_MIN_ATTACK = 7300;
export const HYBRID_MIN_DEFENSE = 5000;
export const HYBRID_BONUS_DAMAGE = 1000;

export const CREATURES = {
  Dinosaur: ["Tyrannosaurus Rex", "Velociraptor", "Triceratops", "Stegosaurus", "Spinosaurus", "Brachiosaurus", "Ankylosaurus", "Pterodactyl"],
  "Extinct Animal": ["Woolly Mammoth", "Saber-Tooth Tiger", "Dodo Bird", "Giant Sloth", "Cave Bear", "Irish Elk", "Dire Wolf", "Moa Bird"],
  "Mythical Creature": ["Fire Dragon", "Phoenix", "Griffin", "Kraken", "Chimera", "Hydra", "Basilisk", "Unicorn"],
};

// Real anatomy/body-plan description for each creature, used to keep AI-generated art
// true to the actual creature instead of drifting toward the reference image's subject.
export const CREATURE_ANATOMY = {
  "Tyrannosaurus Rex": "a massive bipedal theropod dinosaur with a huge head, powerful jaws lined with sharp teeth, tiny clawed arms, a thick muscular tail, and heavy clawed feet",
  "Velociraptor": "a lean, feathered bipedal raptor with sickle-shaped claws on its feet, a long stiff tail, and a narrow snout",
  "Triceratops": "a quadrupedal dinosaur with a large bony neck frill, three long horns on its face, and a stocky armored body",
  "Stegosaurus": "a quadrupedal dinosaur with a row of large bony plates running along its spine and sharp spikes at the end of its tail",
  "Spinosaurus": "a long-snouted semi-aquatic dinosaur with a tall sail-like fin running down its back and powerful clawed forelimbs",
  "Brachiosaurus": "a massive long-necked quadrupedal dinosaur with a tiny head high above its shoulders and thick pillar-like legs",
  "Ankylosaurus": "a low, wide, heavily armored quadrupedal dinosaur covered in bony plates with a heavy club at the end of its tail",
  "Pterodactyl": "a flying reptile with long leathery wings stretched between elongated finger bones, a crested head, and a sharp beak — no legs used for standing, shown airborne or perched",
  "Woolly Mammoth": "a massive furry elephant-like creature with long curved tusks, small ears, and thick shaggy fur",
  "Saber-Tooth Tiger": "a muscular big cat with an extremely long pair of curved saber fangs jutting from its upper jaw",
  "Dodo Bird": "a plump flightless bird with a large curved beak, small stubby wings, and stout legs",
  "Giant Sloth": "a huge shaggy-furred ground sloth with long curved claws and a hunched, lumbering posture",
  "Cave Bear": "a massive prehistoric bear with a broad skull, thick fur, and powerful clawed paws",
  "Irish Elk": "a large deer with enormous palmate antlers spanning wider than its entire body",
  "Dire Wolf": "a large, muscular wolf with a broad skull, thick fur, and powerful jaws",
  "Moa Bird": "a tall flightless bird with a long neck, small head, and powerful legs — no visible wings",
  "Fire Dragon": "a serpentine reptilian dragon standing on four clawed legs, with large leathery bat-like wings, a long sinuous scaled body, horns on its head, and a long whip-like tail — never a bipedal dinosaur silhouette",
  "Phoenix": "a majestic fire bird with vast blazing feathered wings, a long flowing tail of flame, and an elegant crested head",
  "Griffin": "a creature with the front half of an eagle — including feathered wings, a hooked beak, and taloned front legs — and the hind half of a lion",
  "Kraken": "a colossal octopus/squid-like sea monster with a large soft bulbous head, big round eyes, a small beak-like mouth with NO teeth and NO reptilian jaw, and many long writhing rubbery tentacles covered in suckers instead of legs or arms — never a toothy reptilian face",
  "Chimera": "a creature with a lion's muscular body, a goat's head emerging from its back, and a serpent's head at the end of its tail",
  "Hydra": "a serpentine reptilian body with multiple long necks, each ending in its own snarling reptilian head",
  "Basilisk": "a giant legless serpent with a crowned, crested head and hypnotic glowing eyes",
  "Unicorn": "a graceful horse-like creature with a single long spiraled horn on its forehead and a flowing mane and tail",
};

// Pose/stance variety for generated creature art, picked at random per generation.
export const CREATURE_STANCES = [
  "in an aggressive roaring stance, baring its full power",
  "crouched low in a hunting stance, ready to strike",
  "standing tall in a majestic, commanding pose",
  "captured mid-motion in a powerful charging pose",
  "rearing up dramatically, showcasing its full form",
  "in a fierce battle-ready pose with its weapons bared",
  "coiled and poised to strike",
  "leaping forward in a dynamic mid-air attack pose",
];

// "predator" creatures always get higher attack than defense, "prey" creatures always get higher defense than attack
export const CREATURE_ROLES = {
  "Tyrannosaurus Rex": "predator",
  "Velociraptor": "predator",
  "Triceratops": "prey",
  "Stegosaurus": "prey",
  "Spinosaurus": "predator",
  "Brachiosaurus": "prey",
  "Ankylosaurus": "prey",
  "Pterodactyl": "predator",
  "Woolly Mammoth": "prey",
  "Saber-Tooth Tiger": "predator",
  "Dodo Bird": "prey",
  "Giant Sloth": "prey",
  "Cave Bear": "predator",
  "Irish Elk": "prey",
  "Dire Wolf": "predator",
  "Moa Bird": "prey",
  "Fire Dragon": "predator",
  "Phoenix": "prey",
  "Griffin": "predator",
  "Kraken": "predator",
  "Chimera": "predator",
  "Hydra": "predator",
  "Basilisk": "predator",
  "Unicorn": "prey",
};

export const TIER_RANGES = {
  1: { statMin: 1, statMax: 2500, bonusMin: 0, bonusMax: 125 },
  2: { statMin: 2501, statMax: 5000, bonusMin: 126, bonusMax: 200 },
  3: { statMin: 5001, statMax: 7500, bonusMin: 201, bonusMax: 250 },
  4: { statMin: 7501, statMax: 10000, bonusMin: 251, bonusMax: 300 },
};

// Flat, lifetime requirement a card must meet (once) before any tier upgrade.
export const UPGRADE_REQUIREMENT = { cardsDestroyed: 100, gamesPlayed: 200, matchWins: 50 };

export const CARD_BACK_URL = "https://media.base44.com/images/public/6a4fdbc484df527c16219edb/c758e901f_EvoClashCardBack.png";
export const TURN_TIME_LIMIT_SECONDS = 300;
export const MAX_CONSECUTIVE_TURN_TIMEOUTS = 3;
export const STYLE_REFERENCE_URL = "https://media.base44.com/images/public/6a4fdbc484df527c16219edb/636b60708_Style.png";

export const AI_OPPONENT_NAMES = [
  "Commander Rex", "Shadow Viper", "Iron Warden", "Blaze Hunter", "Frost Reaper",
  "Storm Breaker", "Rogue Tamer", "Void Walker", "Ember Knight", "Crimson Fang",
];

export const NAME_PARTS = {
  1: { prefixes: ["Feral", "Ancient", "Savage", "Wild", "Primal", "Rampant", "Untamed", "Rogue", "Vicious", "Cunning", "Restless", "Fierce"] },
  2: { prefixes: ["Ironclad", "Knight", "Steel", "Armored", "Iron", "Guardian", "Warlord", "Vanguard", "Bulwark", "Sentinel", "Crested", "Battle-Forged"] },
  3: { prefixes: ["Cyber", "Mecha", "Nano", "Techno", "Quantum", "Hyper", "Volt", "Circuit", "Plasma", "Neon"], suffixes: ["X", "Bot", "Unit", "Core", "Drive", "Node", "Matrix", "Cipher"] },
  4: { prefixes: ["Omega", "Titan", "Apex", "Prime", "X-99", "Eternal", "Celestial", "Doom", "Infinity", "Genesis"], suffixes: ["Prime", "Core", "Overlord", "Ultra", "Zenith", "Ascendant", "Sovereign", "Infinity"] },
};

// Prefix pool used when a card evolves into Tier 4
export const TIER4_PREFIXES = ["Mega", "Prime", "Ultimate", "Dreaded", "Devastating"];

// Armor/visual evolution prompts by the tier being evolved INTO
export const EVOLVE_ARMOR_PROMPTS = {
  2: "The same creature, now wearing bronze age armor plating, dynamic full-body illustration, matching the exact art style, color palette, lighting, and mystical trading-card aesthetic of the reference image, centered on a plain background, no text, no border, no frame",
  3: "The same creature, now wearing gleaming silver metal armor plating that fully replaces any previous bronze armor, dynamic full-body illustration, matching the exact art style, color palette, lighting, and mystical trading-card aesthetic of the reference image, centered on a plain background, no text, no border, no frame",
  4: "The same creature, with all previous armor removed, now fully transformed into a robotic being made of silver and gold metal plating, dynamic full-body illustration, matching the exact art style, color palette, lighting, and mystical trading-card aesthetic of the reference image, centered on a plain background, no text, no border, no frame",
};

// Coin economy (LC)
export const COINS_PER_CARD_DEFEATED = 50;
export const COINS_WIN_AI = 250;
export const COINS_LOSS_AI = 50;
export const COINS_FORFEIT = 0;
export const COINS_WIN_HUMAN = 500;
export const COINS_LOSS_HUMAN = 150;
// Bonus LC added on top of COINS_WIN_AI, based on the AI difficulty beaten
export const AI_DIFFICULTY_WIN_BONUS = { Easy: 25, Normal: 50, Hard: 75, Extreme: 125 };

// Real-money LC purchase packs (Buy Coins screen)
export const COIN_PACKS = [
  { id: "pack_small", coins: 25000, priceUsd: 2 },
  { id: "pack_medium", coins: 80000, priceUsd: 6 },
  { id: "pack_large", coins: 175000, priceUsd: 12 },
];

// Lifetime per-card milestones (never reset by tier upgrades)
export const CARD_MILESTONES = [
  { id: "wins50", type: "totalWins", target: 50, coinReward: 1000 },
  { id: "wins100", type: "totalWins", target: 100, coinReward: 5000 },
  { id: "games200", type: "totalGames", target: 200, coinReward: 2500 },
];

// Coin-purchasable stat upgrades on the Card Upgrade screen.
// Tier 1: each stat can be upgraded twice (cost doubles on the 2nd use, uses "cost" below).
// Tiers 2-4: each stat can be upgraded once, at a flat cost per tier (see TIER_STAT_UPGRADE_COST).
export const STAT_UPGRADES = [
  { key: "attack", label: "Attack", cost: 5000, percent: 10 },
  { key: "defense", label: "Defense", cost: 5000, percent: 10 },
  { key: "bonusDamage", label: "Bonus Damage", cost: 3000, percent: 15 },
];

export const MAX_STAT_UPGRADES_PER_TIER = { 1: 2, 2: 1, 3: 1, 4: 1 };
export const TIER_STAT_UPGRADE_COST = { 2: 20000, 3: 35000, 4: 50000 };

export const TIER_UPGRADE_COST = 15000;

export const TYPE_CHANGE_COST = 100000;

export const DECK_COST = 250000;
export const MAX_DECKS = 5;

// Card creation limits (Card Generate screen)
export const FREE_CARDS_INITIAL = 15;
export const FREE_CREATIONS_PER_DAY = 3;
export const EXTRA_CREATURE_COST = 25000;

// AI difficulty -> allowed card tiers the opponent draws from
export const AI_DIFFICULTY_TIERS = {
  Easy: [1],
  Normal: [1, 2],
  Hard: [2, 3],
  Extreme: [3, 4],
};

// Elemental attack visual effect grouping (stacks on the defending card)
export const TYPE_EFFECT_GROUP = {
  Fire: "burn",
  Lava: "burn",
  Ice: "freeze",
  Magic: "fade",
  Rock: "scratch",
  Earth: "scratch",
  Wind: "scratch",
  Water: "dissolve",
};

// Cost to instantly replenish an already-used tactical power
export const POWER_REPLENISH_COST = 10000;

// Power-up categories shown as filters on the Power Ups screen.
export const POWER_CATEGORIES = [
  { key: "attack", label: "Attack" },
  { key: "defense", label: "Defense" },
  { key: "health", label: "Health" },
  { key: "control", label: "Deck & Card Control" },
  { key: "upgrade", label: "Card Upgrades" },
  { key: "legendary", label: "Legendary" },
];

// Full catalog of tactical power-ups. cooldownType: "daily" (1 use/24h, usedAtField),
// "dailyMulti" (N uses/24h, usesField + resetField), "weekly" (1 use/7 days, usedAtField),
// "premium" (no free reset — must be bought before each use, usedAtField acts as an owned flag).
export const POWER_DEFINITIONS = [
  // Attack
  { key: "burn", label: "Burn", category: "attack", description: "Destroys the opponent's active card and forces them to draw a new one — no life lost.", replenishTime: "Resets every 24 hours", cooldownType: "daily", usedAtField: "burnPowerUsedAt", replenishCost: 10000 },
  { key: "doubleAttack", label: "2x Attack", category: "attack", description: "Your card's next attack deals double damage.", replenishTime: "Resets every 24 hours", cooldownType: "daily", usedAtField: "doubleAttackPowerUsedAt", replenishCost: 10000 },
  { key: "ignoreDefense", label: "Ignore Defense", category: "attack", description: "Ignore 50% of the opponent's defense on your next attack.", replenishTime: "Resets every 24 hours", cooldownType: "daily", usedAtField: "ignoreDefensePowerUsedAt", replenishCost: 10000 },
  { key: "trueDamage", label: "True Damage", category: "attack", description: "Your next attack deals true damage, ignoring all of the opponent's defense.", replenishTime: "Resets every 24 hours", cooldownType: "daily", usedAtField: "trueDamagePowerUsedAt", replenishCost: 10000 },
  { key: "critHit", label: "Guaranteed Crit", category: "attack", description: "Guarantees a critical hit on your next attack.", replenishTime: "Resets every 24 hours", cooldownType: "daily", usedAtField: "critHitPowerUsedAt", replenishCost: 10000 },
  { key: "doubleBonusDamage", label: "Double Bonus Damage", category: "attack", description: "Doubles your card's bonus damage on your next attack.", replenishTime: "5 uses per day", cooldownType: "dailyMulti", usesField: "doubleBonusDamagePowerUsesToday", resetField: "doubleBonusDamagePowerResetAt", maxPerDay: 5, replenishCost: 10000 },
  { key: "attackTwice", label: "Double Strike", category: "attack", description: "Attack twice in the same turn.", replenishTime: "Resets every 7 days", cooldownType: "weekly", usedAtField: "attackTwicePowerUsedAt", replenishCost: 100000 },

  // Defense
  { key: "defense", label: "3x Defense", category: "defense", description: "Triples your card's defense against the opponent's next attack.", replenishTime: "Resets every 24 hours", cooldownType: "daily", usedAtField: "defensePowerUsedAt", replenishCost: 10000 },
  { key: "block", label: "Block", category: "defense", description: "Completely blocks the opponent's next attack, taking zero damage.", replenishTime: "5 uses per day", cooldownType: "dailyMulti", usesField: "blockPowerUsesToday", resetField: "blockPowerResetAt", maxPerDay: 5, replenishCost: 5000 },
  { key: "halfAttack", label: "Half Attack", category: "defense", description: "Halves the opponent's attack for their next 2 attacks.", replenishTime: "2 uses per day", cooldownType: "dailyMulti", usesField: "halfAttackPowerUsesToday", resetField: "halfAttackPowerResetAt", maxPerDay: 2, replenishCost: 10000 },
  { key: "doubleDefense2Turns", label: "2x Defense (2 Turns)", category: "defense", description: "Doubles your card's defense for the next 2 turns.", replenishTime: "Resets every 24 hours", cooldownType: "daily", usedAtField: "doubleDefense2TurnsPowerUsedAt", replenishCost: 10000 },
  { key: "tripleDefense1Turn", label: "3x Defense (1 Turn)", category: "defense", description: "Triples your card's defense for 1 turn.", replenishTime: "Resets every 24 hours", cooldownType: "daily", usedAtField: "tripleDefense1TurnPowerUsedAt", replenishCost: 10000 },
  { key: "shield25", label: "Shield", category: "defense", description: "Gain a temporary shield equal to 25% of your max HP.", replenishTime: "Resets every 24 hours", cooldownType: "daily", usedAtField: "shield25PowerUsedAt", replenishCost: 10000 },
  { key: "negateNextAttack", label: "Negate Attack", category: "defense", description: "Negates all damage from the opponent's next attack.", replenishTime: "Resets every 24 hours", cooldownType: "daily", usedAtField: "negateNextAttackPowerUsedAt", replenishCost: 10000 },
  { key: "reduceDamage50", label: "Damage Reduction", category: "defense", description: "Reduces incoming damage by 50% for 2 turns.", replenishTime: "Resets every 24 hours", cooldownType: "daily", usedAtField: "reduceDamage50PowerUsedAt", replenishCost: 10000 },
  { key: "reflectDamage25", label: "Reflect Damage", category: "defense", description: "Reflects 25% of incoming damage back to the attacker.", replenishTime: "Resets every 24 hours", cooldownType: "daily", usedAtField: "reflectDamagePowerUsedAt", replenishCost: 10000 },
  { key: "regen10Percent3Turns", label: "Regeneration", category: "defense", description: "Regenerate 10% of max HP each turn for 3 turns.", replenishTime: "Resets every 24 hours", cooldownType: "daily", usedAtField: "regenPowerUsedAt", replenishCost: 10000 },
  { key: "surviveWith1HP", label: "Last Breath", category: "defense", description: "Survive with 1 HP if a hit would defeat you.", replenishTime: "Resets every 7 days", cooldownType: "weekly", usedAtField: "surviveWith1HPPowerUsedAt", replenishCost: 50000 },

  // Health
  { key: "heal20", label: "Heal 20%", category: "health", description: "Instantly heal 20% of your max HP.", replenishTime: "Resets every 24 hours", cooldownType: "daily", usedAtField: "heal20PowerUsedAt", replenishCost: 10000 },
  { key: "heal50", label: "Heal 50%", category: "health", description: "Instantly heal 50% of your max HP.", replenishTime: "Resets every 24 hours", cooldownType: "daily", usedAtField: "heal50PowerUsedAt", replenishCost: 30000 },
  { key: "fullRestore", label: "Full Restore", category: "health", description: "Fully restores your card's HP.", replenishTime: "Resets every 7 days", cooldownType: "weekly", usedAtField: "fullRestorePowerUsedAt", replenishCost: 100000 },
  { key: "maxHPBoost25", label: "Max HP Boost", category: "health", description: "Increases your max HP by 25% for this battle.", replenishTime: "Resets every 24 hours", cooldownType: "daily", usedAtField: "maxHPBoostPowerUsedAt", replenishCost: 10000 },
  { key: "restoreOnDefeat", label: "Restore On Defeat", category: "health", description: "Restores health whenever you defeat an opponent's card.", replenishTime: "Resets every 24 hours", cooldownType: "daily", usedAtField: "restoreOnDefeatPowerUsedAt", replenishCost: 10000 },
  { key: "healOnDamage10_3Turns", label: "Vampiric Strikes", category: "health", description: "Heal 10% of max HP whenever you deal damage, for 3 turns.", replenishTime: "Resets every 7 days", cooldownType: "weekly", usedAtField: "healOnDamagePowerUsedAt", replenishCost: 50000 },

  // Deck & Card Control
  { key: "reshuffle", label: "Redraw", category: "control", description: "Redraw your own hand, or force the opponent to redraw their active card.", replenishTime: "Resets every 24 hours", cooldownType: "daily", usedAtField: "reshufflePowerUsedAt", replenishCost: 10000 },
  { key: "swapActiveCard50HP", label: "Swap Card", category: "control", description: "Swap your active card with another from your deck, entering at 50% health.", replenishTime: "Resets every 24 hours", cooldownType: "daily", usedAtField: "swapCardPowerUsedAt", replenishCost: 10000 },
  { key: "returnOpponentCard", label: "Return Opponent Card", category: "control", description: "Returns the opponent's current card to their deck.", replenishTime: "Resets every 24 hours", cooldownType: "daily", usedAtField: "returnOpponentCardPowerUsedAt", replenishCost: 10000 },
  { key: "duplicateCard", label: "Duplicate Card", category: "control", description: "Duplicate your current card for the rest of this match.", replenishTime: "Resets every 7 days", cooldownType: "weekly", usedAtField: "duplicateCardPowerUsedAt", replenishCost: 50000 },

  // Card Upgrades
  { key: "t2Upgrade", label: "T2 Upgrade", category: "upgrade", description: "Temporarily boosts your card to randomized Tier 2 stats for its next attack.", replenishTime: "Resets every 7 days", cooldownType: "weekly", usedAtField: "t2UpgradePowerUsedAt", replenishCost: 50000 },
  { key: "t3Upgrade", label: "T3 Upgrade", category: "upgrade", description: "Temporarily boosts your card to randomized Tier 3 stats for its next attack.", replenishTime: "Resets every 7 days", cooldownType: "weekly", usedAtField: "t3UpgradePowerUsedAt", replenishCost: 75000 },
  { key: "t4Upgrade", label: "T4 Upgrade", category: "upgrade", description: "Temporarily boosts your card to randomized Tier 4 stats for its next attack.", replenishTime: "Resets every 7 days", cooldownType: "weekly", usedAtField: "t4UpgradePowerUsedAt", replenishCost: 100000 },
  { key: "upgradeTierOneBattle", label: "Battle Tier Up", category: "upgrade", description: "Upgrades your current card by one tier for this battle only.", replenishTime: "Resets every 24 hours", cooldownType: "daily", usedAtField: "upgradeTierPowerUsedAt", replenishCost: 10000 },
  { key: "maximizeAttackTurn", label: "Max Attack", category: "upgrade", description: "Maximizes your current card's attack for one turn.", replenishTime: "Resets every 7 days", cooldownType: "weekly", usedAtField: "maximizeAttackPowerUsedAt", replenishCost: 10000 },
  { key: "maximizeDefenseTurn", label: "Max Defense", category: "upgrade", description: "Maximizes your current card's defense for one turn.", replenishTime: "Resets every 7 days", cooldownType: "weekly", usedAtField: "maximizeDefensePowerUsedAt", replenishCost: 10000 },
  { key: "increaseAllStats20", label: "All Stats +20%", category: "upgrade", description: "Increases all of your card's stats by 20% for this battle.", replenishTime: "Buy 1 at a time", cooldownType: "premium", usedAtField: "increaseAllStatsOwned", replenishCost: 50000 },
  { key: "increaseBonusDamage100", label: "Bonus Damage +100", category: "upgrade", description: "Increases your card's bonus damage by 100.", replenishTime: "5 uses per day", cooldownType: "dailyMulti", usesField: "bonusDamage100PowerUsesToday", resetField: "bonusDamage100PowerResetAt", maxPerDay: 5, replenishCost: 5000 },

  // Legendary (very rare, purchase-only)
  { key: "timeFreeze", label: "Time Freeze", category: "legendary", description: "Opponent skips their next turn.", replenishTime: "Buy 1 at a time", cooldownType: "premium", usedAtField: "timeFreezeOwned", replenishCost: 50000 },
  { key: "lastStand", label: "Last Stand", category: "legendary", description: "If your card is defeated, immediately attack one final time.", replenishTime: "Buy 1 at a time", cooldownType: "premium", usedAtField: "lastStandOwned", replenishCost: 50000 },
  { key: "berserkerRage", label: "Berserker Rage", category: "legendary", description: "Gain 10% attack every turn while losing 5% defense.", replenishTime: "Buy 1 at a time", cooldownType: "premium", usedAtField: "berserkerRageOwned", replenishCost: 50000 },
  { key: "divineProtection", label: "Divine Protection", category: "legendary", description: "Become immune to damage for two turns.", replenishTime: "Buy 1 at a time", cooldownType: "premium", usedAtField: "divineProtectionOwned", replenishCost: 50000 },
  { key: "phoenixRebirth", label: "Phoenix Rebirth", category: "legendary", description: "When defeated, revive once with 75% HP.", replenishTime: "Buy 1 at a time", cooldownType: "premium", usedAtField: "phoenixRebirthOwned", replenishCost: 50000 },
  { key: "deckSurge", label: "Deck Surge", category: "legendary", description: "Every remaining card in your deck gains +10% to all stats for the current match.", replenishTime: "Buy 1 at a time", cooldownType: "premium", usedAtField: "deckSurgeOwned", replenishCost: 50000 },
];

export const MAX_ACTIVE_POWERUPS = 4;
export const DEFAULT_ACTIVE_POWERUPS = ["burn", "reshuffle", "doubleAttack", "defense"];