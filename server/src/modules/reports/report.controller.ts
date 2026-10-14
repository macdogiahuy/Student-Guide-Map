import type { Request, Response } from 'express';
import { BaseController } from '../../lib/baseController.js';
import { asyncErrorWrapper } from '../../lib/asyncErrorWrapper.js';
import { reportService } from './report.service.js';
import type { createReportSchema, processReportSchema } from './report.schema.js';
import type { z } from 'zod';

export class ReportController extends BaseController {
  create = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const data = await reportService.create(req.user!, req.body as z.infer<typeof createReportSchema>);
      this.created(res, data, 'Đã gửi báo cáo. Quản trị viên sẽ kiểm tra và xử lý.');
    } catch (e) {
      this.error(res, e, 'reports.create');
    }
  });

  mine = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const page = Number((req.query as Record<string, string>).page ?? 1) || 1;
      const limit = Number((req.query as Record<string, string>).limit ?? 10) || 10;
      const data = await reportService.mine(req.user!, page, limit);
      this.success(res, data);
    } catch (e) {
      this.error(res, e, 'reports.mine');
    }
  });

  list = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const q = req.query as Record<string, string>;
      const data = await reportService.list(
        q.status,
        Number(q.page ?? 1) || 1,
        Number(q.limit ?? 20) || 20,
      );
      this.success(res, data);
    } catch (e) {
      this.error(res, e, 'reports.list');
    }
  });

  process = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const data = await reportService.process(req.user!, req.params.id, req.body as z.infer<typeof processReportSchema>);
      this.success(res, data, 'Đã cập nhật báo cáo.');
    } catch (e) {
      this.error(res, e, 'reports.process');
    }
  });
}

export const reportController = new ReportController();
