import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { buildCardImagePrompt } from '../../shared/cardArt.ts';

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