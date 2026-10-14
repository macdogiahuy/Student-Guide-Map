import type { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from '../../lib/baseController.js';
import { asyncErrorWrapper } from '../../lib/asyncErrorWrapper.js';
import { adminService } from './admin.service.js';

const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export class AdminController extends BaseController {
  dashboard = asyncErrorWrapper(async (_req: Request, res: Response) => {
    try {
      this.success(res, await adminService.dashboard());
    } catch (e) {
      this.error(res, e, 'admin.dashboard');
    }
  });

  statistics = asyncErrorWrapper(async (_req: Request, res: Response) => {
    try {
      this.success(res, await adminService.statistics());
    } catch (e) {
      this.error(res, e, 'admin.statistics');
    }
  });

  listUsers = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const q = req.query as Record<string, string>;
      const parsed = pageQuery.parse(q);
      const data = await adminService.listUsers({
        role: q.role,
        q: q.q,
        status: q.status,
        page: parsed.page,
        limit: parsed.limit,
      });
      this.success(res, data);
    } catch (e) {
      this.error(res, e, 'admin.listUsers');
    }
  });

  updateUser = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const body = z
        .object({ status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']) })
        .parse(req.body);
      const data = await adminService.updateUser(req.params.id, body);
      this.success(res, data, 'Đã cập nhật tài khoản.');
    } catch (e) {
      this.error(res, e, 'admin.updateUser');
    }
  });

  listCategories = asyncErrorWrapper(async (_req: Request, res: Response) => {
    try {
      this.success(res, await adminService.listCategories(true));
    } catch (e) {
      this.error(res, e, 'admin.listCategories');
    }
  });

  createCategory = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const body = z
        .object({
          name: z.string().min(1).max(60),
          slug: z
            .string()
            .min(1)
            .max(60)
            .regex(/^[a-z0-9-]+$/, 'Slug chỉ gồm chữ thường, số và dấu gạch.'),
          icon: z.string().max(40).optional(),
          description: z.string().max(300).optional(),
          sortOrder: z.number().int().optional(),
        })
        .parse(req.body);
      const data = await adminService.createCategory(body);
      this.created(res, data, 'Đã tạo danh mục.');
    } catch (e) {
      this.error(res, e, 'admin.createCategory');
    }
  });

  updateCategory = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const body = z
        .object({
          name: z.string().min(1).max(60).optional(),
          slug: z.string().min(1).max(60).optional(),
          icon: z.string().max(40).optional(),
          description: z.string().max(300).nullable().optional(),
          sortOrder: z.number().int().optional(),
          isActive: z.boolean().optional(),
        })
        .parse(req.body);
      const data = await adminService.updateCategory(req.params.id, body);
      this.success(res, data, 'Đã cập nhật danh mục.');
    } catch (e) {
      this.error(res, e, 'admin.updateCategory');
    }
  });

  deleteCategory = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const data = await adminService.deleteCategory(req.params.id);
      this.success(res, data, 'Đã xóa danh mục.');
    } catch (e) {
      this.error(res, e, 'admin.deleteCategory');
    }
  });

  listLocations = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const q = req.query as Record<string, string>;
      const parsed = pageQuery.parse(q);
      const data = await adminService.listLocations({
        status: q.status,
        q: q.q,
        categoryId: q.categoryId,
        page: parsed.page,
        limit: parsed.limit,
      });
      this.success(res, data);
    } catch (e) {
      this.error(res, e, 'admin.listLocations');
    }
  });

  listPromotions = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const q = req.query as Record<string, string>;
      const parsed = pageQuery.parse(q);
      const data = await adminService.listPromotions({
        status: q.status,
        page: parsed.page,
        limit: parsed.limit,
      });
      this.success(res, data);
    } catch (e) {
      this.error(res, e, 'admin.listPromotions');
    }
  });

  listReviews = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const q = req.query as Record<string, string>;
      const parsed = pageQuery.parse(q);
      const data = await adminService.listReviews({
        status: q.status,
        q: q.q,
        page: parsed.page,
        limit: parsed.limit,
      });
      this.success(res, data);
    } catch (e) {
      this.error(res, e, 'admin.listReviews');
    }
  });
}

export const adminController = new AdminController();
