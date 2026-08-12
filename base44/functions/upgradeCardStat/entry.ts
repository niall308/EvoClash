import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Server-side mirror of stat-upgrade logic (gameConstants.js + statUpgradeCost.js).
// Re-validates ownership, per-tier cap, max-uses, and coin cost so the client's
// checks cannot be bypassed via a direct Card.update / updateMe call.
const TIER_RANGES = {
  1: { statMin: 1, statMax: 2500, bonusMin: 0, bonusMax: 125 },
  2: { statMin: 2501, statMax: 5000, bonusMin: 126, bonusMax: 200 },
  3: { statMin: 5001, statMax: 7500, bonusMin: 201, bonusMax: 250 },
  4: { statMin: 7501, statMax: 10000, bonusMin: 251, bonusMax: 300 },
};
const STAT_UPGRADES = [
  { key: 'attack', label: 'Attack', cost: 5000, percent: 10 },
  { key: 'defense', label: 'Defense', cost: 5000, percent: 10 },
  { key: 'bonusDamage', label: 'Bonus Damage', cost: 3000, percent: 15 },
];
const TIER_STAT_UPGRADE_COST = { 2: 20000, 3: 35000, 4: 50000 };
const MAX_STAT_UPGRADES_PER_TIER = { 1: 2, 2: 2, 3: 2, 4: 2 };
const USED_FIELD = { attack: 'attackUpgradesUsed', defense: 'defenseUpgradesUsed', bonusDamage: 'bonusDamageUpgradesUsed' };

function getStatUpgradeCost(tier, key, usesInTier) {
  const base = tier === 1 ? STAT_UPGRADES.find((u) => u.key === key).cost : TIER_STAT_UPGRADE_COST[tier];
  return usesInTier === 0 ? base : base * 2;
}
function getStatUpgradeMaxUses(tier) {
  return MAX_STAT_UPGRADES_PER_TIER[tier] || 1;
}

function checkEvolutionLineComplete(card) {
  return (card.attackUpgradesUsed || 0) >= 1 && (card.defenseUpgradesUsed || 0) >= 1 && (card.bonusDamageUpgradesUsed || 0) >= 1;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { cardId, statKey } = await req.json();
    if (!cardId || !statKey) return Response.json({ error: 'cardId and statKey are required' }, { status: 400 });
    if (!USED_FIELD[statKey]) return Response.json({ error: 'Invalid stat key' }, { status: 400 });

    const card = await base44.entities.Card.get(cardId);
    if (!card || card.ownerId !== user.id) return Response.json({ error: 'Card not found' }, { status: 404 });

    const upg = STAT_UPGRADES.find((u) => u.key === statKey);
    const usedField = USED_FIELD[statKey];
    const usesInTier = card[usedField] || 0;
    const maxUses = getStatUpgradeMaxUses(card.tier);
    if (usesInTier >= maxUses) return Response.json({ error: 'Max upgrades for this tier reached' }, { status: 400 });

    const cost = getStatUpgradeCost(card.tier, statKey, usesInTier);
    if ((user.coins || 0) < cost) return Response.json({ error: 'Not enough coins' }, { status: 400 });

    const range = TIER_RANGES[card.tier];
    const capValue = statKey === 'bonusDamage' ? range.bonusMax : range.statMax;
    const currentVal = card[statKey] || 0;
    const newVal = Math.min(capValue, Math.round(currentVal * (1 + upg.percent / 100)));
    if (newVal <= currentVal) return Response.json({ error: 'Stat already at cap' }, { status: 400 });

    const userUpdate = { coins: user.coins - cost };
    const futureCard = { ...card, [statKey]: newVal, [usedField]: usesInTier + 1 };
    const completedIds = user.completedEvolutionCardIds || [];
    if (card.tier === 4 && checkEvolutionLineComplete(futureCard) && !completedIds.includes(card.id)) {
      userUpdate.completedEvolutionCardIds = [...completedIds, card.id];
      userUpdate.creatureEvolutionLinesCompleted = (user.creatureEvolutionLinesCompleted || 0) + 1;
    }

    await base44.entities.Card.update(card.id, { [statKey]: newVal, [usedField]: usesInTier + 1 });
    const updatedUser = await base44.auth.updateMe(userUpdate);

    return Response.json({ card: futureCard, user: updatedUser });
  } catch (error) {
    console.error('upgradeCardStat error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});