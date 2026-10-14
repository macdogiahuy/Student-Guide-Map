import type { Request, Response } from 'express';
import { BaseController } from '../../lib/baseController.js';
import { asyncErrorWrapper } from '../../lib/asyncErrorWrapper.js';
import { reviewService } from './review.service.js';
import type { reviewListQuery } from './review.schema.js';
import type { z } from 'zod';

export class ReviewController extends BaseController {
  list = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const q = req.query as unknown as z.infer<typeof reviewListQuery>;
      const data = await reviewService.list({
        locationId: q.locationId,
        page: q.page,
        limit: q.limit,
        sort: q.sort,
      });
      this.success(res, data);
    } catch (e) {
      this.error(res, e, 'reviews.list');
    }
  });

  mine = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const page = Number((req.query as Record<string, string>).page ?? 1) || 1;
      const limit = Number((req.query as Record<string, string>).limit ?? 10) || 10;
      const data = await reviewService.mine(req.user!.id, page, limit);
      this.success(res, data);
    } catch (e) {
      this.error(res, e, 'reviews.mine');
    }
  });

  create = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const review = await reviewService.create(req.user!, req.body);
      this.created(res, review, 'Đã gửi đánh giá của bạn.');
    } catch (e) {
      this.error(res, e, 'reviews.create');
    }
  });

  update = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const review = await reviewService.update(req.user!, req.params.id, req.body);
      this.success(res, review, 'Đã cập nhật đánh giá.');
    } catch (e) {
      this.error(res, e, 'reviews.update');
    }
  });

  remove = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const data = await reviewService.remove(req.user!, req.params.id);
      this.success(res, data, 'Đã xóa đánh giá.');
    } catch (e) {
      this.error(res, e, 'reviews.remove');
    }
  });

  moderate = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const { status } = req.body as { status: 'DISPLAYED' | 'HIDDEN' | 'DELETED' };
      const data = await reviewService.moderate(req.user!, req.params.id, status);
      this.success(res, data, 'Đã cập nhật trạng thái đánh giá.');
    } catch (e) {
      this.error(res, e, 'reviews.moderate');
    }
  });

  reply = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const data = await reviewService.reply(req.user!, req.params.id, req.body.content);
      this.created(res, data, 'Đã gửi phản hồi.');
    } catch (e) {
      this.error(res, e, 'reviews.reply');
    }
  });

  updateReply = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const data = await reviewService.updateReply(req.user!, req.params.id, req.body.content);
      this.success(res, data, 'Đã cập nhật phản hồi.');
    } catch (e) {
      this.error(res, e, 'reviews.updateReply');
    }
  });

  deleteReply = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const data = await reviewService.deleteReply(req.user!, req.params.id);
      this.success(res, data, 'Đã xóa phản hồi.');
    } catch (e) {
      this.error(res, e, 'reviews.deleteReply');
    }
  });
}

export const reviewController = new ReviewController();
