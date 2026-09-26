import fs from 'node:fs/promises';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { uploadRoot } from '../config/env';
import { HttpError } from '../utils/http-error';

type ImageKind = { ext: 'jpg' | 'png' | 'webp'; mime: string };

/** Identifies an image by its leading bytes; the client-declared mimetype is ignored. */
export function sniffImage(buf: Buffer): ImageKind | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buf.length >= 8 && png.every((b, i) => buf[i] === b)) {
    return { ext: 'png', mime: 'image/png' };
  }
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return { ext: 'webp', mime: 'image/webp' };
  }
  return null;
}

/** Stores the file under uploads/{storeId}/{uuid}.{ext}; the original filename is discarded. */
export async function saveImage(ownerDir: string, buffer: Buffer): Promise<{ url: string }> {
  const kind = sniffImage(buffer);
  if (!kind) throw HttpError.badRequest('نوع الملف غير مدعوم. استخدم صورة JPG أو PNG أو WEBP');

  const dir = path.join(uploadRoot, ownerDir);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${uuidv4()}.${kind.ext}`;
  await fs.writeFile(path.join(dir, filename), buffer);
  return { url: `/uploads/${ownerDir}/${filename}` };
}

/**
 * Upload paths saved on a record must live in the owner's own folder
 * (uploads/{storeId}/, or uploads/users/{userId}/ during onboarding),
 * so one merchant can't reference another merchant's files.
 */
export function assertOwnUploads(ownerDirs: string | string[], urls: string[]): void {
  const prefixes = (Array.isArray(ownerDirs) ? ownerDirs : [ownerDirs]).map((d) => `/uploads/${d}/`);
  for (const url of urls) {
    if (!prefixes.some((p) => url.startsWith(p))) throw HttpError.badRequest('رابط صورة غير مسموح');
  }
}
