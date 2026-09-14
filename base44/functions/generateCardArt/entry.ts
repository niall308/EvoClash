import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { buildCardImagePrompt } from '../../shared/cardArt.ts';

// POST { baseName, type, isHybrid, guideImageId? }
// Narrow, app-specific card-art generator. The caller supplies only the card
// identity (and optionally a guide image id); the server resolves the creature's
// admin-authored description + reference image and the matching elemental type
// background, builds the prompt, and calls the restricted GenerateImage
// integration with the service role. Returns { url }.
//
// When `guideImageId` is provided it is validated server-side: the image must be
// an approved guide (status='approved' AND isGuide=true) belonging to the same
// creature, and its url is used as the reference image for this generation
// (overriding the creature's default referenceImageUrl). A rejected/pending
// guide is blocked with 400 — the card generator cannot bypass this.
//
// Used by the player card generator (CardGenerate) and the admin AI-deck
// generator (AdminAiDecks) — both previously called Core.GenerateImage
// directly from the client.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { baseName, type, isHybrid, guideImageId } = await req.json().catch(() => ({}));
    if (!baseName || !type) return Response.json({ error: 'baseName and type are required' }, { status: 400 });

    // Resolve the creature's admin-authored description + reference image.
    const creatures = await base44.entities.Creature.filter({ baseName });
    const creature = creatures[0];
    let referenceImageUrl = creature?.referenceImageUrl || '';

    // An admin-chosen guide image is validated server-side and preferred.
    if (guideImageId) {
      const guide = await base44.asServiceRole.entities.CreatureImage.get(guideImageId).catch(() => null);
      if (!guide) return Response.json({ error: 'guide image not found' }, { status: 404 });
      if (guide.status !== 'approved' || !guide.isGuide) {
        return Response.json({ error: 'guide image is not an approved guide' }, { status: 400 });
      }
      if (creature && guide.creatureId !== creature.id) {
        return Response.json({ error: 'guide image does not belong to this creature' }, { status: 400 });
      }
      if (guide.url) referenceImageUrl = guide.url;
    }

    // Resolve the matching elemental type background (publicly readable).
    const typeBackgrounds = await base44.entities.TypeBackground.filter({ type });

    const { prompt, existingImageUrls } = buildCardImagePrompt(
      { baseName, type, isHybrid: !!isHybrid },
      {
        typeBackgrounds,
        creatureDescription: creature?.description || '',
        referenceImageUrl,
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