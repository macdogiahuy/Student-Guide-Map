import type { Request, Response } from 'express';
import { BaseController } from '../../lib/baseController.js';
import { asyncErrorWrapper } from '../../lib/asyncErrorWrapper.js';
import { storeService } from './store.service.js';
import type { correctionRequestSchema, processCorrectionSchema } from './store.schema.js';
import type { z } from 'zod';

export class StoreController extends BaseController {
  dashboard = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      this.success(res, await storeService.dashboard(req.user!));
    } catch (e) {
      this.error(res, e, 'store.dashboard');
    }
  });

  locations = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      this.success(res, await storeService.myLocations(req.user!));
    } catch (e) {
      this.error(res, e, 'store.locations');
    }
  });

  reviews = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const page = Number((req.query as Record<string, string>).page ?? 1) || 1;
      const limit = Number((req.query as Record<string, string>).limit ?? 10) || 10;
      this.success(res, await storeService.myReviews(req.user!, page, limit));
    } catch (e) {
      this.error(res, e, 'store.reviews');
    }
  });

  createCorrection = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const data = await storeService.createCorrection(req.user!, req.body as z.infer<typeof correctionRequestSchema>);
      this.created(res, data, 'Đã gửi yêu cầu chỉnh sửa.');
    } catch (e) {
      this.error(res, e, 'store.createCorrection');
    }
  });

  corrections = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      this.success(res, await storeService.myCorrections(req.user!));
    } catch (e) {
      this.error(res, e, 'store.corrections');
    }
  });

  processCorrection = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const data = await storeService.processCorrection(req.user!, req.params.id, req.body as z.infer<typeof processCorrectionSchema>);
      this.success(res, data, 'Đã cập nhật yêu cầu.');
    } catch (e) {
      this.error(res, e, 'store.processCorrection');
    }
  });
}

export const storeController = new StoreController();
