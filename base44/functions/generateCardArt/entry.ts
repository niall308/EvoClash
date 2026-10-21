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

    const { baseName, type, isHybrid, tier } = await req.json().catch(() => ({}));
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

    // If the creature has an admin-managed Tier 1-4 image, reuse it: keep the
    // creature's pose, anatomy, and face identical to the stored image, recolour
    // its body to the card type's gradient, and paint a fitting elemental type
    // background. The image matching the card's tier is preferred, falling back
    // to the Tier 1 (base) image when a higher-tier image isn't uploaded yet.
    // Egg-baby images are never used here — those are only for hatched egg cards.
    // Falls back to from-scratch generation when no usable stored image exists.
    // A stored image is usable when it's a truly public URL OR a Base44 public
    // file URL (the /files/mp/public/ path UploadPublicFile returns). Private
    // file URIs can't be fetched over the public internet, so those are skipped.
    const isUsableStoredImage = (url: string) =>
      !!url && (!url.includes('base44.app/api/apps/') || url.includes('/files/mp/public/'));
    const tierNum = Math.min(Math.max(Number(tier) || 1, 1), 4);
    const tierImages: Record<number, string> = {
      1: creature?.tier1Image || '',
      2: creature?.tier2Image || '',
      3: creature?.tier3Image || '',
      4: creature?.tier4Image || '',
    };
    const sourceImage = isUsableStoredImage(tierImages[tierNum])
      ? tierImages[tierNum]
      : (isUsableStoredImage(tierImages[1]) ? tierImages[1] : '');
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