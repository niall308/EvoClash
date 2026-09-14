import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { buildCardImagePrompt } from '../../shared/cardArt.ts';
import { logCreatureEvent } from '../../shared/creatureImages.ts';

// POST { baseName, type, isHybrid, guideImageId? }
// Narrow, app-specific card-art generator. The caller supplies only the card
// identity; the server resolves the creature's admin-authored description +
// reference image and the matching elemental type background, builds the
// prompt, and calls the restricted GenerateImage integration with the service
// role. Returns { url }.
//
// When guideImageId is supplied, the server validates it is an approved guide
// (status='approved', isGuide=true) belonging to a creature with the same
// baseName, then uses its url as the reference image for the generator. This is
// the authoritative server-side guard: unapproved/rejected/mismatched images
// can never be used as a guide. A used_in_card_generator audit event is logged.
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
    // Resolve the matching elemental type background (publicly readable).
    const typeBackgrounds = await base44.entities.TypeBackground.filter({ type });

    const { prompt, existingImageUrls } = buildCardImagePrompt(
      { baseName, type, isHybrid: !!isHybrid },
      {
        typeBackgrounds,
        creatureDescription: creature?.description || '',
        referenceImageUrl: creature?.referenceImageUrl || '',
      }
    );

    let finalExisting = existingImageUrls;
    if (guideImageId) {
      const guide = await base44.asServiceRole.entities.CreatureImage.get(guideImageId).catch(() => null);
      if (!guide) return Response.json({ error: 'guide image not found' }, { status: 404 });
      if (guide.status !== 'approved' || !guide.isGuide) {
        return Response.json({ error: 'guide image is not an approved guide' }, { status: 409 });
      }
      if (!guide.url) return Response.json({ error: 'guide image has no url' }, { status: 409 });
      // The guide must belong to a creature with the same baseName.
      const guideCreature = await base44.entities.Creature.get(guide.creatureId).catch(() => null);
      if (guideCreature?.baseName !== baseName) {
        return Response.json({ error: 'guide image does not match this creature' }, { status: 400 });
      }
      // Prefer the guide as the primary reference image.
      finalExisting = [guide.url, ...existingImageUrls.filter((u) => u !== guide.url)];
      await logCreatureEvent(base44, {
        creatureId: guide.creatureId,
        imageId: guide.id,
        action: 'used_in_card_generator',
        userId: user.id,
        userName: user.fullName || user.email || '',
        note: `tier ${guide.tier}`,
      });
    }

    const { url } = await base44.asServiceRole.integrations.Core.GenerateImage({
      prompt,
      existing_image_urls: finalExisting,
    });
    return Response.json({ url });
  } catch (error) {
    console.error('generateCardArt error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}