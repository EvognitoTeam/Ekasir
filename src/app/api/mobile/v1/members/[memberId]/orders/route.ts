import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { db } from '@/db';
import { branches, orders, users } from '@/db/schema';
import { requireMobileAuth } from '@/lib/mobile-api/auth';
import { mobileError, mobileSuccess } from '@/lib/mobile-api/response';

type RouteContext = {
  params: Promise<{ memberId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await requireMobileAuth(request);
    const { memberId: rawMemberId } = await context.params;
    const memberId = decodeURIComponent(rawMemberId).trim().toUpperCase();
    const { searchParams } = new URL(request.url);
    const page = Math.max(Number(searchParams.get('page') ?? 1), 1);
    const limit = Math.min(
      Math.max(Number(searchParams.get('limit') ?? 20), 1),
      100,
    );
    const offset = (page - 1) * limit;

    const memberRows = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.memberId, memberId),
          eq(users.mitra_id, auth.mitraId),
          eq(users.role, 'User'),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    const member = memberRows[0];
    if (!member) {
      return mobileError('MEMBER_NOT_FOUND', 'Member tidak ditemukan.', 404);
    }

    const conditions = and(
      eq(orders.user_id, member.id),
      eq(orders.mitra_id, auth.mitraId),
      isNull(orders.deletedAt),
    );

    const [rows, countRows] = await Promise.all([
      db
        .select({
          id: orders.id,
          orderCode: orders.order_code,
          status: orders.status,
          branchId: orders.branch_id,
          branchName: branches.name,
          paymentMethod: orders.payment_method,
          paymentStatus: orders.payment_status,
          subtotal: orders.total_price,
          discount: orders.discount,
          service: orders.service,
          tax: orders.tax,
          total: orders.totalAfterDiscount,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .leftJoin(branches, eq(orders.branch_id, branches.id))
        .where(conditions)
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`COUNT(${orders.id})` })
        .from(orders)
        .where(conditions),
    ]);

    const total = Number(countRows[0]?.count ?? 0);

    return mobileSuccess(rows, {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET mobile member orders error:', error);
    return mobileError(
      'MEMBER_ORDERS_FETCH_FAILED',
      'Gagal mengambil riwayat transaksi member.',
      500,
    );
  }
}
