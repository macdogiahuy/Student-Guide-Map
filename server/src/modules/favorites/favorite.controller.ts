import type { Request, Response } from 'express';
import { BaseController } from '../../lib/baseController.js';
import { asyncErrorWrapper } from '../../lib/asyncErrorWrapper.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { getOpenStatus } from '../../lib/openingStatus.js';
import { formatDistance, haversineKm } from '../../lib/geo.js';

export class FavoriteController extends BaseController {
  list = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const lat = Number((req.query as Record<string, string>).lat);
      const lng = Number((req.query as Record<string, string>).lng);
      const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);
      const favorites = await prisma.favorite.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        include: {
          location: {
            include: {
              category: true,
              images: { take: 1, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
              openingHours: true,
              owner: { select: { storeName: true, fullName: true } },
            },
          },
        },
      });
      const items = favorites
        .filter((f) => f.location.status === 'APPROVED' && f.location.activeStatus === 'ACTIVE')
        .map((f) => {
          const loc = f.location;
          const open = getOpenStatus(loc.openingHours);
          const distanceKm = hasPoint ? haversineKm(lat, lng, loc.lat, loc.lng) : null;
          return {
            favoriteId: f.id,
            savedAt: f.createdAt,
            id: loc.id,
            name: loc.name,
            address: loc.address,
            lat: loc.lat,
            lng: loc.lng,
            priceLevel: loc.priceLevel,
            priceRange: loc.priceRange,
            ratingAvg: loc.ratingAvg,
            ratingCount: loc.ratingCount,
            imageUrl: loc.images[0]?.url ?? null,
            category: loc.category,
            ownerName: loc.owner.storeName ?? loc.owner.fullName,
            openStatus: { state: open.state, label: open.label },
            distanceKm,
            distanceLabel: distanceKm != null ? formatDistance(distanceKm) : null,
          };
        });
      this.success(res, { items, meta: { total: items.length, page: 1, limit: items.length || 1, totalPages: 1 } });
    } catch (e) {
      this.error(res, e, 'favorites.list');
    }
  });

  add = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const locationId = req.params.locationId;
      const location = await prisma.location.findUnique({ where: { id: locationId } });
      if (!location || location.status !== 'APPROVED') {
        throw AppError.notFound('Không tìm thấy địa điểm.');
      }
      const existing = await prisma.favorite.findUnique({
        where: { userId_locationId: { userId: req.user!.id, locationId } },
      });
      if (existing) {
        this.success(res, existing, 'Địa điểm đã có trong danh sách yêu thích.');
        return;
      }
      const fav = await prisma.favorite.create({
        data: { userId: req.user!.id, locationId },
      });
      this.created(res, fav, 'Đã thêm vào Yêu thích.');
    } catch (e) {
      this.error(res, e, 'favorites.add');
    }
  });

  remove = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const locationId = req.params.locationId;
      const existing = await prisma.favorite.findUnique({
        where: { userId_locationId: { userId: req.user!.id, locationId } },
      });
      if (!existing) throw AppError.notFound('Không có trong danh sách yêu thích.');
      await prisma.favorite.delete({ where: { id: existing.id } });
      this.success(res, { locationId }, 'Đã bỏ khỏi Yêu thích.');
    } catch (e) {
      this.error(res, e, 'favorites.remove');
    }
  });
}

export const favoriteController = new FavoriteController();
