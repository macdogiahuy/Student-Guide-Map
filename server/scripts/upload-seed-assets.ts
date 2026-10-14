/* eslint-disable no-console */
// One-off: upload local seed images (server/uploads/*) to Vercel Blob so the
// production seed can reference them via SEED_IMAGE_BASE_URL.
// Usage:
//   BLOB_READ_WRITE_TOKEN=xxx npx tsx scripts/upload-seed-assets.ts
// Prints the base URL to use as SEED_IMAGE_BASE_URL when seeding prod.
import fs from 'node:fs';
import path from 'node:path';
import { put } from '@vercel/blob';

const dir = path.resolve(process.cwd(), 'uploads');
const files = fs.readdirSync(dir).filter((f) => /\.(jpg|jpeg|png|webp|svg)$/i.test(f));
if (!files.length) {
  console.log('No seed assets found in uploads/.');
  process.exit(0);
}

const contentType = (f: string) =>
  f.endsWith('.svg') ? 'image/svg+xml' : f.endsWith('.png') ? 'image/png' : f.endsWith('.webp') ? 'image/webp' : 'image/jpeg';

let base = '';
for (const f of files) {
  const buf = fs.readFileSync(path.join(dir, f));
  const blob = await put(`seed/${f}`, buf, { access: 'public', contentType: contentType(f) });
  base = blob.url.slice(0, blob.url.lastIndexOf('/'));
  console.log(`${f} -> ${blob.url}`);
}
console.log(`\nSEED_IMAGE_BASE_URL=${base}`);
