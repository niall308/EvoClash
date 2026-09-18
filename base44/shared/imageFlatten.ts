import { PNG } from 'npm:pngjs@7.0.0';

// Flattens a transparent PNG onto a solid background color, returning opaque
// PNG bytes. Image generators (GenerateImage) reproduce the checkerboard
// transparency indicator they see in a transparent reference as actual painted
// pixels in the output; feeding them a pre-flattened, fully opaque source
// eliminates that artefact entirely.
//
// Returns null if the source is not a decodable PNG (e.g. JPEG) so the caller
// can fall back to the original URL.
export async function flattenPngOntoSolid(
  pngUrl: string,
  bg: [number, number, number] = [255, 255, 255]
): Promise<Uint8Array | null> {
  const resp = await fetch(pngUrl);
  if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
  const buf = new Uint8Array(await resp.arrayBuffer());
  let png;
  try {
    png = PNG.sync.read(Buffer.from(buf));
  } catch {
    return null; // not a PNG (e.g. JPEG) — nothing to flatten
  }
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (png.width * y + x) << 2;
      const a = png.data[idx + 3] / 255;
      png.data[idx] = Math.round(png.data[idx] * a + bg[0] * (1 - a));
      png.data[idx + 1] = Math.round(png.data[idx + 1] * a + bg[1] * (1 - a));
      png.data[idx + 2] = Math.round(png.data[idx + 2] * a + bg[2] * (1 - a));
      png.data[idx + 3] = 255;
    }
  }
  const out = PNG.sync.encode(png) as Uint8Array;
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
}