import { z } from 'zod';

export const createReviewSchema = z.object({
  locationId: z.string().min(1),
  rating: z.coerce.number().int().min(1, 'Chọn số sao từ 1 đến 5.').max(5),
  comment: z.string().max(500, 'Nhận xét tối đa 500 ký tự.').optional().nullable(),
});

export const updateReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  comment: z.string().max(500).nullable().optional(),
});

export const replySchema = z.object({
  content: z.string().min(1, 'Vui lòng nhập nội dung phản hồi.').max(500),
});

export const reviewListQuery = z.object({
  locationId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sort: z.enum(['newest', 'rating']).default('newest'),
});
