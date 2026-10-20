import "server-only";
import sharp from "sharp";

/**
 * Deterministic dominant-colour extraction used when AI is unavailable (and as
 * a sanity hint for the vision model). Buckets pixels into a coarse RGB grid,
 * ignores transparent and near-white/near-black background pixels where possible.
 */
export async function dominantColors(buffer: Buffer, count = 4): Promise<string[]> {
  const { data, info } = await sharp(buffer)
    .resize(64, 64, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  const neutralBuckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 128) continue;
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const neutral = max - min < 18 && (max > 235 || max < 20);
    const target = neutral ? neutralBuckets : buckets;
    const bucket = target.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.n++;
    target.set(key, bucket);
  }

  // Background-ish neutrals only win when the image has little else in it.
  const ranked = [
    ...[...buckets.values()].map((b) => ({ ...b, weight: b.n })),
    ...[...neutralBuckets.values()].map((b) => ({ ...b, weight: b.n / 10 })),
  ]
    .sort((a, b) => b.weight - a.weight)
    .map(({ r, g, b, n }) => toHex(r / n, g / n, b / n));

  const distinct: string[] = [];
  for (const hex of ranked) {
    if (distinct.every((d) => colorDistance(d, hex) > 60)) distinct.push(hex);
    if (distinct.length >= count) break;
  }
  return distinct.length ? distinct : ["#FFD60A"];
}

function toHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function colorDistance(a: string, b: string) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]);
}
