import type { AuthUser } from '../../types/index.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { reviewRepository } from './review.repository.js';
import type { createReviewSchema, updateReviewSchema } from './review.schema.js';
import type { z } from 'zod';

type CreateInput = z.infer<typeof createReviewSchema>;
type UpdateInput = z.infer<typeof updateReviewSchema>;

export class ReviewService {
  async list(params: { locationId?: string; page: number; limit: number; sort: 'newest' | 'rating' }) {
    const [items, total] = await reviewRepository.list(params);
    return {
      items,
      meta: { page: params.page, limit: params.limit, total, totalPages: Math.max(1, Math.ceil(total / params.limit)) },
    };
  }

  async mine(userId: string, page: number, limit: number) {
    const [items, total] = await reviewRepository.list({ userId, page, limit, sort: 'newest' });
    return {
      items,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async create(actor: AuthUser, input: CreateInput) {
    const location = await prisma.location.findUnique({ where: { id: input.locationId } });
    if (!location || location.status !== 'APPROVED') {
      throw AppError.notFound('Không tìm thấy địa điểm.');
    }
    if (location.ownerId === actor.id) {
      throw AppError.badRequest('Bạn không thể đánh giá địa điểm của chính mình.');
    }
    const existing = await reviewRepository.findForUser(actor.id, input.locationId);
    if (existing) {
      throw AppError.conflict('Bạn đã đánh giá địa điểm này. Hãy chỉnh sửa đánh giá hiện có.');
    }
    // basic anti-spam: max 5 reviews / 10 minutes
    const recent = await reviewRepository.countRecent(actor.id, new Date(Date.now() - 10 * 60_000));
    if (recent >= 5) {
      throw AppError.tooMany('Bạn đang gửi đánh giá quá nhanh. Vui lòng thử lại sau ít phút.');
    }
    const review = await reviewRepository.create({
      location: { connect: { id: input.locationId } },
      user: { connect: { id: actor.id } },
      rating: input.rating,
      comment: input.comment ?? null,
    });
    await reviewRepository.recomputeLocationRating(input.locationId);
    return review;
  }

  async update(actor: AuthUser, id: string, input: UpdateInput) {
    const review = await reviewRepository.findById(id);
    if (!review) throw AppError.notFound('Không tìm thấy đánh giá.');
    if (review.userId !== actor.id && actor.role !== 'ADMIN') {
      throw AppError.forbidden('Bạn chỉ có thể chỉnh sửa đánh giá của mình.');
    }
    if (review.status === 'DELETED') throw AppError.badRequest('Đánh giá đã bị xóa.');
    const updated = await reviewRepository.update(id, {
      rating: input.rating ?? undefined,
      comment: input.comment === undefined ? undefined : input.comment,
    });
    await reviewRepository.recomputeLocationRating(review.locationId);
    return updated;
  }

  async remove(actor: AuthUser, id: string) {
    const review = await reviewRepository.findById(id);
    if (!review) throw AppError.notFound('Không tìm thấy đánh giá.');
    if (review.userId !== actor.id && actor.role !== 'ADMIN') {
      throw AppError.forbidden('Bạn chỉ có thể xóa đánh giá của mình.');
    }
    if (actor.role === 'ADMIN' && review.userId !== actor.id) {
      // admin moderation → soft delete, keep history
      const updated = await reviewRepository.update(id, { status: 'DELETED' });
      await reviewRepository.recomputeLocationRating(review.locationId);
      return updated;
    }
    const deleted = await reviewRepository.delete(id);
    await reviewRepository.recomputeLocationRating(review.locationId);
    return deleted;
  }

  async moderate(actor: AuthUser, id: string, status: 'DISPLAYED' | 'HIDDEN' | 'DELETED') {
    if (actor.role !== 'ADMIN') throw AppError.forbidden('Chỉ quản trị viên mới được kiểm duyệt.');
    const review = await reviewRepository.findById(id);
    if (!review) throw AppError.notFound('Không tìm thấy đánh giá.');
    const updated = await reviewRepository.update(id, { status });
    await reviewRepository.recomputeLocationRating(review.locationId);
    return updated;
  }

  private async assertCanReply(actor: AuthUser, reviewId: string) {
    const review = await reviewRepository.findById(reviewId);
    if (!review || review.status === 'DELETED') {
      throw AppError.notFound('Không tìm thấy đánh giá.');
    }
    if (review.status !== 'DISPLAYED') {
      throw AppError.badRequest('Không thể phản hồi đánh giá đã bị ẩn.');
    }
    const location = await prisma.location.findUnique({ where: { id: review.locationId } });
    if (!location) throw AppError.notFound('Không tìm thấy địa điểm.');
    if (actor.role !== 'ADMIN' && location.ownerId !== actor.id) {
      throw AppError.forbidden('Bạn chỉ có thể phản hồi đánh giá của cửa hàng mình.');
    }
    return { review, location };
  }

  async reply(actor: AuthUser, reviewId: string, content: string) {
    const { review, location } = await this.assertCanReply(actor, reviewId);
    const existing = await prisma.reviewReply.findUnique({ where: { reviewId } });
    if (existing) throw AppError.conflict('Đánh giá này đã có phản hồi. Hãy chỉnh sửa.');
    const reply = await prisma.reviewReply.create({
      data: { reviewId: review.id, ownerId: actor.id, content },
      include: { owner: { select: { id: true, fullName: true, storeName: true } } },
    });
    await prisma.notification.create({
      data: {
        userId: review.userId,
        type: 'REVIEW_REPLY',
        title: `Cửa hàng "${location.name}" đã phản hồi đánh giá của bạn`,
        body: content.slice(0, 160),
        link: `/locations/${location.id}`,
      },
    });
    return reply;
  }

  async updateReply(actor: AuthUser, reviewId: string, content: string) {
    const { review } = await this.assertCanReply(actor, reviewId);
    const existing = await prisma.reviewReply.findUnique({ where: { reviewId: review.id } });
    if (!existing) throw AppError.notFound('Chưa có phản hồi.');
    if (existing.ownerId !== actor.id && actor.role !== 'ADMIN') {
      throw AppError.forbidden('Bạn không có quyền sửa phản hồi này.');
    }
    return prisma.reviewReply.update({ where: { id: existing.id }, data: { content } });
  }

  async deleteReply(actor: AuthUser, reviewId: string) {
    const { review } = await this.assertCanReply(actor, reviewId);
    const existing = await prisma.reviewReply.findUnique({ where: { reviewId: review.id } });
    if (!existing) throw AppError.notFound('Chưa có phản hồi.');
    if (existing.ownerId !== actor.id && actor.role !== 'ADMIN') {
      throw AppError.forbidden('Bạn không có quyền xóa phản hồi này.');
    }
    await prisma.reviewReply.delete({ where: { id: existing.id } });
    return { id: existing.id };
  }
}

export const reviewService = new ReviewService();
