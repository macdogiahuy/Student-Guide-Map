import type { Prisma } from '@prisma/client';
import type { AuthUser } from '../../types/index.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';

export class AdminService {
  async dashboard() {
    const since30 = new Date(Date.now() - 30 * 24 * 3600_000);
    const [
      totalStudents,
      totalStoreOwners,
      totalLocations,
      pendingLocations,
      approvedLocations,
      activePromotions,
      pendingPromotions,
      pendingReports,
      inProgressReports,
      totalReviews,
      displayedReviews,
      pendingCorrections,
      recentLocations,
      recentReports,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'STORE_OWNER' } }),
      prisma.location.count(),
      prisma.location.count({ where: { status: 'PENDING' } }),
      prisma.location.count({ where: { status: 'APPROVED' } }),
      prisma.promotion.count({ where: { status: 'ACTIVE' } }),
      prisma.promotion.count({ where: { status: 'PENDING' } }),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.report.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.review.count(),
      prisma.review.count({ where: { status: 'DISPLAYED' } }),
      prisma.correctionRequest.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
      prisma.location.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { owner: { select: { storeName: true, fullName: true } }, category: true },
      }),
      prisma.report.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { location: { select: { name: true } }, reporter: { select: { fullName: true } } },
      }),
    ]);

    const reviewsLast30 = await prisma.review.count({ where: { createdAt: { gte: since30 } } });

    return {
      stats: {
        totalStudents,
        totalStoreOwners,
        totalLocations,
        pendingLocations,
        approvedLocations,
        activePromotions,
        pendingPromotions,
        pendingReports,
        inProgressReports,
        totalReviews,
        displayedReviews,
        pendingCorrections,
        reviewsLast30,
      },
      recentLocations,
      recentReports,
    };
  }

  async listUsers(params: { role?: string; q?: string; status?: string; page: number; limit: number }) {
    const where: Prisma.UserWhereInput = {
      ...(params.role ? { role: params.role as never } : {}),
      ...(params.status ? { status: params.status as never } : {}),
      ...(params.q
        ? {
            OR: [
              { fullName: { contains: params.q, mode: 'insensitive' } },
              { email: { contains: params.q, mode: 'insensitive' } },
              { storeName: { contains: params.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          storeName: true,
          avatarUrl: true,
          emailVerifiedAt: true,
          createdAt: true,
          _count: { select: { locations: true, reviews: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.user.count({ where }),
    ]);
    return {
      items,
      meta: { page: params.page, limit: params.limit, total, totalPages: Math.max(1, Math.ceil(total / params.limit)) },
    };
  }

  async updateUser(id: string, data: { status?: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION' }) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw AppError.notFound('Không tìm thấy tài khoản.');
    if (user.role === 'ADMIN' && data.status === 'SUSPENDED') {
      throw AppError.badRequest('Không thể khóa tài khoản quản trị viên.');
    }
    return prisma.user.update({
      where: { id },
      data: {
        status: data.status,
        emailVerifiedAt: data.status === 'ACTIVE' ? (user.emailVerifiedAt ?? new Date()) : user.emailVerifiedAt,
      },
      select: { id: true, fullName: true, email: true, role: true, status: true },
    });
  }

  // ── Categories ──
  listCategories(includeInactive = true) {
    return prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { locations: true } } },
    });
  }

  createCategory(data: { name: string; slug: string; icon?: string; description?: string; sortOrder?: number }) {
    return prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        icon: data.icon ?? 'pin',
        description: data.description,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async updateCategory(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      icon: string;
      description: string | null;
      sortOrder: number;
      isActive: boolean;
    }>,
  ) {
    const cat = await prisma.category.findUnique({ where: { id } });
    if (!cat) throw AppError.notFound('Không tìm thấy danh mục.');
    return prisma.category.update({ where: { id }, data });
  }

  async deleteCategory(id: string) {
    const cat = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { locations: true } } } });
    if (!cat) throw AppError.notFound('Không tìm thấy danh mục.');
    if (cat._count.locations > 0) {
      throw AppError.conflict(
        `Danh mục đang có ${cat._count.locations} địa điểm. Hãy chuyển địa điểm sang danh mục khác hoặc ẩn danh mục (isActive=false).`,
      );
    }
    await prisma.category.delete({ where: { id } });
    return { id };
  }

  // ── Locations queue ──
  async listLocations(params: { status?: string; q?: string; categoryId?: string; page: number; limit: number }) {
    const where: Prisma.LocationWhereInput = {
      ...(params.status ? { status: params.status as never } : {}),
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.q
        ? {
            OR: [
              { name: { contains: params.q, mode: 'insensitive' } },
              { address: { contains: params.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.location.findMany({
        where,
        include: {
          category: true,
          owner: { select: { id: true, fullName: true, storeName: true, email: true } },
          images: { take: 1, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.location.count({ where }),
    ]);
    return {
      items: items.map((l) => ({ ...l, imageUrl: l.images[0]?.url ?? null, images: undefined })),
      meta: { page: params.page, limit: params.limit, total, totalPages: Math.max(1, Math.ceil(total / params.limit)) },
    };
  }

  // ── Promotions moderation queue ──
  async listPromotions(params: { status?: string; page: number; limit: number }) {
    const where = params.status ? { status: params.status as never } : {};
    const [items, total] = await Promise.all([
      prisma.promotion.findMany({
        where,
        include: {
          location: { select: { id: true, name: true, address: true } },
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.promotion.count({ where }),
    ]);
    return {
      items,
      meta: { page: params.page, limit: params.limit, total, totalPages: Math.max(1, Math.ceil(total / params.limit)) },
    };
  }

  // ── Reviews moderation queue ──
  async listReviews(params: { status?: string; q?: string; page: number; limit: number }) {
    const where: Prisma.ReviewWhereInput = {
      ...(params.status ? { status: params.status as never } : {}),
      ...(params.q
        ? { comment: { contains: params.q, mode: 'insensitive' } }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          location: { select: { id: true, name: true } },
          reply: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.review.count({ where }),
    ]);
    return {
      items,
      meta: { page: params.page, limit: params.limit, total, totalPages: Math.max(1, Math.ceil(total / params.limit)) },
    };
  }

  // ── Statistics ──
  async statistics() {
    const now = new Date();
    const months: { label: string; start: Date; end: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      months.push({
        label: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
        start,
        end,
      });
    }

    const usersByMonth = await Promise.all(
      months.map(async (m) => ({
        month: m.label,
        count: await prisma.user.count({ where: { createdAt: { gte: m.start, lt: m.end } } }),
      })),
    );
    const reviewsByMonth = await Promise.all(
      months.map(async (m) => ({
        month: m.label,
        count: await prisma.review.count({ where: { createdAt: { gte: m.start, lt: m.end } } }),
      })),
    );

    const locationsByCategory = await prisma.location.groupBy({
      by: ['categoryId'],
      _count: true,
      where: { status: 'APPROVED' },
    });
    const categories = await prisma.category.findMany({ select: { id: true, name: true } });
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    const reportsByStatus = await prisma.report.groupBy({ by: ['status'], _count: true });
    const promotionsByStatus = await prisma.promotion.groupBy({ by: ['status'], _count: true });
    const topRated = await prisma.location.findMany({
      where: { status: 'APPROVED', ratingCount: { gte: 1 } },
      orderBy: [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }],
      take: 5,
      select: { id: true, name: true, ratingAvg: true, ratingCount: true },
    });

    return {
      usersByMonth,
      reviewsByMonth,
      locationsByCategory: locationsByCategory.map((l) => ({
        category: catMap.get(l.categoryId) ?? 'N/A',
        count: l._count,
      })),
      reportsByStatus: reportsByStatus.map((r) => ({ status: r.status, count: r._count })),
      promotionsByStatus: promotionsByStatus.map((p) => ({ status: p.status, count: p._count })),
      topRated,
    };
  }

  async adminList(actor: AuthUser) {
    if (actor.role !== 'ADMIN') throw AppError.forbidden();
    return prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, fullName: true, email: true, createdAt: true },
    });
  }
}

export const adminService = new AdminService();

