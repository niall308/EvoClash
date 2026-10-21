import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { buildCardImagePrompt, buildEggHatchRecolorPrompt } from '../../shared/cardArt.ts';
import { enforceCardArtQuota } from '../../shared/cardArtQuota.ts';

// POST { baseName, type, isHybrid }
// Narrow, app-specific card-art generator. The caller supplies only the card
// identity; the server resolves the creature's admin-authored description +
// reference image and the matching elemental type background, builds the
// prompt, and calls the restricted GenerateImage integration with the
// service role. Returns { url }.
//
// Used by the player card generator (CardGenerate) and the admin AI-deck
// generator (AdminAiDecks) — both previously called Core.GenerateImage
// directly from the client.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { baseName, type, isHybrid } = await req.json().catch(() => ({}));
    if (!baseName || !type) return Response.json({ error: 'baseName and type are required' }, { status: 400 });

    // Per-user daily quota: cap paid AI image-generation spend. Without this any
    // signed-in user could loop this endpoint 24/7 without creating/paying for a
    // card, driving unbounded third-party API cost.
    // Admins are exempt: regenerating a 100-card AI deck (AdminAiDecks) calls this
    // endpoint 100 times in a loop, far above the 40/day cap, and that spend is an
    // admin-controlled operation. Without the exemption the regen aborts with a
    // 500 at card #41 when the quota throws.
    if (user.role !== 'admin') {
      await enforceCardArtQuota(base44, user);
    }

    // Resolve the creature's admin-authored description + reference image.
    const creatures = await base44.entities.Creature.filter({ baseName });
    const creature = creatures[0];
    // Resolve the matching elemental type background (publicly readable).
    const typeBackgrounds = await base44.entities.TypeBackground.filter({ type });

    // If the creature has a stored image, reuse it the way egg-hatch art does:
    // keep the creature's pose, anatomy, and face identical to the stored image,
    // recolour its body to the card type's gradient, and paint a fitting
    // elemental type background. We check the Tier 1 image first, then fall back
    // to the egg-baby image (creatures managed through the egg-creature admin
    // store their base art there). Falls back to from-scratch generation when no
    // usable stored image exists.
    // A stored image is usable when it's a truly public URL OR a Base44 public
    // file URL (the /files/mp/public/ path UploadPublicFile returns). Private
    // file URIs can't be fetched over the public internet, so those are skipped.
    const isUsableStoredImage = (url: string) =>
      !!url && (!url.includes('base44.app/api/apps/') || url.includes('/files/mp/public/'));
    const tier1Image = creature?.tier1Image || '';
    const eggBabyImages = (creature?.eggBabyImages || []);
    const sourceImage = isUsableStoredImage(tier1Image)
      ? tier1Image
      : (eggBabyImages.find(isUsableStoredImage) || '');
    const useRecolor = !!sourceImage;
    const { prompt, existingImageUrls } = useRecolor
      ? buildEggHatchRecolorPrompt(
          { baseName, type, isHybrid: !!isHybrid },
          sourceImage,
          typeBackgrounds
        )
      : buildCardImagePrompt(
          { baseName, type, isHybrid: !!isHybrid },
          {
            typeBackgrounds,
            creatureDescription: creature?.description || '',
            referenceImageUrl: creature?.referenceImageUrl || '',
          }
        );

    const { url } = await base44.asServiceRole.integrations.Core.GenerateImage({
      prompt,
      existing_image_urls: existingImageUrls,
    });
    return Response.json({ url });
  } catch (error) {
    console.error('generateCardArt error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}