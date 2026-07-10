import { TYPE_ADVANTAGES } from "@/lib/gameConstants";

export function getTypeMultiplier(attackerType, defenderType) {
  return TYPE_ADVANTAGES[attackerType]?.includes(defenderType) ? 1.5 : 1;
}

export function computeDamage(attacker, defender) {
  const multiplier = getTypeMultiplier(attacker.type, defender.type);
  const rawAttack = Math.round(attacker.attack * multiplier) + (attacker.bonusDamage || 0);
  const totalDefense = (defender.defense || 0) + (defender.bonusDefense || 0);
  if (rawAttack === totalDefense) return { tie: true, recoil: false, damage: 0 };
  if (rawAttack > totalDefense) return { tie: false, recoil: false, damage: rawAttack - totalDefense };
  return { tie: false, recoil: true, damage: totalDefense - rawAttack };
}

export function rollDice() {
  return Math.random() < 0.5 ? "player" : "ai";
}

export function maxHealth(card) {
  return card.attack + card.defense;
}