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

export const NAME_PARTS = {
  1: { prefixes: ["Feral", "Ancient", "Savage", "Wild", "Primal", "Rampant"] },
  2: { prefixes: ["Ironclad", "Knight", "Steel", "Armored", "Iron", "Guardian"] },
  3: { prefixes: ["Cyber", "Mecha", "Nano", "Techno", "Quantum"], suffixes: ["X", "Bot", "Unit", "Core"] },
  4: { prefixes: ["Omega", "Titan", "Apex", "Prime", "X-99"], suffixes: ["Prime", "Core", "Overlord", "Ultra"] },
};