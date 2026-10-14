import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { config } from '../config/unifiedConfig.js';
import { AppError } from './errors.js';

const uploadRoot = path.resolve(process.cwd(), config.upload.dir);
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safe = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${safe}`);
  },
});

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

export function resolveUploadPath(url: string): string | null {
  if (!url.startsWith('/uploads/')) return null;
  const rel = url.slice('/uploads/'.length);
  const abs = path.resolve(uploadRoot, rel);
  if (!abs.startsWith(uploadRoot)) return null; // path traversal guard
  return abs;
}

export function removeUploadFile(url: string): void {
  const abs = resolveUploadPath(url);
  if (abs && fs.existsSync(abs)) fs.unlinkSync(abs);
}
