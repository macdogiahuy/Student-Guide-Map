import type { Request, Response } from 'express';
import { BaseController } from '../../lib/baseController.js';
import { asyncErrorWrapper } from '../../lib/asyncErrorWrapper.js';
import { AppError } from '../../lib/errors.js';
import { todayDay } from '../../lib/openingStatus.js';
import { prisma } from '../../lib/prisma.js';
import { locationService } from './location.service.js';
import type { searchQuerySchema } from './location.schema.js';
import type { z } from 'zod';

type SearchQuery = z.infer<typeof searchQuerySchema>;

function parseBbox(raw?: string) {
  if (!raw) return undefined;
  const [swLat, neLat, swLng, neLng] = raw.split(',').map(Number);
  if ([swLat, neLat, swLng, neLng].some((n) => !Number.isFinite(n))) return undefined;
  return { swLat, neLat, swLng, neLng };
}

export class LocationController extends BaseController {
  search = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const q = req.query as unknown as SearchQuery;
      const now = new Date();
      const result = await locationService.search(
        {
          q: q.q,
          category: q.category,
          priceLevel: q.priceLevel,
          minRating: q.minRating,
          open: q.open === 'true',
          hasPromotion: q.hasPromotion === 'true',
          lat: q.lat,
          lng: q.lng,
          radiusKm: q.radiusKm,
          bbox: parseBbox(q.bbox),
          sort: q.sort,
          page: q.page,
          limit: q.limit,
          day: todayDay(now),
          nowMinutes: now.getHours() * 60 + now.getMinutes(),
        },
        req.user,
      );
      this.success(res, result);
    } catch (e) {
      this.error(res, e, 'locations.search');
    }
  });

  getDetail = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const lat = Number((req.query as Record<string, string>).lat);
      const lng = Number((req.query as Record<string, string>).lng);
      const near =
        Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
      const data = await locationService.getDetail(req.params.id, req.user, near);
      this.success(res, data);
    } catch (e) {
      this.error(res, e, 'locations.detail');
    }
  });

  create = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const loc = await locationService.create(req.user!, req.body);
      this.created(res, loc, 'Địa điểm đã được gửi và đang chờ quản trị viên phê duyệt.');
    } catch (e) {
      this.error(res, e, 'locations.create');
    }
  });

  update = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const loc = await locationService.update(req.user!, req.params.id, req.body);
      this.success(res, loc, 'Đã cập nhật địa điểm.');
    } catch (e) {
      this.error(res, e, 'locations.update');
    }
  });

  remove = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const data = await locationService.remove(req.params.id);
      this.success(res, data, 'Đã xóa địa điểm.');
    } catch (e) {
      this.error(res, e, 'locations.remove');
    }
  });

  decide = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const { decision, reason } = req.body as {
        decision: 'APPROVED' | 'REJECTED';
        reason?: string;
      };
      const loc = await locationService.decide(req.user!, req.params.id, decision, reason);
      this.success(
        res,
        loc,
        decision === 'APPROVED' ? 'Đã duyệt địa điểm.' : 'Đã từ chối địa điểm.',
      );
    } catch (e) {
      this.error(res, e, 'locations.decide');
    }
  });

  setHours = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const hours = await locationService.setHours(req.user!, req.params.id, req.body.hours);
      this.success(res, hours, 'Đã cập nhật giờ mở cửa.');
    } catch (e) {
      this.error(res, e, 'locations.hours');
    }
  });

  addImages = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const files = (req.files as Express.Multer.File[]) ?? [];
      const images = await locationService.addImages(req.user!, req.params.id, files);
      this.success(res, images, 'Đã tải ảnh lên.');
    } catch (e) {
      this.error(res, e, 'locations.images');
    }
  });

  deleteImage = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const data = await locationService.deleteImage(
        req.user!,
        req.params.id,
        req.params.imageId,
      );
      this.success(res, data, 'Đã xóa ảnh.');
    } catch (e) {
      this.error(res, e, 'locations.deleteImage');
    }
  });

  setPrices = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const items = req.body as { itemName: string; price: number }[];
      const data = await locationService.setPriceReferences(req.user!, req.params.id, items);
      this.success(res, data, 'Đã cập nhật bảng giá tham khảo.');
    } catch (e) {
      this.error(res, e, 'locations.prices');
    }
  });

  /** Compare prices across same-category locations (price comparison feature). */
  compare = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const categoryId = (req.query as Record<string, string>).categoryId;
      const exclude = (req.query as Record<string, string>).exclude;
      if (!categoryId) throw AppError.badRequest('Thiếu categoryId.');
      const items = await prisma.location.findMany({
        where: {
          categoryId,
          status: 'APPROVED',
          activeStatus: 'ACTIVE',
          ...(exclude ? { id: { not: exclude } } : {}),
          priceReferences: { some: {} },
        },
        include: {
          priceReferences: { orderBy: { price: 'asc' } },
          images: { take: 1, orderBy: { isPrimary: 'desc' } },
        },
        orderBy: [{ ratingAvg: 'desc' }],
        take: 20,
      });
      this.success(
        res,
        items.map((l) => ({
          id: l.id,
          name: l.name,
          address: l.address,
          priceLevel: l.priceLevel,
          priceRange: l.priceRange,
          ratingAvg: l.ratingAvg,
          ratingCount: l.ratingCount,
          image: l.images[0]?.url ?? null,
          priceReferences: l.priceReferences,
        })),
      );
    } catch (e) {
      this.error(res, e, 'locations.compare');
    }
  });

  route = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      res.setHeader('Cache-Control', 'private, no-store');
      const fromLat = Number(req.query.fromLat);
      const fromLng = Number(req.query.fromLng);
      if (!Number.isFinite(fromLat) || !Number.isFinite(fromLng)) {
        throw AppError.badRequest('Thiếu fromLat/fromLng hợp lệ.');
      }
      const vehicle = typeof req.query.vehicle === 'string' ? req.query.vehicle : 'motorcycle';
      const data = await locationService.getRoute(req.params.id, fromLat, fromLng, vehicle);
      this.success(res, data);
    } catch (e) {
      this.error(res, e, 'locations.route');
    }
  });
}

export const locationController = new LocationController();
