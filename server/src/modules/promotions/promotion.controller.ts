import type { Request, Response } from 'express';
import { BaseController } from '../../lib/baseController.js';
import { asyncErrorWrapper } from '../../lib/asyncErrorWrapper.js';
import { promotionService } from './promotion.service.js';
import type { createPromotionSchema, publicPromotionQuery, updatePromotionSchema } from './promotion.schema.js';
import type { z } from 'zod';

export class PromotionController extends BaseController {
  listPublic = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const q = req.query as unknown as z.infer<typeof publicPromotionQuery>;
      const data = await promotionService.listPublic(q);
      this.success(res, data);
    } catch (e) {
      this.error(res, e, 'promotions.listPublic');
    }
  });

  getPublic = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const data = await promotionService.getPublic(req.params.id);
      this.success(res, data);
    } catch (e) {
      this.error(res, e, 'promotions.getPublic');
    }
  });

  listMine = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const data = await promotionService.listForOwner(req.user!);
      this.success(res, data);
    } catch (e) {
      this.error(res, e, 'promotions.listMine');
    }
  });

  createStore = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const data = await promotionService.createStore(req.user!, req.body as z.infer<typeof createPromotionSchema>);
      this.created(res, data, 'Ưu đãi đã được gửi và đang chờ duyệt.');
    } catch (e) {
      this.error(res, e, 'promotions.createStore');
    }
  });

  updateStore = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const data = await promotionService.updateStore(req.user!, req.params.id, req.body as z.infer<typeof updatePromotionSchema>);
      this.success(res, data, 'Đã cập nhật ưu đãi.');
    } catch (e) {
      this.error(res, e, 'promotions.updateStore');
    }
  });

  removeStore = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const data = await promotionService.removeStore(req.user!, req.params.id);
      this.success(res, data, 'Đã xóa ưu đãi.');
    } catch (e) {
      this.error(res, e, 'promotions.removeStore');
    }
  });

  decide = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const { decision, reason } = req.body as { decision: 'ACTIVE' | 'REJECTED'; reason?: string };
      const data = await promotionService.decide(req.user!, req.params.id, decision, reason);
      this.success(res, data, decision === 'ACTIVE' ? 'Đã duyệt ưu đãi.' : 'Đã từ chối ưu đãi.');
    } catch (e) {
      this.error(res, e, 'promotions.decide');
    }
  });
}

export const promotionController = new PromotionController();
