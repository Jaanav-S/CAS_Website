import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { imageSize } from "@/lib/imageSize";

/**
 * Uploads live outside /public so they are never served as static files —
 * everything goes through /api/uploads/[name], which checks the session.
 */
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Any shape of image is fine — portrait, panorama, square — but it has to be
 * big enough to read as a header and small enough not to wedge the browser.
 */
export const MIN_IMAGE_EDGE = 200; // px
export const MAX_IMAGE_EDGE = 10000; // px
export const MAX_MEGAPIXELS = 40;

const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

/** Stored names are always a UUID plus a known extension. */
export const STORED_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif)$/;

export type SaveResult =
  | { ok: true; url: string; width: number; height: number }
  | { ok: false; error: string };

export async function saveImage(file: File): Promise<SaveResult> {
  const ext = ALLOWED[file.type];
  if (!ext) {
    return { ok: false, error: "Only JPG, PNG, WEBP or GIF images are allowed." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Images must be 5 MB or smaller." };
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // The declared MIME type is attacker-controlled; the header bytes are not.
  const size = imageSize(bytes);
  if (!size) {
    return { ok: false, error: "That file does not look like a real image." };
  }
  if (size.width < MIN_IMAGE_EDGE || size.height < MIN_IMAGE_EDGE) {
    return {
      ok: false,
      error: `That image is only ${size.width}×${size.height}. Please use one at least ${MIN_IMAGE_EDGE}px on each side.`,
    };
  }
  if (
    size.width > MAX_IMAGE_EDGE ||
    size.height > MAX_IMAGE_EDGE ||
    (size.width * size.height) / 1_000_000 > MAX_MEGAPIXELS
  ) {
    return {
      ok: false,
      error: "That image is enormous. Please scale it down before uploading.",
    };
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  // The name is generated, never taken from the upload, so a crafted filename
  // cannot escape the uploads directory.
  const name = `${randomUUID()}${ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), bytes);

  return { ok: true, url: `/api/uploads/${name}`, ...size };
}
