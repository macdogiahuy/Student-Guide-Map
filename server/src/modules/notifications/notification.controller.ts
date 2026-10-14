import type { Request, Response } from 'express';
import { BaseController } from '../../lib/baseController.js';
import { asyncErrorWrapper } from '../../lib/asyncErrorWrapper.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';

export class NotificationController extends BaseController {
  list = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const page = Number((req.query as Record<string, string>).page ?? 1) || 1;
      const limit = Number((req.query as Record<string, string>).limit ?? 20) || 20;
      const where = { userId: req.user!.id };
      const [items, total, unread] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({ where: { userId: req.user!.id, readAt: null } }),
      ]);
      this.success(res, {
        items,
        unread,
        meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      });
    } catch (e) {
      this.error(res, e, 'notifications.list');
    }
  });

  markRead = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const n = await prisma.notification.findUnique({ where: { id: req.params.id } });
      if (!n || n.userId !== req.user!.id) throw AppError.notFound('Không tìm thấy thông báo.');
      const updated = await prisma.notification.update({
        where: { id: n.id },
        data: { readAt: new Date() },
      });
      this.success(res, updated);
    } catch (e) {
      this.error(res, e, 'notifications.markRead');
    }
  });

  markAllRead = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      await prisma.notification.updateMany({
        where: { userId: req.user!.id, readAt: null },
        data: { readAt: new Date() },
      });
      this.success(res, null, 'Đã đánh dấu tất cả là đã đọc.');
    } catch (e) {
      this.error(res, e, 'notifications.markAllRead');
    }
  });
}

export const notificationController = new NotificationController();
