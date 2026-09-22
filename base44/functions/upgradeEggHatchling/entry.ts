import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { buildCardImagePrompt, buildEggHatchRecolorPrompt } from "../../shared/cardArt.ts";
import { flattenImageOntoSolid } from "../../shared/imageFlatten.ts";
import { generateCleanArt } from "../../shared/generateCleanArt.ts";

// Upgrades an egg-hatchling baby card (Tier 3) into its special upgraded form
// (Tier 4): uses a random eggUpgradedImages entry for the art, the creature's
// eggUpgradedName for the name, and stats where ONE of attack/defense lands in
// 10,000–12,500 while the other + bonus follow the normal Tier 4 ranges. Charges
// the standard tier-upgrade cost and mirrors evolveCard's user bookkeeping
// (creaturesEvolved + evolvedCardIds) so the upgrade counts toward milestones.
const TIER_UPGRADE_COST = 500000;
const TIER4 = { statMin: 7501, statMax: 10000, bonusMin: 251, bonusMax: 300 };
const UPGRADE_STAT_MIN = 10000;
const UPGRADE_STAT_MAX = 12500;

function randomFrom(arr: any[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default async function (req: Request) {
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
    if (!card.isEggHatchling) {
      return Response.json({ error: 'This card is not an egg hatchling.' }, { status: 400 });
    }
    if (card.eggUpgraded) {
      return Response.json({ error: 'This hatchling has already been upgraded.' }, { status: 400 });
    }
    if (card.tier !== 3) {
      return Response.json({ error: 'Only a Tier 3 egg hatchling can be upgraded.' }, { status: 400 });
    }

    const creature: any = card.eggCreatureId
      ? await base44.entities.Creature.get(card.eggCreatureId)
      : null;
    if (!creature || (creature.eggUpgradedImages || []).length === 0) {
      return Response.json({ error: 'No upgraded image configured for this creature.' }, { status: 400 });
    }
    if ((user.coins || 0) < TIER_UPGRADE_COST) {
      return Response.json({ error: 'Not enough coins' }, { status: 400 });
    }

    const upgradedImage = randomFrom(creature.eggUpgradedImages);
    // One stat lands in 10,000–12,500 (the "special" stat); the other + bonus
    // follow the Tier 4 range. Which stat is the special one is random.
    const higherIsAttack = Math.random() < 0.5;
    const bigStat = randomInt(UPGRADE_STAT_MIN, UPGRADE_STAT_MAX);
    const smallStat = randomInt(TIER4.statMin, TIER4.statMax);
    const attack = higherIsAttack ? bigStat : smallStat;
    const defense = higherIsAttack ? smallStat : bigStat;
    const bonusDamage = randomInt(TIER4.bonusMin, TIER4.bonusMax);
    const name = creature.eggUpgradedName || card.name;

    // Recolour the admin-stored upgraded image to the card's type gradient AND
    // place it on a fitting type background, matching the hatch flow. The stored
    // image is the base — pose, anatomy, and face stay IDENTICAL; the creature's
    // body colour shifts to the type gradient and the background is replaced with
    // the elemental type background. The source is flattened onto an opaque white
    // background first so the generator never paints a transparency checkerboard.
    const typeBackgrounds = await base44.entities.TypeBackground.filter({ type: card.type });
    let cardArtUrl: string;
    if (upgradedImage) {
      let refUrl = upgradedImage;
      try {
        const flatBytes = await flattenImageOntoSolid(upgradedImage, [255, 255, 255]);
        if (flatBytes) {
          const file = new File([flatBytes], `upgraded-${creature.baseName}.png`, { type: 'image/png' });
          const up: any = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file });
          if (up?.file_url) refUrl = up.file_url;
        }
      } catch (e) {
        console.error('flatten upgraded image failed, using original:', e);
      }
      const { prompt, existingImageUrls } = buildEggHatchRecolorPrompt(
        { baseName: creature.baseName, type: card.type, isHybrid: false },
        refUrl,
        typeBackgrounds
      );
      const result = await generateCleanArt(base44, prompt, existingImageUrls);
      cardArtUrl = result.url;
      if (!result.clean) {
        console.log('upgradeEggHatchling: all recolor attempts had checkerboard, falling back to from-scratch art');
        const fallback = buildCardImagePrompt(
          { baseName: creature.baseName, type: card.type, isHybrid: false },
          { typeBackgrounds, creatureDescription: creature.description || '', referenceImageUrl: creature.referenceImageUrl || '' }
        );
        const fb = await generateCleanArt(base44, fallback.prompt, fallback.existingImageUrls, 2);
        cardArtUrl = fb.url;
      }
    } else {
      const fallback = buildCardImagePrompt(
        { baseName: creature.baseName, type: card.type, isHybrid: false },
        { typeBackgrounds, creatureDescription: creature.description || '', referenceImageUrl: creature.referenceImageUrl || '' }
      );
      const result = await generateCleanArt(base44, fallback.prompt, fallback.existingImageUrls);
      cardArtUrl = result.url;
    }

    const updated: any = {
      tier: 4,
      name,
      attack,
      defense,
      bonusDamage,
      imageUrl: cardArtUrl,
      eggUpgraded: true,
      attackUpgradesUsed: 0,
      defenseUpgradesUsed: 0,
      bonusDamageUpgradesUsed: 0,
      winsVsBonus: 0,
      winsVsNonBonus: 0,
      gamesPlayed: 0,
    };
    await base44.entities.Card.update(card.id, updated);

    const evolvedIds: string[] = user.evolvedCardIds || [];
    const userUpdate: any = { coins: user.coins - TIER_UPGRADE_COST };
    if (!evolvedIds.includes(card.id)) {
      userUpdate.evolvedCardIds = [...evolvedIds, card.id];
      userUpdate.creaturesEvolved = (user.creaturesEvolved || 0) + 1;
    }
    const updatedUser = await base44.auth.updateMe(userUpdate);

    return Response.json({ card: { ...card, ...updated }, user: updatedUser });
  } catch (error) {
    console.error('upgradeEggHatchling error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}