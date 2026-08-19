import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Uploads live outside /public so they are never served as static files —
 * everything goes through /api/uploads/[name], which checks the session.
 */
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

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

export type SaveResult = { ok: true; url: string } | { ok: false; error: string };

export async function saveImage(file: File): Promise<SaveResult> {
  const ext = ALLOWED[file.type];
  if (!ext) {
    return { ok: false, error: "Only JPG, PNG, WEBP or GIF images are allowed." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Images must be 5 MB or smaller." };
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  // The name is generated, never taken from the upload, so a crafted filename
  // cannot escape the uploads directory.
  const name = `${randomUUID()}${ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));

  return { ok: true, url: `/api/uploads/${name}` };
}
