import { z } from 'zod';

export const createReportSchema = z.object({
  locationId: z.string().min(1),
  type: z.enum(['WRONG_ADDRESS', 'WRONG_PRICE', 'WRONG_HOURS', 'CLOSED', 'OTHER']),
  content: z.string().max(500).optional().nullable(),
});

export const processReportSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED']),
  adminNote: z.string().max(500).optional().nullable(),
});
