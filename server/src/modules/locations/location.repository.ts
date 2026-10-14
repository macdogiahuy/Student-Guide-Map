import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export interface SearchParams {
  q?: string;
  category?: string;
  priceLevel?: number;
  minRating?: number;
  open?: boolean;
  hasPromotion?: boolean;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  bbox?: { swLat: number; neLat: number; swLng: number; neLng: number };
  sort: 'nearest' | 'rating' | 'price' | 'newest';
  page: number;
  limit: number;
  day: string;
  nowMinutes: number;
}

export interface RawLocationRow {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
  description: string | null;
  priceLevel: number;
  priceRange: string | null;
  ratingAvg: number;
  ratingCount: number;
  status: string;
  activeStatus: string;
  createdAt: Date;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  categoryIcon: string;
  ownerName: string | null;
  imageUrl: string | null;
  hasPromotion: boolean;
  promoTitle: string | null;
  openMin: number | null;
  closeMin: number | null;
  isClosedToday: boolean | null;
  openTime: string | null;
  closeTime: string | null;
  distanceKm: number | null;
}

const ORDER_SQL: Record<SearchParams['sort'], Prisma.Sql> = {
  nearest: Prisma.sql`"distanceKm" ASC NULLS LAST, "ratingAvg" DESC`,
  rating: Prisma.sql`"ratingAvg" DESC, "ratingCount" DESC`,
  price: Prisma.sql`"priceLevel" ASC, "ratingAvg" DESC`,
  newest: Prisma.sql`"createdAt" DESC`,
};

export class LocationRepository {
  private base(p: SearchParams): Prisma.Sql {
    const conds: Prisma.Sql[] = [
      Prisma.sql`l."status" = 'APPROVED'`,
      Prisma.sql`l."activeStatus" = 'ACTIVE'`,
    ];

    if (p.q) {
      const like = `%${p.q}%`;
      conds.push(
        Prisma.sql`(l."name" ILIKE ${like} OR l."address" ILIKE ${like} OR l."description" ILIKE ${like} OR c."name" ILIKE ${like})`,
      );
    }
    if (p.category) {
      conds.push(Prisma.sql`(c."slug" = ${p.category} OR c."id" = ${p.category})`);
    }
    if (p.priceLevel) conds.push(Prisma.sql`l."priceLevel" = ${p.priceLevel}::int`);
    if (p.minRating) conds.push(Prisma.sql`l."ratingAvg" >= ${p.minRating}::float8`);
    if (p.hasPromotion) {
      conds.push(
        Prisma.sql`EXISTS (
          SELECT 1 FROM "Promotion" pl
          WHERE pl."locationId" = l."id" AND pl."status" = 'ACTIVE'
            AND pl."startDate" <= now() AND pl."endDate" >= now())`,
      );
    }
    if (p.bbox) {
      conds.push(
        Prisma.sql`l."lat" BETWEEN ${p.bbox.swLat}::float8 AND ${p.bbox.neLat}::float8
          AND l."lng" BETWEEN ${p.bbox.swLng}::float8 AND ${p.bbox.neLng}::float8`,
      );
    }

    return Prisma.join(conds, ' AND ');
  }

