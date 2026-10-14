import type { AuthUser } from '../../types/index.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import type { correctionRequestSchema, processCorrectionSchema } from './store.schema.js';
import type { z } from 'zod';

type CorrectionInput = z.infer<typeof correctionRequestSchema>;
type ProcessInput = z.infer<typeof processCorrectionSchema>;

export class StoreService {
  async dashboard(actor: AuthUser) {
    if (actor.role !== 'STORE_OWNER' && actor.role !== 'ADMIN') {
      throw AppError.forbidden('Chỉ tài khoản cửa hàng mới có bảng điều khiển.');
    }
    const where = { ownerId: actor.id };
    const since = new Date(Date.now() - 30 * 24 * 3600_000);
    const [totalLocations, pendingLocations, approvedLocations, activePromos, pendingPromos, newReviews, openCorrections, recentReviews] =
      await Promise.all([
        prisma.location.count({ where }),
        prisma.location.count({ where: { ...where, status: 'PENDING' } }),
        prisma.location.count({ where: { ...where, status: 'APPROVED' } }),
        prisma.promotion.count({ where: { location: where, status: 'ACTIVE' } }),
        prisma.promotion.count({ where: { location: where, status: 'PENDING' } }),
        prisma.review.count({
          where: { location: { ownerId: actor.id }, status: 'DISPLAYED', createdAt: { gte: since } },
        }),
        prisma.correctionRequest.count({ where: { requesterId: actor.id, status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
        prisma.review.findMany({
          where: { location: { ownerId: actor.id }, status: 'DISPLAYED' },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            user: { select: { fullName: true, avatarUrl: true } },
            location: { select: { id: true, name: true } },
          },
        }),
      ]);
    return {
      stats: {
        totalLocations,
        pendingLocations,
        approvedLocations,
        activePromos,
        pendingPromos,
        newReviews,
        openCorrections,
      },
      recentReviews,
    };
  }

  async myLocations(actor: AuthUser) {
    const items = await prisma.location.findMany({
      where: { ownerId: actor.id },
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        images: { take: 1, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        _count: { select: { promotions: true, reviews: { where: { status: 'DISPLAYED' } } } },
      },
    });
    return {
      items: items.map((l) => ({ ...l, imageUrl: l.images[0]?.url ?? null, images: undefined })),
      meta: { total: items.length, page: 1, limit: items.length || 1, totalPages: 1 },
    };
  }

  async myReviews(actor: AuthUser, page: number, limit: number) {
    const where = { location: { ownerId: actor.id }, status: 'DISPLAYED' as const };
    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, fullName: true, avatarUrl: true } },
          location: { select: { id: true, name: true } },
          reply: true,
        },
      }),
      prisma.review.count({ where }),
    ]);
    return { items, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async createCorrection(actor: AuthUser, input: CorrectionInput) {
    const location = await prisma.location.findUnique({ where: { id: input.locationId } });
    if (!location) throw AppError.notFound('Không tìm thấy địa điểm.');
    if (actor.role !== 'ADMIN' && location.ownerId !== actor.id) {
      throw AppError.forbidden('Đây không phải địa điểm của bạn.');
    }
    return prisma.correctionRequest.create({
      data: {
        locationId: input.locationId,
        requesterId: actor.id,
        field: input.field ?? null,
        description: input.description,
      },
      include: { location: { select: { id: true, name: true } } },
    });
  }

  async myCorrections(actor: AuthUser) {
    const items = await prisma.correctionRequest.findMany({
      where: { requesterId: actor.id },
      orderBy: { createdAt: 'desc' },
      include: { location: { select: { id: true, name: true } } },
    });
    return { items, meta: { total: items.length, page: 1, limit: items.length || 1, totalPages: 1 } };
  }

  async processCorrection(actor: AuthUser, id: string, input: ProcessInput) {
    if (actor.role !== 'ADMIN') throw AppError.forbidden('Chỉ quản trị viên mới được xử lý.');
    const req = await prisma.correctionRequest.findUnique({ where: { id } });
    if (!req) throw AppError.notFound('Không tìm thấy yêu cầu.');
    return prisma.correctionRequest.update({
      where: { id },
      data: { status: input.status, adminNote: input.adminNote ?? req.adminNote },
      include: { location: { select: { id: true, name: true } } },
    });
  }
}

export const storeService = new StoreService();

