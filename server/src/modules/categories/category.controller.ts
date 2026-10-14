import type { Request, Response } from 'express';
import { BaseController } from '../../lib/baseController.js';
import { asyncErrorWrapper } from '../../lib/asyncErrorWrapper.js';
import { prisma } from '../../lib/prisma.js';

export class CategoryController extends BaseController {
  list = asyncErrorWrapper(async (_req: Request, res: Response) => {
    try {
      const items = await prisma.category.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: { _count: { select: { locations: { where: { status: 'APPROVED' } } } } },
      });
      this.success(
        res,
        items.map((c) => ({ ...c, locationCount: c._count.locations, _count: undefined })),
      );
    } catch (e) {
      this.error(res, e, 'categories.list');
    }
  });
}

export const categoryController = new CategoryController();