  private inner(p: SearchParams): Prisma.Sql {
    const where = this.base(p);
    const hasPoint = typeof p.lat === 'number' && typeof p.lng === 'number';

    const distanceExpr = hasPoint
      ? Prisma.sql`(6371 * 2 * asin(sqrt(
            power(sin(radians((${p.lat}::float8 - l."lat") / 2)), 2) +
            cos(radians(${p.lat}::float8)) * cos(radians(l."lat")) *
            power(sin(radians((${p.lng}::float8 - l."lng") / 2)), 2)
          )))`
      : Prisma.sql`NULL::float8`;

    return Prisma.sql`
      SELECT
        l."id" AS "id", l."name" AS "name", l."address" AS "address",
        l."lat" AS "lat", l."lng" AS "lng", l."phone" AS "phone",
        l."description" AS "description",
        l."priceLevel" AS "priceLevel", l."priceRange" AS "priceRange",
        l."ratingAvg" AS "ratingAvg", l."ratingCount" AS "ratingCount",
        l."status" AS "status", l."activeStatus" AS "activeStatus",
        l."createdAt" AS "createdAt",
        c."id" AS "categoryId", c."name" AS "categoryName", c."slug" AS "categorySlug",
        c."icon" AS "categoryIcon",
        u."storeName" AS "ownerName",
        img."url" AS "imageUrl",
        (EXISTS (SELECT 1 FROM "Promotion" pl WHERE pl."locationId" = l."id"
           AND pl."status" = 'ACTIVE' AND pl."startDate" <= now() AND pl."endDate" >= now())) AS "hasPromotion",
        promo."title" AS "promoTitle",
        CASE WHEN h."id" IS NULL THEN NULL ELSE
          (EXTRACT(hour FROM h."openTime"::time)::int * 60 + EXTRACT(minute FROM h."openTime"::time)::int)
        END AS "openMin",
        CASE WHEN h."id" IS NULL THEN NULL ELSE
          (EXTRACT(hour FROM h."closeTime"::time)::int * 60 + EXTRACT(minute FROM h."closeTime"::time)::int)
        END AS "closeMin",
        h."isClosed" AS "isClosedToday",
        h."openTime" AS "openTime",
        h."closeTime" AS "closeTime",
        ${distanceExpr} AS "distanceKm"
      FROM "Location" l
      JOIN "Category" c ON c."id" = l."categoryId"
      JOIN "User" u ON u."id" = l."ownerId"
      LEFT JOIN "OpeningHour" h ON h."locationId" = l."id" AND h."day"::text = ${p.day}
      LEFT JOIN LATERAL (
        SELECT i."url" FROM "LocationImage" i WHERE i."locationId" = l."id"
        ORDER BY i."isPrimary" DESC, i."sortOrder" ASC, i."createdAt" ASC LIMIT 1
      ) img ON true
      LEFT JOIN LATERAL (
        SELECT pr."title" FROM "Promotion" pr WHERE pr."locationId" = l."id"
          AND pr."status" = 'ACTIVE' AND pr."startDate" <= now() AND pr."endDate" >= now()
        ORDER BY pr."endDate" ASC LIMIT 1
      ) promo ON true
      WHERE ${where}
    `;
  }

  async search(p: SearchParams): Promise<{ items: RawLocationRow[]; total: number }> {
    const inner = this.inner(p);
    const hasPoint = typeof p.lat === 'number' && typeof p.lng === 'number';

    const outerConds: Prisma.Sql[] = [Prisma.sql`TRUE`];
    if (p.open) {
      outerConds.push(
        Prisma.sql`("isClosedToday" = false AND "openMin" IS NOT NULL AND (
          ("openMin" <= "closeMin" AND ${p.nowMinutes}::int BETWEEN "openMin" AND "closeMin")
          OR ("closeMin" < "openMin" AND (${p.nowMinutes}::int >= "openMin" OR ${p.nowMinutes}::int < "closeMin"))
        ))`,
      );
    }
    if (p.radiusKm && hasPoint) {
      outerConds.push(Prisma.sql`"distanceKm" <= ${p.radiusKm}::float8`);
    }

    const whereOuter = Prisma.join(outerConds, ' AND ');
    const rowsQ = Prisma.sql`
      SELECT * FROM (${inner}) t
      WHERE ${whereOuter}
      ORDER BY ${ORDER_SQL[p.sort]}
      LIMIT ${p.limit}::int OFFSET ${(p.page - 1) * p.limit}::int
    `;
    const countQ = Prisma.sql`SELECT COUNT(*)::int AS total FROM (${inner}) t WHERE ${whereOuter}`;

    const [rows, count] = await prisma.$transaction([
      prisma.$queryRaw<RawLocationRow[]>(rowsQ),
      prisma.$queryRaw<{ total: number }[]>(countQ),
    ]);

    return { items: rows, total: Number(count[0]?.total ?? 0) };
  }

  findById(id: string) {
    return prisma.location.findUnique({
      where: { id },
      include: {
        category: true,
        owner: {
          select: { id: true, fullName: true, storeName: true, phone: true, avatarUrl: true },
        },
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        openingHours: { orderBy: { day: 'asc' } },
        priceReferences: { orderBy: [{ price: 'asc' }, { createdAt: 'asc' }] },
        promotions: {
          where: { status: 'ACTIVE', startDate: { lte: new Date() }, endDate: { gte: new Date() } },
          orderBy: { endDate: 'asc' },
        },
      },
    });
  }

  countReviewsByRating(locationId: string) {
    return prisma.review.groupBy({
      by: ['rating'],
      where: { locationId, status: 'DISPLAYED' },
      _count: true,
      orderBy: { rating: 'desc' },
    });
  }

  async recomputeRating(locationId: string) {
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

export const locationRepository = new LocationRepository();
