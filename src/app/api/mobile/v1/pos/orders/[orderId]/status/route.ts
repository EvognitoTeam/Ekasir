import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/db';
import { orders } from '@/db/schema';
import {
  requireMobileAuth,
  resolveMobileBranch,
} from '@/lib/mobile-api/auth';
import { mobileError, mobileSuccess } from '@/lib/mobile-api/response';

const STATUS_FLOW = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled',
] as const;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  try {
    const auth = await requireMobileAuth(request);
    const { orderId: rawOrderId } = await context.params;
    const orderId = Number(rawOrderId);
    const body = await request.json();
    const status = String(body.status ?? '') as typeof STATUS_FLOW[number];
    const branchId = resolveMobileBranch(auth, body.branchId);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return mobileError('ORDER_ID_INVALID', 'ID pesanan tidak valid.', 422);
    }
    if (!STATUS_FLOW.includes(status)) {
      return mobileError('STATUS_INVALID', 'Status pesanan tidak valid.', 422);
    }

    const update: Partial<typeof orders.$inferInsert> = {
      status,
      updatedAt: new Date(),
    };
    if (status === 'confirmed') update.confirmedAt = new Date();
    if (status === 'preparing') update.preparingAt = new Date();
    if (status === 'ready') update.readyAt = new Date();

    const result = await db
      .update(orders)
      .set(update)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.mitra_id, auth.mitraId),
          branchId ? eq(orders.branch_id, branchId) : isNull(orders.branch_id),
          isNull(orders.deletedAt),
        ),
      );

    return mobileSuccess(
      { orderId, status, affectedRows: result[0].affectedRows },
      { message: 'Status pesanan berhasil diperbarui.' },
    );
  } catch (error) {
    console.error('PATCH mobile order status error:', error);
    return mobileError('ORDER_STATUS_UPDATE_FAILED', 'Gagal memperbarui status.', 500);
  }
}
