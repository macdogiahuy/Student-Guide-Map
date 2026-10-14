import type { Location } from '@prisma/client';
import type { AuthUser } from '../../types/index.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { formatDistance, haversineKm, walkingMinutes } from '../../lib/geo.js';
import { getOpenStatus, todayDay } from '../../lib/openingStatus.js';
import { locationRepository, type RawLocationRow, type SearchParams } from './location.repository.js';
import type { createLocationSchema, updateLocationSchema } from './location.schema.js';
import type { z } from 'zod';

type CreateInput = z.infer<typeof createLocationSchema>;
type UpdateInput = z.infer<typeof updateLocationSchema>;

export interface ListLocationDto {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
  priceLevel: number;
  priceRange: string | null;
  ratingAvg: number;
  ratingCount: number;
  category: { id: string; name: string; slug: string; icon: string };
  ownerName: string | null;
  imageUrl: string | null;
  hasPromotion: boolean;
  promoTitle: string | null;
  openStatus: { state: string; label: string };
  distanceKm: number | null;
  distanceLabel: string | null;
  walkingMinutes: number | null;
}

function mapRow(r: RawLocationRow): ListLocationDto {
  let status: { state: string; label: string };
  if (r.isClosedToday === null) {
    status = { state: 'CLOSED', label: 'Chưa có giờ mở cửa' };
  } else if (r.isClosedToday) {
    status = { state: 'CLOSED', label: 'Nghỉ hôm nay' };
  } else {
    const s = getOpenStatus([
      {
        id: 'h',
        locationId: r.id,
        day: todayDay(),
        openTime: r.openTime ?? '08:00',
        closeTime: r.closeTime ?? '22:00',
        isClosed: false,
      },
    ]);
    status = { state: s.state, label: s.label };
  }

  return {
    id: r.id,
    name: r.name,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
    phone: r.phone,
    priceLevel: r.priceLevel,
    priceRange: r.priceRange,
    ratingAvg: r.ratingAvg,
    ratingCount: r.ratingCount,
    category: {
      id: r.categoryId,
      name: r.categoryName,
      slug: r.categorySlug,
      icon: r.categoryIcon,
    },
    ownerName: r.ownerName,
    imageUrl: r.imageUrl,
    hasPromotion: r.hasPromotion,
    promoTitle: r.promoTitle,
    openStatus: status,
    distanceKm: r.distanceKm,
    distanceLabel: r.distanceKm != null ? formatDistance(r.distanceKm) : null,
    walkingMinutes: r.distanceKm != null ? walkingMinutes(r.distanceKm) : null,
  };
}

const DEFAULT_HOURS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

