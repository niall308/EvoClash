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

// Detects the transparency-indicator checkerboard pattern in a decoded PNG.
// Scans a range of square sizes; for each, counts sampled positions where a
// pixel differs strongly from its neighbour one square over (flip) but matches
// the pixel two squares over (repeat) — the signature of an alternating grid.
// Returns true if any size shows the pattern across enough of the image.
export function detectCheckerboard(pngBytes: Uint8Array): boolean {
  let png;
  try {
    png = PNG.sync.read(Buffer.from(pngBytes));
  } catch {
    return false;
  }
  const { width, height, data } = png;
  if (width < 40 || height < 40) return false;
  const gray = new Uint8Array(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
  }
  const g = (x: number, y: number) => gray[y * width + x];
  const sizes = [4, 6, 8, 10, 12, 14, 16, 20, 24];
  const flipTh = 40, repeatTh = 18, ratioTh = 0.12;
  for (const s of sizes) {
    if (width - 2 * s < 2) break;
    let total = 0, matches = 0;
    for (let y = 0; y < height; y += 3) {
      for (let x = 0; x + 2 * s < width; x += Math.max(2, s)) {
        const a = g(x, y), b = g(x + s, y), c = g(x + 2 * s, y);
        const flip = Math.abs(a - b);
        const repeat = Math.abs(a - c);
        total++;
        if (flip > flipTh && repeat < repeatTh) matches++;
      }
    }
    if (total > 50 && matches / total > ratioTh) return true;
  }
  return false;
}

// Fetches an image URL and returns true if it contains a checkerboard pattern.
export async function hasCheckerboardAtUrl(url: string): Promise<boolean> {
  try {
    const r = await fetch(url);
    if (!r.ok) return false;
    const buf = new Uint8Array(await r.arrayBuffer());
    return detectCheckerboard(buf);
  } catch {
    return false;
  }
}