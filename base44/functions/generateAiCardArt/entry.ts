import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { buildAiCardPrompt } from '../../shared/cardArt.ts';

// POST { baseName, type }
// Narrow generator for the simple live-AI battle card art (the picture drawn
// on demand for an AI opponent's active card). Server builds the prompt and
// calls the restricted GenerateImage integration with the service role.
// Returns { url }.
//
// Replaces the direct Core.GenerateImage call that was in useBattleMatch.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { baseName, type } = await req.json().catch(() => ({}));
    if (!baseName || !type) return Response.json({ error: 'baseName and type are required' }, { status: 400 });

    const { prompt, existingImageUrls } = buildAiCardPrompt({ baseName, type });

    const { url } = await base44.asServiceRole.integrations.Core.GenerateImage({
      prompt,
      existing_image_urls: existingImageUrls,
    });
    return Response.json({ url });
  } catch (error) {
    console.error('generateAiCardArt error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}