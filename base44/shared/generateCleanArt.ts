// Generates card art in a single pass.
//
// The egg source images now ship with clean backgrounds (no
// transparency-checkerboard on the base image), so the previous
// detect-checkerboard-and-re-roll loop is no longer needed: one generation is
// enough. The per-creature colour gradient and elemental type background are
// still driven by the prompt the caller passes in (see buildCardImagePrompt /
// buildEggHatchRecolorPrompt), so this change does not affect colour generation.
export async function generateCleanArt(
  base44: any,
  prompt: string,
  existingImageUrls: string[]
): Promise<{ url: string; clean: boolean }> {
  const gen = await base44.asServiceRole.integrations.Core.GenerateImage({
    prompt,
    existing_image_urls: existingImageUrls,
  });
  return { url: gen.url, clean: true };
}