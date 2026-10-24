import type { AuthUser } from '../../types/index.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import type { createPromotionSchema, updatePromotionSchema } from './promotion.schema.js';
import type { z } from 'zod';

type CreateInput = z.infer<typeof createPromotionSchema>;
type UpdateInput = z.infer<typeof updatePromotionSchema>;

export class PromotionService {
  async listPublic(params: {
    category?: string;
    locationId?: string;
    q?: string;
    page: number;
    limit: number;
  }) {
    const where = {
      status: 'ACTIVE' as const,
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
      ...(params.locationId ? { locationId: params.locationId } : {}),
      ...(params.q
        ? {
            OR: [
              { title: { contains: params.q, mode: 'insensitive' as const } },
              { content: { contains: params.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(params.category
        ? { location: { category: { slug: params.category } } }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.promotion.findMany({
        where,
        orderBy: [{ endDate: 'asc' }, { createdAt: 'desc' }],
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: {
          location: {
            select: {
              id: true,
              name: true,
              address: true,
              priceLevel: true,
              ratingAvg: true,
              ratingCount: true,
              category: true,
              images: { take: 1, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
              owner: { select: { storeName: true } },
            },
          },
        },
      }),
      prisma.promotion.count({ where }),
    ]);
    return {
      items: items.map((p) => ({
        ...p,
        location: {
          ...p.location,
          imageUrl: p.location.images[0]?.url ?? null,
          images: undefined,
        },
      })),
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
      },
    };
  }

  async getPublic(id: string) {
    const promo = await prisma.promotion.findUnique({
      where: { id },
      include: {
        location: {
          include: {
            category: true,
            images: { take: 1, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
            owner: { select: { storeName: true, fullName: true } },
          },
        },
      },
    });
    if (!promo || promo.status !== 'ACTIVE' || promo.startDate > new Date() || promo.endDate < new Date()) {
      throw AppError.notFound('Không tìm thấy ưu đãi.');
    }
    return { ...promo, location: { ...promo.location, images: undefined, imageUrl: promo.location.images[0]?.url ?? null } };
  }

  private async assertOwnedLocation(actor: AuthUser, locationId: string) {
    const location = await prisma.location.findUnique({ where: { id: locationId } });
    if (!location) throw AppError.notFound('Không tìm thấy địa điểm.');
    if (actor.role !== 'ADMIN' && location.ownerId !== actor.id) {
      throw AppError.forbidden('Đây không phải địa điểm của bạn.');
    }
    return location;
  }

  async listForOwner(actor: AuthUser) {
    const items = await prisma.promotion.findMany({
      where: { location: { ownerId: actor.id } },
      orderBy: { createdAt: 'desc' },
      include: { location: { select: { id: true, name: true, status: true } } },
    });
    return { items, meta: { total: items.length, page: 1, limit: items.length || 1, totalPages: 1 } };
  }

  async createStore(actor: AuthUser, input: CreateInput) {
    await this.assertOwnedLocation(actor, input.locationId);
    if (input.endDate <= input.startDate) {
      throw AppError.badRequest('Ngày kết thúc phải sau ngày bắt đầu.');
    }
    const promo = await prisma.promotion.create({
      data: {
        locationId: input.locationId,
        title: input.title,
        content: input.content,
        discountLabel: input.discountLabel ?? null,
        conditions: input.conditions ?? null,
        startDate: input.startDate,
        endDate: input.endDate,
        status: 'PENDING',
      },
    });
    return promo;
  }

  async updateStore(actor: AuthUser, id: string, input: UpdateInput) {
    const promo = await prisma.promotion.findUnique({ where: { id } });
    if (!promo) throw AppError.notFound('Không tìm thấy ưu đãi.');
    await this.assertOwnedLocation(actor, promo.locationId);
    if (input.startDate && input.endDate && input.endDate <= input.startDate) {
      throw AppError.badRequest('Ngày kết thúc phải sau ngày bắt đầu.');
    }
    return prisma.promotion.update({
      where: { id },
      data: {
        title: input.title,
        content: input.content,
        discountLabel: input.discountLabel,
        conditions: input.conditions,
        startDate: input.startDate,
        endDate: input.endDate,
      },
    });
  }

  async removeStore(actor: AuthUser, id: string) {
    const promo = await prisma.promotion.findUnique({ where: { id } });
    if (!promo) throw AppError.notFound('Không tìm thấy ưu đãi.');
    if (actor.role !== 'ADMIN') await this.assertOwnedLocation(actor, promo.locationId);
    await prisma.promotion.delete({ where: { id } });
    return { id };
  }

  async decide(actor: AuthUser, id: string, decision: 'ACTIVE' | 'REJECTED', reason?: string) {
    if (actor.role !== 'ADMIN') throw AppError.forbidden('Chỉ quản trị viên mới được duyệt ưu đãi.');
    const promo = await prisma.promotion.findUnique({
      where: { id },
      include: { location: { select: { id: true, name: true, ownerId: true } } },
    });
    if (!promo) throw AppError.notFound('Không tìm thấy ưu đãi.');
    if (decision === 'REJECTED' && !reason) {
      throw AppError.badRequest('Cần nhập lý do từ chối.', ['rejectionReason: Bắt buộc']);
    }
    const updated = await prisma.promotion.update({
      where: { id },
      data: {
        status: decision,
        rejectionReason: decision === 'REJECTED' ? reason ?? null : null,
        approvedAt: decision === 'ACTIVE' ? new Date() : null,
      },
    });
    await prisma.notification.create({
      data: {
        userId: promo.location.ownerId,
        type: decision === 'ACTIVE' ? 'PROMOTION_APPROVED' : 'PROMOTION_REJECTED',
        title: decision === 'ACTIVE' ? 'Ưu đãi đã được duyệt' : 'Ưu đãi bị từ chối',
        body:
          decision === 'ACTIVE'
            ? `Ưu đãi "${promo.title}" đã được phê duyệt và hiển thị cho sinh viên.`
            : `Ưu đãi "${promo.title}" chưa đạt yêu cầu. Lý do: ${reason}`,
        link: `/store/promotions/${promo.id}`,
      },
    });
    return updated;
  }
}

export const promotionService = new PromotionService();
