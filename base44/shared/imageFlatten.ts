import { PNG } from 'npm:pngjs@7.0.0';
import jpeg from 'npm:jpeg-js@0.4.4';

// Image generators (GenerateImage) reproduce the checkerboard transparency
// indicator they see in a reference as actual painted pixels in the output.
// Feeding them a pre-flattened, fully opaque source eliminates that artefact.
//
// GenerateImage returns JPEG bytes (not PNG), and the admin-stored "egg baby"
// images are often JPEGs mislabeled as image/png — so every decoder path here
// handles BOTH PNG and JPEG. A PNG-only decoder silently no-ops on JPEG output,
// which was why the checkerboard re-roll loop never triggered.

type Decoded = { width: number; height: number; data: Buffer };

// Decode any supported image bytes (PNG or JPEG) into an RGBA Buffer.
// Returns null if the format is unsupported or undecodable.
function decodeImage(bytes: Uint8Array): Decoded | null {
  const buf = Buffer.from(bytes);
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    try {
      const png = PNG.sync.read(buf);
      return { width: png.width, height: png.height, data: png.data };
    } catch {
      return null;
    }
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    try {
      const raw: any = jpeg.decode(buf, { useTArray: false });
      if (!raw || !raw.width || !raw.height || !raw.data) return null;
      return { width: raw.width, height: raw.height, data: Buffer.from(raw.data) };
    } catch {
      return null;
    }
  }
  return null;
}

// Flattens any image (PNG with alpha, or opaque JPEG) onto a solid background
// color, returning opaque PNG bytes the generator can use as a reference.
// Returns null if the source can't be decoded so the caller can fall back.
export async function flattenImageOntoSolid(
  imageUrl: string,
  bg: [number, number, number] = [255, 255, 255]
): Promise<Uint8Array | null> {
  const resp = await fetch(imageUrl);
  if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
  const buf = new Uint8Array(await resp.arrayBuffer());
  const img = decodeImage(buf);
  if (!img) return null;
  const { width, height, data } = img;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      const a = data[idx + 3] / 255;
      data[idx] = Math.round(data[idx] * a + bg[0] * (1 - a));
      data[idx + 1] = Math.round(data[idx + 1] * a + bg[1] * (1 - a));
      data[idx + 2] = Math.round(data[idx + 2] * a + bg[2] * (1 - a));
      data[idx + 3] = 255;
    }
  }
  const png = new PNG({ width, height });
  png.data = data;
  const out = PNG.sync.encode(png) as Uint8Array;
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
}

// Detects the transparency-indicator checkerboard pattern in a decoded image.
// Scans a range of square sizes; for each, counts sampled positions where a
// pixel differs strongly from its neighbour one square over (flip) but matches
// the pixel two squares over (repeat) — the signature of an alternating grid.
// Returns true if any size shows the pattern across enough of the image.
export function detectCheckerboard(imageBytes: Uint8Array): boolean {
  const img = decodeImage(imageBytes);
  if (!img) return false;
  const { width, height, data } = img;
  if (width < 40 || height < 40) return false;
  const gray = new Uint8Array(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
  }
  const g = (x: number, y: number) => gray[y * width + x];
  const sizes = [4, 6, 8, 10, 12, 14, 16, 20, 24, 32];
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
// Works on PNG and JPEG outputs (GenerateImage returns JPEG).
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