import { TYPE_ADVANTAGES } from "@/lib/gameConstants";

export function getTypeMultiplier(attackerType, defenderType) {
  return TYPE_ADVANTAGES[attackerType]?.includes(defenderType) ? 1.5 : 1;
}

export function computeDamage(attacker, defender, attackMultiplier = 1, defenseMultiplier = 1) {
  const multiplier = getTypeMultiplier(attacker.type, defender.type);
  const isCrit = Math.random() < 0.1;
  let rawAttack = Math.round(attacker.attack * multiplier * attackMultiplier) + (attacker.bonusDamage || 0);
  if (isCrit) rawAttack = Math.round(rawAttack * 1.5);
  const totalDefense = Math.round((defender.defense || 0) * defenseMultiplier);
  if (rawAttack === totalDefense) return { tie: true, recoil: false, damage: 0, isCrit: false };
  if (rawAttack > totalDefense) return { tie: false, recoil: false, damage: rawAttack - totalDefense, isCrit };
  return { tie: false, recoil: true, damage: totalDefense - rawAttack, isCrit };
}

export function maxHealth(card) {
  return Math.round(card.attack + card.defense * 1.5);
}