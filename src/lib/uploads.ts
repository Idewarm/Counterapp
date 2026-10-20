import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const UPLOAD_DIR = path.resolve(/* turbopackIgnore: true */ process.env.UPLOAD_DIR || "./uploads");
export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB || 5) * 1024 * 1024;

const TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
} as const;

type Ext = keyof typeof TYPES;

/** Detect the image type from magic bytes — never trust the client's MIME type. */
export function sniffImage(buf: Buffer): Ext | null {
  if (buf.length < 12) return null;
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buf.toString("ascii", 0, 6) === "GIF87a" || buf.toString("ascii", 0, 6) === "GIF89a") return "gif";
  return null;
}

export interface StoredUpload {
  fileName: string;
  url: string;
  mimeType: string;
  buffer: Buffer;
}

export class UploadError extends Error {}

export async function storeImage(file: File): Promise<StoredUpload> {
  if (file.size === 0) throw new UploadError("The file is empty");
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(`File is too large (max ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB)`);
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = sniffImage(buffer);
  if (!ext) throw new UploadError("Unsupported file type. Upload a PNG, JPG, WEBP or GIF image.");

  const fileName = `${randomUUID()}.${ext}`;
  await mkdir(/* turbopackIgnore: true */ UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(/* turbopackIgnore: true */ UPLOAD_DIR, fileName), buffer);
  return { fileName, url: `/api/uploads/${fileName}`, mimeType: TYPES[ext], buffer };
}

const SAFE_NAME = /^[0-9a-f-]{36}\.(png|jpg|webp|gif)$/;

export async function readUpload(fileName: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (!SAFE_NAME.test(fileName)) return null;
  try {
    const buffer = await readFile(path.join(/* turbopackIgnore: true */ UPLOAD_DIR, fileName));
    const ext = fileName.split(".").pop() as Ext;
    return { buffer, mimeType: TYPES[ext] };
  } catch {
    return null;
  }
}

/** Resolve a stored logo URL (/api/uploads/<file>) back to its bytes. */
export async function readUploadByUrl(url: string | null | undefined) {
  if (!url?.startsWith("/api/uploads/")) return null;
  return readUpload(url.slice("/api/uploads/".length));
}
