import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { and, asc, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';

import { db } from '@/db';
import { branches, orderItems, orders, products } from '@/db/schema';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026',
);

type SessionPayload = {
  mitraId?: number | string;
  branchId?: number | string | null;
  role?: string;
};

type Granularity = 'year' | 'month' | 'day';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ekasir_session')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

function getRange(granularity: Granularity, year: number, month: number) {
  if (granularity === 'year') {
    return {
      start: new Date(year - 4, 0, 1, 0, 0, 0),
      end: new Date(year, 11, 31, 23, 59, 59),
      format: '%Y',
    };
  }

  if (granularity === 'month') {
    return {
      start: new Date(year, 0, 1, 0, 0, 0),
      end: new Date(year, 11, 31, 23, 59, 59),
      format: '%Y-%m',
    };
  }

  return {
    start: new Date(year, month - 1, 1, 0, 0, 0),
    end: new Date(year, month, 0, 23, 59, 59),
    format: '%Y-%m-%d',
  };
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const mitraId = Number(session.mitraId);
    if (!Number.isInteger(mitraId) || mitraId <= 0) {
      return NextResponse.json({ success: false, message: 'Mitra tidak valid' }, { status: 403 });
    }

    const role = String(session.role || '').toLowerCase();
    const sessionBranchId = session.branchId == null ? null : Number(session.branchId);
    const { searchParams } = new URL(request.url);
    const granularity = (searchParams.get('granularity') || 'month') as Granularity;
    const current = new Date();
    const year = Number(searchParams.get('year') || current.getFullYear());
    const month = Number(searchParams.get('month') || current.getMonth() + 1);
    const requestedBranch = searchParams.get('branch') || 'all';

    let branchScope: 'all' | 'main' | number = 'all';
    if (role !== 'owner') {
      branchScope = sessionBranchId == null ? 'main' : sessionBranchId;
    } else if (requestedBranch === 'main') {
      branchScope = 'main';
    } else if (requestedBranch !== 'all') {
      const parsed = Number(requestedBranch);
      if (Number.isInteger(parsed) && parsed > 0) branchScope = parsed;
    }

    const { start, end, format } = getRange(granularity, year, month);
    const branchCondition = branchScope === 'all'
      ? undefined
      : branchScope === 'main'
        ? isNull(orders.branch_id)
        : eq(orders.branch_id, branchScope);

    const baseConditions = [
      eq(orders.mitra_id, mitraId),
      eq(orders.status, 'completed'),
      isNull(orders.deletedAt),
      gte(orders.createdAt, start),
      lte(orders.createdAt, end),
      ...(branchCondition ? [branchCondition] : []),
    ];

    const [branchRows, summaryRows, trendRows, topProducts, recentSales] = await Promise.all([
      db.select({ id: branches.id, name: branches.name, slug: branches.branch_slug })
        .from(branches)
        .where(and(eq(branches.mitra_id, mitraId), isNull(branches.deletedAt)))
        .orderBy(asc(branches.name)),

      db.select({
        revenue: sql<string>`COALESCE(SUM(COALESCE(${orders.totalAfterDiscount}, ${orders.total_price}, 0)), 0)`,
        orders: sql<number>`COUNT(${orders.id})`,
        averageOrder: sql<string>`COALESCE(AVG(COALESCE(${orders.totalAfterDiscount}, ${orders.total_price}, 0)), 0)`,
        discount: sql<string>`COALESCE(SUM(${orders.discount}), 0)`,
        tax: sql<string>`COALESCE(SUM(${orders.tax}), 0)`,
        service: sql<string>`COALESCE(SUM(${orders.service}), 0)`,
      }).from(orders).where(and(...baseConditions)),

      db.select({
        period: sql<string>`DATE_FORMAT(${orders.createdAt}, ${format})`,
        revenue: sql<string>`COALESCE(SUM(COALESCE(${orders.totalAfterDiscount}, ${orders.total_price}, 0)), 0)`,
        orders: sql<number>`COUNT(${orders.id})`,
      })
        .from(orders)
        .where(and(...baseConditions))
        .groupBy(sql`DATE_FORMAT(${orders.createdAt}, ${format})`)
        .orderBy(asc(sql`DATE_FORMAT(${orders.createdAt}, ${format})`)),

      db.select({
        productId: products.id,
        name: products.name,
        image: products.image,
        quantity: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
        revenue: sql<string>`COALESCE(SUM(${orderItems.quantity} * ${orderItems.price}), 0)`,
      })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.order_id, orders.id))
        .innerJoin(products, eq(orderItems.product_id, products.id))
        .where(and(...baseConditions, isNull(orderItems.deletedAt), isNull(products.deletedAt)))
        .groupBy(products.id, products.name, products.image)
        .orderBy(desc(sql`SUM(${orderItems.quantity})`))
        .limit(10),

      db.select({
        id: orders.id,
        orderCode: orders.order_code,
        name: orders.name,
        branchId: orders.branch_id,
        branchName: branches.name,
        paymentMethod: orders.payment_method,
        total: sql<string>`COALESCE(${orders.totalAfterDiscount}, ${orders.total_price}, 0)`,
        createdAt: orders.createdAt,
      })
        .from(orders)
        .leftJoin(branches, eq(orders.branch_id, branches.id))
        .where(and(...baseConditions))
        .orderBy(desc(orders.createdAt))
        .limit(30),
    ]);

    const summary = summaryRows[0];
    return NextResponse.json({
      success: true,
      data: {
        scope: branchScope,
        branches: branchRows,
        summary: {
          revenue: Number(summary?.revenue || 0),
          orders: Number(summary?.orders || 0),
          averageOrder: Number(summary?.averageOrder || 0),
          discount: Number(summary?.discount || 0),
          tax: Number(summary?.tax || 0),
          service: Number(summary?.service || 0),
        },
        trend: trendRows.map((row) => ({
          period: row.period,
          revenue: Number(row.revenue || 0),
          orders: Number(row.orders || 0),
        })),
        topProducts: topProducts.map((row) => ({ ...row, quantity: Number(row.quantity || 0), revenue: Number(row.revenue || 0) })),
        recentSales: recentSales.map((row) => ({ ...row, total: Number(row.total || 0) })),
      },
    });
  } catch (error) {
    console.error('Sales analytics error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Gagal memuat analitik penjualan',
    }, { status: 500 });
  }
}