export class LocationService {
  async search(params: SearchParams, viewer?: AuthUser) {
    const { items, total } = await locationRepository.search(params);
    let favoriteIds = new Set<string>();
    if (viewer) {
      const favs = await prisma.favorite.findMany({
        where: { userId: viewer.id, locationId: { in: items.map((i) => i.id) } },
        select: { locationId: true },
      });
      favoriteIds = new Set(favs.map((f) => f.locationId));
    }
    return {
      items: items.map((r) => ({ ...mapRow(r), isFavorite: favoriteIds.has(r.id) })),
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
      },
    };
  }

  async getDetail(id: string, viewer: AuthUser | undefined, near?: { lat: number; lng: number }) {
    const loc = await locationRepository.findById(id);
    if (!loc) throw AppError.notFound('Không tìm thấy địa điểm.');
    const canSee =
      loc.status === 'APPROVED' &&
      (loc.activeStatus === 'ACTIVE' ||
        viewer?.role === 'ADMIN' ||
        viewer?.id === loc.ownerId);
    if (!canSee) throw AppError.notFound('Không tìm thấy địa điểm.');

    void prisma.location
      .update({ where: { id }, data: { viewCount: { increment: 1 } } })
      .catch(() => undefined);

    const breakdownRaw = await locationRepository.countReviewsByRating(id);
    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of breakdownRaw) breakdown[row.rating] = row._count;

    let isFavorite = false;
    let myReview = null;
    if (viewer) {
      const [fav, rev] = await Promise.all([
        prisma.favorite.findUnique({
          where: { userId_locationId: { userId: viewer.id, locationId: id } },
        }),
        prisma.review.findUnique({
          where: { userId_locationId: { userId: viewer.id, locationId: id } },
          include: { reply: true },
        }),
      ]);
      isFavorite = Boolean(fav);
      myReview = rev && rev.status !== 'DELETED' ? rev : null;
    }

    const distanceKm =
      near ? haversineKm(near.lat, near.lng, loc.lat, loc.lng) : null;

    const open = getOpenStatus(loc.openingHours);

    return {
      id: loc.id,
      name: loc.name,
      description: loc.description,
      address: loc.address,
      lat: loc.lat,
      lng: loc.lng,
      phone: loc.phone,
      priceLevel: loc.priceLevel,
      priceRange: loc.priceRange,
      ratingAvg: loc.ratingAvg,
      ratingCount: loc.ratingCount,
      viewCount: loc.viewCount,
      status: loc.status,
      activeStatus: loc.activeStatus,
      rejectionReason: loc.rejectionReason,
      category: loc.category,
      owner: {
        id: loc.owner.id,
        storeName: loc.owner.storeName,
        fullName: loc.owner.fullName,
        phone: loc.owner.phone,
        avatarUrl: loc.owner.avatarUrl,
      },
      images: loc.images,
      openingHours: loc.openingHours,
      priceReferences: loc.priceReferences,
      promotions: loc.promotions,
      ratingBreakdown: breakdown,
      openStatus: { state: open.state, label: open.label },
      distanceKm,
      distanceLabel: distanceKm != null ? formatDistance(distanceKm) : null,
      walkingMinutes: distanceKm != null ? walkingMinutes(distanceKm) : null,
      isFavorite,
      myReview,
      canEdit: viewer?.role === 'ADMIN' || viewer?.id === loc.ownerId,
      createdAt: loc.createdAt,
      updatedAt: loc.updatedAt,
    };
  }

  private async assertCategory(categoryId: string) {
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat || !cat.isActive) throw AppError.badRequest('Danh mục không tồn tại.');
    return cat;
  }

  async create(actor: AuthUser, input: CreateInput) {
    await this.assertCategory(input.categoryId);
    if (input.lat < -90 || input.lat > 90 || input.lng < -180 || input.lng > 180) {
      throw AppError.badRequest('Tọa độ không hợp lệ.');
    }
    const ownerId = actor.role === 'ADMIN' ? (input.ownerId ?? actor.id) : actor.id;
    if (actor.role === 'ADMIN' && input.ownerId) {
      const owner = await prisma.user.findUnique({ where: { id: input.ownerId } });
      if (!owner || owner.role !== 'STORE_OWNER') {
        throw AppError.badRequest('Chủ địa điểm phải là tài khoản cửa hàng.');
      }
    }
    const loc = await prisma.location.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        address: input.address,
        lat: input.lat,
        lng: input.lng,
        phone: input.phone ?? null,
        categoryId: input.categoryId,
        priceLevel: input.priceLevel,
        priceRange: input.priceRange ?? null,
        ownerId,
        status: 'PENDING',
        openingHours: {
          create: DEFAULT_HOURS.map((day) => ({
            day,
            openTime: '08:00',
            closeTime: '22:00',
            isClosed: false,
          })),
        },
      },
      include: { category: true },
    });
    return loc;
  }

  private async assertAccess(actor: AuthUser, locationId: string): Promise<Location> {
    const loc = await prisma.location.findUnique({ where: { id: locationId } });
    if (!loc) throw AppError.notFound('Không tìm thấy địa điểm.');
    if (actor.role === 'ADMIN') return loc;
    if (actor.role === 'STORE_OWNER' && loc.ownerId === actor.id) return loc;
    throw AppError.forbidden('Bạn không có quyền chỉnh sửa địa điểm này.');
  }

  async update(actor: AuthUser, id: string, input: UpdateInput) {
    await this.assertAccess(actor, id);
    if (input.categoryId) await this.assertCategory(input.categoryId);
    if (input.ownerId && actor.role !== 'ADMIN') delete input.ownerId;
    return prisma.location.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        address: input.address,
        lat: input.lat,
        lng: input.lng,
        phone: input.phone,
        categoryId: input.categoryId,
        priceLevel: input.priceLevel,
        priceRange: input.priceRange,
        activeStatus: input.activeStatus,
        ownerId: actor.role === 'ADMIN' ? input.ownerId : undefined,
      },
      include: { category: true },
    });
  }

  async remove(id: string) {
    const exists = await prisma.location.findUnique({ where: { id } });
    if (!exists) throw AppError.notFound('Không tìm thấy địa điểm.');
    await prisma.location.delete({ where: { id } });
    return { id };
  }

  async decide(actor: AuthUser, id: string, decision: 'APPROVED' | 'REJECTED', reason?: string) {
    const loc = await this.assertAccess(actor, id);
    if (decision === 'REJECTED' && !reason) {
      throw AppError.badRequest('Cần nhập lý do từ chối.', ['rejectionReason: Bắt buộc']);
    }
    const updated = await prisma.location.update({
      where: { id: loc.id },
      data: {
        status: decision,
        rejectionReason: decision === 'REJECTED' ? reason ?? null : null,
        approvedAt: decision === 'APPROVED' ? new Date() : null,
      },
    });
    await prisma.notification.create({
      data: {
        userId: loc.ownerId,
        type: decision === 'APPROVED' ? 'LOCATION_APPROVED' : 'LOCATION_REJECTED',
        title: decision === 'APPROVED' ? 'Địa điểm đã được duyệt' : 'Địa điểm bị từ chối',
        body:
          decision === 'APPROVED'
            ? `"${loc.name}" đã được phê duyệt và hiển thị trên hệ thống.`
            : `"${loc.name}" chưa đạt yêu cầu. Lý do: ${reason}`,
        link: `/store/locations/${loc.id}`,
      },
    });
    return updated;
  }

  async setHours(actor: AuthUser, id: string, hours: { day: string; openTime: string; closeTime: string; isClosed: boolean }[]) {
    await this.assertAccess(actor, id);
    await prisma.$transaction(
      hours.map((h) =>
        prisma.openingHour.upsert({
          where: { locationId_day: { locationId: id, day: h.day as never } },
          create: {
            locationId: id,
            day: h.day as never,
            openTime: h.openTime,
            closeTime: h.closeTime,
            isClosed: h.isClosed,
          },
          update: { openTime: h.openTime, closeTime: h.closeTime, isClosed: h.isClosed },
        }),
      ),
    );
    return prisma.openingHour.findMany({ where: { locationId: id }, orderBy: { day: 'asc' } });
  }

  async addImages(actor: AuthUser, id: string, files: Express.Multer.File[]) {
    await this.assertAccess(actor, id);
    if (!files.length) throw AppError.badRequest('Chưa chọn tập ảnh.');
    const count = await prisma.locationImage.count({ where: { locationId: id } });
    const { storeUploadedFile } = await import('../../lib/upload.js');
    const urls: string[] = [];
    for (const f of files) urls.push(await storeUploadedFile(f, `locations/${id}`));
    await prisma.locationImage.createMany({
      data: urls.map((url, i) => ({
        locationId: id,
        url,
        isPrimary: count === 0 && i === 0,
        sortOrder: count + i,
      })),
    });
    return prisma.locationImage.findMany({
      where: { locationId: id },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
    });
  }

  async deleteImage(actor: AuthUser, id: string, imageId: string) {
    await this.assertAccess(actor, id);
    const img = await prisma.locationImage.findUnique({ where: { id: imageId } });
    if (!img || img.locationId !== id) throw AppError.notFound('Không tìm thấy ảnh.');
    await prisma.locationImage.delete({ where: { id: imageId } });
    const { removeUploadFile } = await import('../../lib/upload.js');
    await removeUploadFile(img.url);
    return { id: imageId };
  }

  async setPriceReferences(actor: AuthUser, id: string, items: { itemName: string; price: number }[]) {
    await this.assertAccess(actor, id);
    await prisma.priceReference.deleteMany({ where: { locationId: id } });
    if (items.length) {
      await prisma.priceReference.createMany({
        data: items.map((i) => ({ locationId: id, itemName: i.itemName, price: i.price })),
      });
    }
    return prisma.priceReference.findMany({ where: { locationId: id }, orderBy: { price: 'asc' } });
  }

  /** Gọi Vietmap Route v4 để tính tuyến đường từ user -> địa điểm. */
  async getRoute(locationId: string, fromLat: number, fromLng: number, vehicle = 'motorcycle') {
    const loc = await prisma.location.findUnique({ where: { id: locationId } });
    if (!loc || loc.status !== 'APPROVED') throw AppError.notFound('Không tìm thấy địa điểm.');

    const { config } = await import('../../config/unifiedConfig.js');
    const key = config.vietmap.apiKey;
    if (!key) throw AppError.internal('Chưa cấu hình Vietmap API key.');

    // Route v4: point=[lat,lng] · points_encoded=false trả mảng tọa độ · annotations=toll → phí
    const url =
      `https://maps.vietmap.vn/api/route/v4?apikey=${key}` +
      `&point=${fromLat},${fromLng}` +
      `&point=${loc.lat},${loc.lng}` +
      `&vehicle=${vehicle}` +
      `&points_encoded=false` +
      `&annotations=toll`;

    const res = await fetch(url);
    if (!res.ok) throw AppError.internal(`Vietmap route API lỗi (${res.status}).`);
    const json = (await res.json()) as {
      code: string;
      messages?: string;
      paths?: {
        distance: number;
        time: number;
        points: { type: string; coordinates: [number, number][] } | [number, number][];
        instructions: {
          distance: number;
          heading?: number;
          sign?: number;
          interval?: [number, number];
          text?: string;
          time: number;
          street_name?: string;
        }[];
        toll_cost?: number;
        tolls?: { id: number; name: string; address: string; type: string; price: number }[];
      }[];
    };
    if (json.code !== 'OK' || !json.paths?.length) {
      const hint = json.code === 'ZERO_RESULTS' ? 'Không tìm được tuyến đường khả thi.' : json.messages || 'Không tìm được tuyến đường phù hợp.';
      throw AppError.badRequest(hint);
    }
    const p = json.paths[0];

    // points_encoded=false trả [lat,lng] hoặc GeoJSON LineString {coordinates:[[lng,lat]]}
    const rawCoords: [number, number][] = Array.isArray(p.points)
      ? p.points
      : (p.points as { coordinates: [number, number][] }).coordinates;
    // chuẩn hoá về [lng,lat] cho MapLibre
    const polyline = rawCoords.map((c) =>
      Array.isArray(c) && Math.abs(c[0]) <= 180 && Math.abs(c[1]) <= 90 && c[0] !== undefined && Math.abs(c[0]) > Math.abs(c[1])
        ? ([c[0], c[1]] as [number, number]) // đã là [lng,lat]
        : ([c[1], c[0]] as [number, number]), // [lat,lng] → [lng,lat]
    );

    // sign code → icon + mô tả tiếng Việt (theo Vietmap navigation symbol)
    // Sign code từ Vietmap (observed): 0=start, 2=right, -2=turn, 4=arrive
    const SIGN: Record<number, { icon: string; label: string }> = {
      0: { icon: '🚀', label: 'Xuất phát' },
      1: { icon: '⬆️', label: 'Đi thẳng' },
      2: { icon: '↗️', label: 'Rẽ phải' },
      3: { icon: '⤴️', label: 'Rẽ phải gấp' },
      4: { icon: '🏁', label: 'Đến nơi' },
      5: { icon: '↩️', label: 'Quay đầu' },
      '-1': { icon: '↗️', label: 'Rẽ nhẹ' },
      '-2': { icon: '↪️', label: 'Rẽ' },
    };
    const DEFAULT_SIGN = { icon: '➡️', label: 'Tiếp tục' };

const steps = p.instructions.map((i) => {
      const sign = i.sign ?? -999;
      const meta = SIGN[sign] ?? DEFAULT_SIGN;
      const street = i.street_name || '';
      let text = i.text?.trim() || '';
      if (!text) {
        text = street ? `${meta.label} vào ${street}` : meta.label;
      }
      // "Kết thúc!" / "Arrive" → icon arrival
      const isArrive = /kết thúc|đến nơi|arrive/i.test(text) || sign === 4;
      const isDepart = sign === 0 && !isArrive;
      return {
        text,
        streetName: street,
        sign,
        signIcon: isArrive ? '🏁' : isDepart ? '🚀' : meta.icon,
        signLabel: isArrive ? 'Đến nơi' : isDepart ? 'Xuất phát' : meta.label,
        distanceMeters: Math.round(i.distance),
        durationSeconds: Math.round((i.time ?? 0) / 1000),
        heading: i.heading ?? null,
        interval: i.interval ?? null,
      };
    });

    return {
      distanceMeters: p.distance,
      durationSeconds: Math.round(p.time / 1000),
      polyline,
      steps,
      tollCost: p.toll_cost ?? 0,
      tolls: (p.tolls ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        address: t.address,
        type: t.type,
        price: t.price,
      })),
    };
  }
}

export const locationService = new LocationService();
