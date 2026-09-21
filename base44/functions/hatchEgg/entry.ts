import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { EGG_HATCH_DAYS } from "../../shared/eggHatch.ts";
import { buildCardImagePrompt, buildEggHatchRecolorPrompt } from "../../shared/cardArt.ts";
import { flattenImageOntoSolid } from "../../shared/imageFlatten.ts";
import { generateCleanArt } from "../../shared/generateCleanArt.ts";

// Hatches a ready (30/30) egg into a baby creature card. Picks a random
// eligible creature (one that has at least one eggBabyImages entry), uses a
// random baby image, and builds a Tier 3 card with role-weighted stats from the
// Tier 3 range. The egg is consumed (deleted) on success. The card is placed
// into the player's active deck and stamped with the creature's Unique Attack.
const TYPES = ["Fire", "Lava", "Water", "Ice", "Rock", "Wind", "Earth", "Magic"];
const TIER3 = { statMin: 5001, statMax: 7500, bonusMin: 201, bonusMax: 250 };

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

    const { eggId } = await req.json();
    if (!eggId) return Response.json({ error: 'eggId is required' }, { status: 400 });

    const egg = await base44.entities.Egg.get(eggId);
    if (!egg || egg.created_by_id !== user.id) {
      return Response.json({ error: 'Egg not found' }, { status: 404 });
    }
    if ((egg.progress || 0) < EGG_HATCH_DAYS && user.role !== 'admin') {
      return Response.json({ error: 'Egg is not ready to hatch yet' }, { status: 400 });
    }

    const creatures = await base44.entities.Creature.filter({}, undefined, 1000);
    const eligible = creatures.filter((c: any) => (c.eggBabyImages || []).length > 0);
    if (eligible.length === 0) {
      return Response.json({ error: 'No egg creatures have baby images configured yet.' }, { status: 400 });
    }
    const creature: any = randomFrom(eligible);

    // Tier 3 stats, weighted by the creature's role (predator -> attack, prey -> defense).
    const role = creature.role || 'balanced';
    const bias = role === 'predator' ? 0.55 + Math.random() * 0.45 : role === 'prey' ? Math.random() * 0.45 : Math.random();
    const range = TIER3.statMax - TIER3.statMin;
    const attack = Math.round(TIER3.statMin + bias * range);
    const defense = Math.round(TIER3.statMin + (1 - bias) * range);
    const bonusDamage = randomInt(TIER3.bonusMin, TIER3.bonusMax);
    const type = randomFrom(TYPES);
    const name = creature.eggBabyName || creature.baseName;
    const typeBackgrounds = await base44.entities.TypeBackground.filter({ type });

    // Recolour the admin-stored baby image to the card type's colour gradient AND
    // place it on a fitting type background (matching standard card creation).
    // The stored image is the base — pose, anatomy, and face stay IDENTICAL; the
    // creature's body colour shifts to the type gradient and the background is
    // replaced with the elemental type background.
    const babyImage = randomFrom(creature.eggBabyImages || []);
    let cardArtUrl: string;
    if (babyImage) {
      // The stored baby image is often a JPEG mislabeled as PNG, or a transparent
      // PNG. In both cases, flatten it onto a solid white background and re-upload
      // the opaque PNG to a public media.base44.com URL. This guarantees the
      // generator receives a fully opaque, publicly fetchable reference (no alpha,
      // no base44.app/api/apps private path), which is what stops it from painting
      // a transparency-checkerboard into the output.
      let refUrl = babyImage;
      try {
        const flatBytes = await flattenImageOntoSolid(babyImage, [255, 255, 255]);
        if (flatBytes) {
          const file = new File([flatBytes], `hatchling-${creature.baseName}.png`, { type: 'image/png' });
          const up: any = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file });
          if (up?.file_url) refUrl = up.file_url;
        }
      } catch (e) {
        console.error('flatten baby image failed, using original:', e);
      }
      const { prompt, existingImageUrls } = buildEggHatchRecolorPrompt(
        { baseName: creature.baseName, type, isHybrid: false },
        refUrl,
        typeBackgrounds
      );
      const result = await generateCleanArt(base44, prompt, existingImageUrls);
      cardArtUrl = result.url;
      // If every recolor attempt still produced a grid, fall back to a from-scratch
      // generation (which doesn't reference a plain-background source and so
      // doesn't trigger the checkerboard artefact) rather than ship a grid image.
      if (!result.clean) {
        console.log('hatchEgg: all recolor attempts had checkerboard, falling back to from-scratch art');
        const fallback = await buildCardImagePrompt(
          { baseName: creature.baseName, type, isHybrid: false },
          { typeBackgrounds, creatureDescription: creature.description || '', referenceImageUrl: creature.referenceImageUrl || '' }
        );
        const fb = await generateCleanArt(base44, fallback.prompt, fallback.existingImageUrls, 2);
        cardArtUrl = fb.url;
      }
    } else {
      // No stored baby image — fall back to from-scratch generation.
      const { prompt, existingImageUrls } = buildCardImagePrompt(
        { baseName: creature.baseName, type, isHybrid: false },
        { typeBackgrounds, creatureDescription: creature.description || '', referenceImageUrl: creature.referenceImageUrl || '' }
      );
      const result = await generateCleanArt(base44, prompt, existingImageUrls);
      cardArtUrl = result.url;
    }

    // The card is created unassigned; the player chooses to add it to a deck or
    // sell it from the hatch-result popup.
    const card = await base44.entities.Card.create({
      name,
      baseName: creature.baseName,
      category: creature.category,
      type,
      tier: 3,
      attack,
      defense,
      bonusDamage,
      imageUrl: cardArtUrl,
      ownerId: user.id,
      isEggHatchling: true,
      eggCreatureId: creature.id,
      uniqueAttackName: creature.uniqueAttackName || '',
      uniqueAttackPercent: Math.max(0, Math.min(250, Number(creature.uniqueAttackPercent) || 0)),
      uniqueAttackTarget: creature.uniqueAttackTarget === 'multi' ? 'multi' : 'single',
      uniqueAttackEffect: creature.uniqueAttackEffect || '',
      winsVsBonus: 0,
      winsVsNonBonus: 0,
      gamesPlayed: 0,
    });

    await base44.entities.Egg.delete(egg.id);

    return Response.json({ card, creature });
  } catch (error) {
    console.error('hatchEgg error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}