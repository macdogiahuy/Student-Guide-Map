import { z } from 'zod';

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ phải dạng HH:mm.');
const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);

export const searchQuerySchema = z.object({
  q: z.string().max(120).optional(),
  category: z.string().max(60).optional(), // slug or id
  priceLevel: z.coerce.number().int().min(1).max(3).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  open: z.enum(['true', 'false']).optional(),
  hasPromotion: z.enum(['true', 'false']).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(0.1).max(50).optional(),
  bbox: z
    .string()
    .regex(/^-?\d+(\.\d+)?(,-?\d+(\.\d+)?){3}$/, 'bbox=swLat,neLat,swLng,neLng')
    .optional(),
  sort: z.enum(['nearest', 'rating', 'price', 'newest']).default('rating'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const createLocationSchema = z.object({
  name: z.string().min(2, 'Tên địa điểm phải có ít nhất 2 ký tự.').max(120),
  description: z.string().max(2000).optional().nullable(),
  address: z.string().min(5, 'Địa chỉ quá ngắn.').max(300),
  lat,
  lng,
  phone: z
    .string()
    .regex(/^[0-9+()\-\s]{6,20}$/, 'Số điện thoại không hợp lệ.')
    .optional()
    .nullable(),
  categoryId: z.string().min(1),
  priceLevel: z.coerce.number().int().min(1).max(3).default(1),
  priceRange: z.string().max(60).optional().nullable(),
  ownerId: z.string().optional(), // admin only; ignored for owner
});

export const updateLocationSchema = createLocationSchema.partial().extend({
  activeStatus: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const hoursSchema = z.object({
  hours: z
    .array(
      z.object({
        day: z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']),
        openTime: hhmm.default('08:00'),
        closeTime: hhmm.default('22:00'),
        isClosed: z.boolean().default(false),
      }),
    )
    .min(1)
    .max(7),
});

export const priceReferenceSchema = z.object({
  itemName: z.string().min(1).max(80),
  price: z.coerce.number().int().min(0).max(100_000_000),
});

export const locationIdParam = z.object({ id: z.string().min(1) });
