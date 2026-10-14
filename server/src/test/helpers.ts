import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { Express } from 'express';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/unifiedConfig.js';

let counter = 0;
const uniq = () => `${Date.now()}_${counter++}`;

export interface TestUser {
  id: string;
  email: string;
  password: string;
  fullName: string;
  role: 'STUDENT' | 'STORE_OWNER' | 'ADMIN';
}

export async function createUser(
  role: TestUser['role'] = 'STUDENT',
  overrides: Partial<{ fullName: string; password: string; storeName: string }> = {},
): Promise<TestUser> {
  const suffix = uniq();
  const email = `${role.toLowerCase()}_${suffix}@test.local`;
  const password = overrides.password ?? 'Test@1234';
  const user = await prisma.user.create({
    data: {
      fullName: overrides.fullName ?? `Test ${role} ${suffix}`,
      email,
      passwordHash: await bcrypt.hash(password, 4),
      role,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      storeName: overrides.storeName ?? (role === 'STORE_OWNER' ? `Store ${suffix}` : undefined),
    },
  });
  return { id: user.id, email, password, fullName: user.fullName, role };
}

export async function createCategory(name = `Cat ${uniq()}`) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + (counter++);
  return prisma.category.create({ data: { name, slug, icon: 'pin' } });
}

export async function createApprovedLocation(
  ownerId: string,
  categoryId: string,
  overrides: Partial<{ name: string; lat: number; lng: number }> = {},
) {
  return prisma.location.create({
    data: {
      name: overrides.name ?? `Location ${uniq()}`,
      address: '1 Đường Test, Hoa Lac',
      lat: overrides.lat ?? 21.0133,
      lng: overrides.lng ?? 105.5247,
      categoryId,
      ownerId,
      status: 'APPROVED',
      approvedAt: new Date(),
      priceLevel: 2,
      openingHours: {
        create: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => ({
          day: day as never,
          openTime: '07:00',
          closeTime: '22:00',
          isClosed: false,
        })),
      },
    },
  });
}

export async function login(app: Express, user: Pick<TestUser, 'email' | 'password'>) {
  const res = await request(app).post('/api/v1/auth/login').send({
    email: user.email,
    password: user.password,
  });
  if (res.status !== 200) {
    throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  // refresh token is httpOnly cookie only — parse it from set-cookie header
  // supertest types set-cookie as string but it's string[] at runtime
  const setCookie = (res.headers['set-cookie'] as unknown as string[] | undefined) ?? [];
  const raw = setCookie.find((c) => c.startsWith('sgm_refresh=')) ?? '';
  const refresh = raw.split(';')[0]?.split('=')[1] ?? '';
  return { token: res.body.data.accessToken as string, refresh };
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export const testConfig = config;
