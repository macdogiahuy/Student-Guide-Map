import { z } from 'zod';

export const createPromotionSchema = z.object({
  locationId: z.string().min(1),
  title: z.string().min(3, 'Tiêu đề phải có ít nhất 3 ký tự.').max(120),
  content: z.string().min(3, 'Nội dung quá ngắn.').max(1000),
  discountLabel: z.string().max(60).optional().nullable(),
  conditions: z.string().max(500).optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const updatePromotionSchema = createPromotionSchema.partial().omit({ locationId: true });

export const publicPromotionQuery = z.object({
  category: z.string().max(60).optional(),
  locationId: z.string().optional(),
  q: z.string().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const decidePromotionSchema = z.object({
  decision: z.enum(['ACTIVE', 'REJECTED']),
  reason: z.string().max(300).optional(),
});
