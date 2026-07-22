import { generateRandomCard, generateHybridCard } from "@/lib/cardGenerator";

// Fixed composition rules for each pre-set 100-card AI difficulty deck.
export const DECK_COMPOSITIONS = {
  Easy: [{ tier: 1, count: 100 }],
  Normal: [
    { tier: 2, count: 80 },
    { tier: 1, count: 20 },
  ],
  Hard: [
    { tier: 3, count: 90 },
    { tier: 2, count: 5 },
    { hybrid: true, count: 5 },
  ],
  Extreme: [
    { tier: 4, count: 80 },
    { hybrid: true, count: 20 },
  ],
};

export function buildDeckCards(difficulty, hybridCreatures) {
  const composition = DECK_COMPOSITIONS[difficulty];
  const cards = [];
  for (const part of composition) {
    for (let i = 0; i < part.count; i++) {
      if (part.hybrid) {
        const creature = hybridCreatures[Math.floor(Math.random() * hybridCreatures.length)];
        cards.push(generateHybridCard(creature));
      } else {
        cards.push(generateRandomCard(part.tier));
      }
    }
  }
  return cards;
}