import { Router } from 'express';
import { reportController } from './report.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { writeLimiter } from '../../middleware/rateLimit.js';
import { createReportSchema, processReportSchema } from './report.schema.js';

export const reportRoutes = Router();

reportRoutes.post('/', requireAuth, requireRole('STUDENT', 'ADMIN'), writeLimiter, validate(createReportSchema), reportController.create);
reportRoutes.get('/mine', requireAuth, reportController.mine);
reportRoutes.get('/', requireAuth, requireRole('ADMIN'), reportController.list);
reportRoutes.patch('/:id/process', requireAuth, requireRole('ADMIN'), validate(processReportSchema), reportController.process);
