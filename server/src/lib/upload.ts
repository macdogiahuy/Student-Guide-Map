import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { put, del } from '@vercel/blob';
import { config } from '../config/unifiedConfig.js';
import { AppError } from './errors.js';

// NOTE: no module-level fs writes — Vercel serverless filesystem is read-only
// (except /tmp). All disk access happens lazily inside functions below.

// Blob object storage on Vercel (BLOB_READ_WRITE_TOKEN auto-injected when a Blob
// store is linked). Local dev / tests without the token fall back to disk.
const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

// memoryStorage feeds both backends: buffer → Blob, or buffer → local file.
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxSize, files: 8 },
  fileFilter: (_req, file, cb) => {
    if (!(config.upload.allowedTypes as readonly string[]).includes(file.mimetype)) {
      return cb(AppError.badRequest('Chỉ chấp nhận tệp ảnh JPG, PNG hoặc WEBP.'));
    }
    cb(null, true);
  },
});

function safeFilename(originalname: string): string {
  const ext = path.extname(originalname).toLowerCase() || '.jpg';
  const safe = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${safe}`;
}

/**
 * Persist one multer (memory) file and return its public URL.
 * Vercel Blob in prod, local /uploads in dev/test.
 */
export async function storeUploadedFile(file: Express.Multer.File, folder = 'locations'): Promise<string> {
  if (!(config.upload.allowedTypes as readonly string[]).includes(file.mimetype)) {
    throw AppError.badRequest('Chỉ chấp nhận tệp ảnh JPG, PNG hoặc WEBP.');
  }
  if (useBlob) {
    const blob = await put(`${folder}/${safeFilename(file.originalname)}`, file.buffer, {
      access: 'public',
      contentType: file.mimetype,
    });
    return blob.url;
  }
  const uploadRoot = path.resolve(process.cwd(), config.upload.dir);
  fs.mkdirSync(uploadRoot, { recursive: true });
  const filename = safeFilename(file.originalname);
  fs.writeFileSync(path.join(uploadRoot, filename), file.buffer);
  return `/uploads/${filename}`;
}

export function resolveUploadPath(url: string): string | null {
  if (!url.startsWith('/uploads/')) return null;
  const uploadRoot = path.resolve(process.cwd(), config.upload.dir);
  const rel = url.slice('/uploads/'.length);
  const abs = path.resolve(uploadRoot, rel);
  if (!abs.startsWith(uploadRoot)) return null; // path traversal guard
  return abs;
}

/** Best-effort delete (Blob or local). Never throws — callers await it safely. */
export async function removeUploadFile(url: string): Promise<void> {
  try {
    if (url.startsWith('http')) {
      await del(url);
      return;
    }
    const abs = resolveUploadPath(url);
    if (abs && fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch {
    /* file cleanup must never fail the API call */
  }
}
