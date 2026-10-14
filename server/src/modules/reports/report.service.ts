import type { AuthUser } from '../../types/index.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import type { createReportSchema, processReportSchema } from './report.schema.js';
import type { z } from 'zod';

type CreateInput = z.infer<typeof createReportSchema>;
type ProcessInput = z.infer<typeof processReportSchema>;

const REPORT_LABEL: Record<string, string> = {
  WRONG_ADDRESS: 'Sai địa chỉ',
  WRONG_PRICE: 'Sai giá',
  WRONG_HOURS: 'Sai giờ mở cửa',
  CLOSED: 'Địa điểm đã đóng cửa',
  OTHER: 'Thông tin khác sai',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'chờ xử lý',
  IN_PROGRESS: 'đang xử lý',
  RESOLVED: 'đã giải quyết',
  REJECTED: 'bị từ chối',
};

/** Báo cáo kiểu "thông tin shop sai" — cần báo chủ shop khi admin xử lý. */
const SHOP_INFO_TYPES = new Set([
  'WRONG_ADDRESS',
  'WRONG_PRICE',
  'WRONG_HOURS',
  'CLOSED',
  'OTHER',
]);

export class ReportService {
  async create(actor: AuthUser, input: CreateInput) {
    const location = await prisma.location.findUnique({ where: { id: input.locationId } });
    if (!location) throw AppError.notFound('Không tìm thấy địa điểm.');
    const openDuplicate = await prisma.report.findFirst({
      where: {
        reporterId: actor.id,
        locationId: input.locationId,
        type: input.type,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    });
    if (openDuplicate) {
      throw AppError.conflict('Bạn đã gửi báo cáo tương tự cho địa điểm này. Admin đang xử lý.');
    }
    const recent = await prisma.report.count({
      where: { reporterId: actor.id, createdAt: { gte: new Date(Date.now() - 10 * 60_000) } },
    });
    if (recent >= 5) throw AppError.tooMany('Bạn đang gửi báo cáo quá nhanh. Vui lòng thử lại sau.');

    return prisma.report.create({
      data: {
        locationId: input.locationId,
        reporterId: actor.id,
        type: input.type,
        content: input.content ?? null,
      },
      include: { location: { select: { id: true, name: true } } },
    });
  }

  async mine(actor: AuthUser, page: number, limit: number) {
    const where = { reporterId: actor.id };
    const [items, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { location: { select: { id: true, name: true, address: true } } },
      }),
      prisma.report.count({ where }),
    ]);
    return {
      items: items.map((r) => ({ ...r, typeLabel: REPORT_LABEL[r.type] })),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async list(status?: string, page = 1, limit = 20) {
    const where = status ? { status: status as never } : {};
    const [items, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          location: { select: { id: true, name: true, address: true, phone: true } },
          reporter: { select: { id: true, fullName: true, email: true } },
          processedBy: { select: { id: true, fullName: true } },
        },
      }),
      prisma.report.count({ where }),
    ]);
    return {
      items: items.map((r) => ({ ...r, typeLabel: REPORT_LABEL[r.type] })),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async process(actor: AuthUser, id: string, input: ProcessInput) {
    if (actor.role !== 'ADMIN') throw AppError.forbidden('Chỉ quản trị viên mới được xử lý báo cáo.');
    const report = await prisma.report.findUnique({
      where: { id },
      include: { location: { select: { id: true, name: true, ownerId: true } } },
    });
    if (!report) throw AppError.notFound('Không tìm thấy báo cáo.');
    const updated = await prisma.report.update({
      where: { id },
      data: {
        status: input.status,
        adminNote: input.adminNote ?? report.adminNote,
        processedById: actor.id,
        processedAt: new Date(),
      },
      include: { location: { select: { id: true, name: true } } },
    });

    const statusText = STATUS_LABEL[input.status] ?? input.status;
    const typeLabel = REPORT_LABEL[report.type] ?? report.type;
    const noteSuffix = input.adminNote ? ` Ghi chú admin: ${input.adminNote}` : '';

    // 1) Notify reporter
    await prisma.notification.create({
      data: {
        userId: report.reporterId,
        type: 'REPORT_UPDATE',
        title: `Báo cáo của bạn đã được ${statusText}`,
        body: `Báo cáo "${typeLabel}" tại "${updated.location.name}" đã được admin ${statusText}.${noteSuffix}`,
        link: '/me/reports',
      },
    });

    // 2) Notify shop owner — báo cáo sai thông tin shop → chủ shop cần biết
    if (SHOP_INFO_TYPES.has(report.type) && report.location.ownerId !== report.reporterId) {
      const ownerNote =
        input.status === 'RESOLVED'
          ? 'Admin đã xử lý — vui lòng kiểm tra và cập nhật thông tin nếu cần.'
          : input.status === 'REJECTED'
            ? 'Admin đã từ chối báo cáo này.'
            : 'Admin đang xem xét.';
      await prisma.notification.create({
        data: {
          userId: report.location.ownerId,
          type: 'REPORT_UPDATE',
          title: `Có báo cáo về "${updated.location.name}" — ${statusText}`,
          body: `Người dùng báo cáo "${typeLabel}"${report.content ? `: ${report.content}` : ''}. ${ownerNote}${noteSuffix}`,
          link: `/store`,
        },
      });
    }

    return updated;
  }
}

export const reportService = new ReportService();
