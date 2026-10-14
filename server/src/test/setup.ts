import { beforeAll } from 'vitest';
import { prisma } from '../lib/prisma.js';

/** Truncate every table between test files (clean slate, keeps schema). */
export async function resetDb() {
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;
  if (rows.length) {
    const list = rows.map((r) => `"${r.tablename}"`).join(', ');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  }
}

beforeAll(async () => {
  await resetDb();
});
