import { hasCheckerboardAtUrl } from "./imageFlatten.ts";

// Generates card art, then re-rolls if the output contains a transparency
// checkerboard pattern (which the model sometimes paints even from an opaque
// reference). Up to maxAttempts; returns the first clean image, or the last
// attempt if none are clean so a flow never fails purely on detection.
export async function generateCleanArt(
  base44: any,
  prompt: string,
  existingImageUrls: string[],
  maxAttempts = 4
): Promise<{ url: string; clean: boolean }> {
  let url = '';
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const gen = await base44.asServiceRole.integrations.Core.GenerateImage({
      prompt,
      existing_image_urls: existingImageUrls,
    });
    url = gen.url;
    const grid = await hasCheckerboardAtUrl(url);
    if (grid) {
      console.log(`generateCleanArt: checkerboard detected on attempt ${attempt + 1}/${maxAttempts}, regenerating`);
      if (attempt < maxAttempts - 1) continue;
      return { url, clean: false };
    }
    return { url, clean: true };
  }
  return { url, clean: false };
}