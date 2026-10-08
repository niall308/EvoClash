import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { buildEggUpgradeBackgroundPrompt } from "../../shared/cardArt.ts";
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
    const goodImages = (creature?.eggUpgradedGoodImages || []);
    const evilImages = (creature?.eggUpgradedEvilImages || []);
    if (goodImages.length === 0 && evilImages.length === 0) {
      return Response.json({ error: 'No upgraded image configured for this creature.' }, { status: 400 });
    }
    if ((user.coins || 0) < TIER_UPGRADE_COST) {
      return Response.json({ error: 'Not enough coins' }, { status: 400 });
    }

    // 50/50 Good vs Evil alignment. If the chosen alignment has no images, fall
    // back to whichever side has art (keeps the upgrade working if the admin
    // only configured one side for this creature).
    let alignment: 'good' | 'evil';
    if (goodImages.length === 0) alignment = 'evil';
    else if (evilImages.length === 0) alignment = 'good';
    else alignment = Math.random() < 0.5 ? 'good' : 'evil';
    const upgradedImage = randomFrom(alignment === 'good' ? goodImages : evilImages);
    // One stat lands in 10,000–12,500 (the "special" stat); the other + bonus
    // follow the Tier 4 range. Which stat is the special one is random.
    const higherIsAttack = Math.random() < 0.5;
    const bigStat = randomInt(UPGRADE_STAT_MIN, UPGRADE_STAT_MAX);
    const smallStat = randomInt(TIER4.statMin, TIER4.statMax);
    const attack = higherIsAttack ? bigStat : smallStat;
    const defense = higherIsAttack ? smallStat : bigStat;
    const bonusDamage = randomInt(TIER4.bonusMin, TIER4.bonusMax);
    const name = (alignment === 'good'
      ? (creature.eggUpgradedGoodName || creature.eggUpgradedName)
      : (creature.eggUpgradedEvilName || creature.eggUpgradedName)) || card.name;

    // The admin-stored good/evil upgraded image has a transparent/blank
    // background, so composite it onto a fitting elemental type background: the
    // stored image is the creature reference (pose, anatomy, face, colours, and
    // art style stay IDENTICAL — the good/evil mood is already baked into it), and
    // the model only paints the type environment around it.
    //
    // The generation is BOUNDED: a slow or hung GenerateImage would otherwise run
    // past the platform function-execution limit and kill the whole upgrade
    // (card never saves, user sees an error). Race it against a timeout — if it
    // wins, the upgraded card gets the type background; if it loses or throws,
    // fall back to the stored image so the upgrade always completes (just without
    // a background in the rare slow case). Most generations finish well under the
    // bound, so the background is the common outcome.
    const ART_TIMEOUT_MS = 15000;
    let cardArtUrl: string = upgradedImage;
    try {
      const typeBackgrounds = await base44.entities.TypeBackground.filter({ type: card.type });
      const { prompt, existingImageUrls } = buildEggUpgradeBackgroundPrompt(
        { baseName: creature.baseName, type: card.type, isHybrid: false },
        upgradedImage,
        typeBackgrounds
      );
      const art: any = await Promise.race([
        generateCleanArt(base44, prompt, existingImageUrls),
        new Promise((_, reject) => setTimeout(() => reject(new Error('art generation timeout')), ART_TIMEOUT_MS)),
      ]);
      if (art?.url) cardArtUrl = art.url;
    } catch (e) {
      console.error('upgradeEggHatchling: background generation failed/timed out, using stored image:', e);
    }

    // The upgraded form's Unique Attack is fixed by alignment (not per-creature):
    //   Good = Blessed Strike: 110% damage + heal all active cards 35% max HP.
    //   Evil  = Cursed Strike: 175% damage + all active cards lose 15% current HP.
    const ua = alignment === 'good'
      ? { uniqueAttackName: 'Blessed Strike', uniqueAttackPercent: 110, uniqueAttackTarget: 'single', uniqueAttackEffect: 'Deals 110% attack damage and heals all of your active cards (including itself) by 35% of their total health.', uniqueAttackEffectType: 'healAll35' }
      : { uniqueAttackName: 'Cursed Strike', uniqueAttackPercent: 175, uniqueAttackTarget: 'single', uniqueAttackEffect: 'Deals 175% attack damage but all of your active cards on the field lose 15% of their current health.', uniqueAttackEffectType: 'sacrificeAll15' };

    const updated: any = {
      tier: 4,
      name,
      attack,
      defense,
      bonusDamage,
      imageUrl: cardArtUrl,
      eggUpgraded: true,
      eggAlignment: alignment,
      ...ua,
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