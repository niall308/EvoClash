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

export const CREATURES = {
  Dinosaur: ["Tyrannosaurus Rex", "Velociraptor", "Triceratops", "Stegosaurus", "Spinosaurus", "Brachiosaurus", "Ankylosaurus", "Pterodactyl"],
  "Extinct Animal": ["Woolly Mammoth", "Saber-Tooth Tiger", "Dodo Bird", "Giant Sloth", "Cave Bear", "Irish Elk", "Dire Wolf", "Moa Bird"],
  "Mythical Creature": ["Fire Dragon", "Phoenix", "Griffin", "Kraken", "Chimera", "Hydra", "Basilisk", "Unicorn"],
};

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

export const UPGRADE_REQUIREMENTS = {
  1: { winsVsBonus: 100, winsVsNonBonus: 50, gamesPlayed: 200 },
  2: { winsVsBonus: 200, winsVsNonBonus: 100, gamesPlayed: 400 },
  3: { winsVsBonus: 1000, winsVsNonBonus: 500, gamesPlayed: 2000 },
};

export const CARD_BACK_URL = "https://media.base44.com/images/public/6a4fdbc484df527c16219edb/8e6b0b264_Card_Back.jpg";
export const STYLE_REFERENCE_URL = "https://media.base44.com/images/public/6a4fdbc484df527c16219edb/636b60708_Style.png";

export const AI_OPPONENT_NAMES = [
  "Commander Rex", "Shadow Viper", "Iron Warden", "Blaze Hunter", "Frost Reaper",
  "Storm Breaker", "Rogue Tamer", "Void Walker", "Ember Knight", "Crimson Fang",
];

export const NAME_PARTS = {
  1: { prefixes: ["Feral", "Ancient", "Savage", "Wild", "Primal", "Rampant"] },
  2: { prefixes: ["Ironclad", "Knight", "Steel", "Armored", "Iron", "Guardian"] },
  3: { prefixes: ["Cyber", "Mecha", "Nano", "Techno", "Quantum"], suffixes: ["X", "Bot", "Unit", "Core"] },
  4: { prefixes: ["Omega", "Titan", "Apex", "Prime", "X-99"], suffixes: ["Prime", "Core", "Overlord", "Ultra"] },
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
export const COINS_PER_WIN = 250;

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

// Card creation limits (Card Generate screen)
export const FREE_CARDS_INITIAL = 15;
export const FREE_CREATIONS_PER_DAY = 3;
export const EXTRA_CREATURE_COST = 25000;