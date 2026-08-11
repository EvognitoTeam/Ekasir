import {
  and,
  eq,
  gte,
  isNull,
  lte,
  notInArray,
  or,
  sql,
} from 'drizzle-orm';

import { db } from '@/db';
import { coupon, materials, orders, products } from '@/db/schema';
import {
  requireMobileAuth,
  resolveMobileBranch,
} from '@/lib/mobile-api/auth';
import { mobileError, mobileSuccess } from '@/lib/mobile-api/response';

export async function GET(request: Request) {
  try {
    const auth = await requireMobileAuth(request);
    const { searchParams } = new URL(request.url);
    const branchId = resolveMobileBranch(auth, searchParams.get('branch_id'));
    const date = searchParams.get('date') === 'yesterday' ? 'yesterday' : 'today';

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86_400_000 - 1);
    const start = date === 'yesterday'
      ? new Date(todayStart.getTime() - 86_400_000)
      : todayStart;
    const end = date === 'yesterday'
      ? new Date(todayStart.getTime() - 1)
      : todayEnd;

    const orderScope = [
      eq(orders.mitra_id, auth.mitraId),
      branchId ? eq(orders.branch_id, branchId) : isNull(orders.branch_id),
      isNull(orders.deletedAt),
    ];
    const productScope = [
      eq(products.mitra_id, auth.mitraId),
      branchId ? eq(products.branch_id, branchId) : isNull(products.branch_id),
      isNull(products.deletedAt),
    ];
    const materialScope = [
      eq(materials.mitra_id, auth.mitraId),
      branchId ? eq(materials.branch_id, branchId) : isNull(materials.branch_id),
    ];

    const [target, active, depleted, lowStock, promo] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(and(...orderScope, gte(orders.createdAt, start), lte(orders.createdAt, end))),
      db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(and(...orderScope, notInArray(orders.status, ['completed', 'cancelled']))),
      db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(and(...productScope, or(eq(products.status, 0), lte(products.stock, 0)))),
      db
        .select({ count: sql<number>`count(*)` })
        .from(materials)
        .where(and(...materialScope, sql`${materials.stock} <= ${materials.low_stock_threshold}`)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(coupon)
        .where(
          and(
            eq(coupon.mitra_id, auth.mitraId),
            isNull(coupon.deletedAt),
            or(isNull(coupon.expired_date), gte(coupon.expired_date, now)),
          ),
        ),
    ]);

    return mobileSuccess({
      date,
      orders: Number(target[0]?.count ?? 0),
      activeOrders: Number(active[0]?.count ?? 0),
      depletedProducts: Number(depleted[0]?.count ?? 0),
      lowStockMaterials: Number(lowStock[0]?.count ?? 0),
      activePromos: Number(promo[0]?.count ?? 0),
    });
  } catch (error) {
    console.error('GET mobile dashboard error:', error);
    return mobileError('DASHBOARD_FETCH_FAILED', 'Gagal memuat dashboard.', 500);
  }
}
