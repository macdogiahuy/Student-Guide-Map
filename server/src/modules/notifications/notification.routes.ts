import { Router } from 'express';
import { notificationController } from './notification.controller.js';
import { requireAuth } from '../../middleware/auth.js';

export const notificationRoutes = Router();
notificationRoutes.get('/', requireAuth, notificationController.list);
notificationRoutes.post('/read-all', requireAuth, notificationController.markAllRead);
notificationRoutes.patch('/:id/read', requireAuth, notificationController.markRead);
