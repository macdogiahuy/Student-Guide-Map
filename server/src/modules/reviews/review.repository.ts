import type { Prisma, Review } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

const REVIEW_INCLUDE = {
  user: { select: { id: true, fullName: true, avatarUrl: true } },
  reply: {
    include: { owner: { select: { id: true, fullName: true, storeName: true, avatarUrl: true } } },
  },
  location: { select: { id: true, name: true } },
} satisfies Prisma.ReviewInclude;

export type ReviewWithRelations = Prisma.ReviewGetPayload<{ include: typeof REVIEW_INCLUDE }>;

export class ReviewRepository {
  findForUser(userId: string, locationId: string) {
    return prisma.review.findUnique({
      where: { userId_locationId: { userId, locationId } },
      include: REVIEW_INCLUDE,
    });
  }

  findById(id: string) {
    return prisma.review.findUnique({ where: { id }, include: REVIEW_INCLUDE });
  }

  list(filter: {
    locationId?: string;
    userId?: string;
    page: number;
    limit: number;
    sort: 'newest' | 'rating';
    includeHidden?: boolean;
  }) {
    const where: Prisma.ReviewWhereInput = {
      ...(filter.locationId ? { locationId: filter.locationId } : {}),
      ...(filter.userId ? { userId: filter.userId } : {}),
      ...(filter.includeHidden ? {} : { status: 'DISPLAYED' }),
    };
    return prisma.$transaction([
      prisma.review.findMany({
        where,
        include: REVIEW_INCLUDE,
        orderBy: filter.sort === 'rating' ? [{ rating: 'desc' }, { createdAt: 'desc' }] : { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      prisma.review.count({ where }),
    ]);
  }

  create(data: Prisma.ReviewCreateInput) {
    return prisma.review.create({ data, include: REVIEW_INCLUDE });
  }

  update(id: string, data: Prisma.ReviewUpdateInput) {
    return prisma.review.update({ where: { id }, data, include: REVIEW_INCLUDE });
  }

  delete(id: string) {
    return prisma.review.delete({ where: { id } });
  }

  countRecent(userId: string, since: Date) {
    return prisma.review.count({ where: { userId, createdAt: { gte: since } } });
  }

  async recomputeLocationRating(locationId: string) {
    const agg = await prisma.review.aggregate({
      where: { locationId, status: 'DISPLAYED' },
      _avg: { rating: true },
      _count: true,
    });
    await prisma.location.update({
      where: { id: locationId },
      data: {
        ratingAvg: Number((agg._avg.rating ?? 0).toFixed(2)),
        ratingCount: agg._count,
      },
    });
  }
}

export const reviewRepository = new ReviewRepository();
