import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Server-side mirror of src/lib/gameConstants.js + src/lib/upgradeCheck.js + src/lib/cardGenerator.js
// (kept in sync manually - only the fields this function needs).
const TIER_RANGES = {
  1: { statMin: 1, statMax: 2500, bonusMin: 0, bonusMax: 125 },
  2: { statMin: 2501, statMax: 5000, bonusMin: 126, bonusMax: 200 },
  3: { statMin: 5001, statMax: 7500, bonusMin: 201, bonusMax: 250 },
  4: { statMin: 7501, statMax: 10000, bonusMin: 251, bonusMax: 300 },
};
const UPGRADE_REQUIREMENT = { cardsDestroyed: 100, gamesPlayed: 200, matchWins: 50 };
const TIER_UPGRADE_COST = 150000;
const TIER4_PREFIXES = ["Mega", "Prime", "Ultimate", "Dreaded", "Devastating"];
const STYLE_REFERENCE_URL = "https://media.base44.com/images/public/6a4fdbc484df527c16219edb/636b60708_Style.png";
const EVOLVE_ARMOR_PROMPTS = {
  2: "The same creature, now wearing bronze age armor plating, dynamic full-body illustration, matching the exact art style, color palette, lighting, and mystical trading-card aesthetic of the reference image. Keep the exact same background environment as shown in the reference image, unchanged — the creature must remain the clear, sharply rendered focal point standing out from it. No text, no border, no frame",
  3: "The same creature, now wearing gleaming silver metal armor plating that fully replaces any previous bronze armor, dynamic full-body illustration, matching the exact art style, color palette, lighting, and mystical trading-card aesthetic of the reference image. Keep the exact same background environment as shown in the reference image, unchanged — the creature must remain the clear, sharply rendered focal point standing out from it. No text, no border, no frame",
  4: "The same creature, with all previous armor removed, now fully transformed into a robotic being made of silver and gold metal plating, dynamic full-body illustration, matching the exact art style, color palette, lighting, and mystical trading-card aesthetic of the reference image. Keep the exact same background environment as shown in the reference image, unchanged — the creature must remain the clear, sharply rendered focal point standing out from it. No text, no border, no frame",
};
const TIER_UPGRADE_FIELD = { 2: "tier2Upgrades", 3: "tier3Upgrades", 4: "tier4Upgrades" };

function checkUpgradeEligible(card) {
  if (card.tier >= 4) return false;
  return (
    (card.totalWins || 0) >= UPGRADE_REQUIREMENT.cardsDestroyed &&
    (card.totalGames || 0) >= UPGRADE_REQUIREMENT.gamesPlayed &&
    (card.matchWins || 0) >= UPGRADE_REQUIREMENT.matchWins
  );
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function evolveName(currentName, newTier) {
  const base = currentName.replace(/ (II|III)$/, "");
  if (newTier === 2) return `${base} II`;
  if (newTier === 3) return `${base} III`;
  if (newTier === 4) {
    const words = base.split(" ");
    words[0] = randomFrom(TIER4_PREFIXES);
    return words.join(" ");
  }
  return currentName;
}

// Evolves a card to the next tier. Re-validates eligibility (milestones or admin role) and
// coin cost server-side so the client's canEvolve/coin checks can't be bypassed.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { cardId } = await req.json();
    if (!cardId) return Response.json({ error: 'cardId is required' }, { status: 400 });

    const card = await base44.entities.Card.get(cardId);
    if (!card || card.ownerId !== user.id) {
      return Response.json({ error: 'Card not found' }, { status: 404 });
    }

    const isAdmin = user.role === 'admin';
    const eligible = (isAdmin || checkUpgradeEligible(card)) && card.tier < 4;
    if (!eligible) {
      return Response.json({ error: 'This card is not eligible to evolve yet' }, { status: 403 });
    }
    if ((user.coins || 0) < TIER_UPGRADE_COST) {
      return Response.json({ error: 'Not enough coins' }, { status: 400 });
    }

    const newTier = card.tier + 1;
    const newRange = TIER_RANGES[newTier];
    const pct = 1 + (25 + Math.random() * 70) / 100;
    const clamp = (v, min, max) => Math.min(max, Math.max(min, Math.round(v)));
    const higherIsAttack = card.attack >= card.defense;
    const higherValue = randomInt(newRange.statMin, newRange.statMax);
    const lowerValue = clamp(Math.round((higherIsAttack ? card.defense : card.attack) * pct), newRange.statMin, newRange.statMax);

    const templates = await base44.entities.CardTemplate.filter({ baseName: card.baseName });
    const tierAnimation = templates[0]?.[`tier${newTier}Animation`];
    const referenceImages = [card.imageUrl, STYLE_REFERENCE_URL];
    if (tierAnimation) referenceImages.push(tierAnimation);
    const { url } = await base44.integrations.Core.GenerateImage({
      prompt: EVOLVE_ARMOR_PROMPTS[newTier],
      existing_image_urls: referenceImages,
    });

    const updated = {
      tier: newTier,
      name: evolveName(card.name, newTier),
      attack: higherIsAttack ? higherValue : lowerValue,
      defense: higherIsAttack ? lowerValue : higherValue,
      bonusDamage: clamp((card.bonusDamage || 0) * pct, newRange.bonusMin, newRange.bonusMax),
      imageUrl: url,
      winsVsBonus: 0,
      winsVsNonBonus: 0,
      gamesPlayed: 0,
      attackUpgradesUsed: 0,
      defenseUpgradesUsed: 0,
      bonusDamageUpgradesUsed: 0,
    };
    await base44.entities.Card.update(card.id, updated);

    const evolvedIds = user.evolvedCardIds || [];
    const userUpdate = { coins: user.coins - TIER_UPGRADE_COST };
    const tierField = TIER_UPGRADE_FIELD[newTier];
    if (tierField) userUpdate[tierField] = (user[tierField] || 0) + 1;
    if (!evolvedIds.includes(card.id)) {
      userUpdate.evolvedCardIds = [...evolvedIds, card.id];
      userUpdate.creaturesEvolved = (user.creaturesEvolved || 0) + 1;
    }
    const updatedUser = await base44.auth.updateMe(userUpdate);

    return Response.json({ card: { ...card, ...updated }, user: updatedUser });
  } catch (error) {
    console.error('evolveCard error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});