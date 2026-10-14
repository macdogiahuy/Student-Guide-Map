import { z } from 'zod';

export const correctionRequestSchema = z.object({
  locationId: z.string().min(1),
  field: z.string().max(40).optional().nullable(),
  description: z.string().min(5, 'Mô tả phải có ít nhất 5 ký tự.').max(500),
});

export const processCorrectionSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED']),
  adminNote: z.string().max(500).optional().nullable(),
});
