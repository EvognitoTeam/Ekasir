import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mitra, orders, products, materials, coupon } from '@/db/schema'; 
import { eq, and, gte, lte, or, notInArray, sql, isNull } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026'
);

// Helper Auth
async function getAuthPayload() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ekasir_session')?.value;
  if (!token) return null;
  try {
    const verified = await jwtVerify(token, SECRET_KEY);
    return verified.payload as any;
  } catch (err) {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    // 🔴 1. Verifikasi Token & Ambil data user (mitraId & branchId)
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date') || 'today';

    const mitraId = Number(payload.mitraId);
    const branchId = payload.branchId ? Number(payload.branchId) : null;

    // 2. Tentukan Rentang Waktu
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const endOfYesterday = new Date(startOfToday.getTime() - 1);
    const targetStart = dateParam === 'yesterday' ? startOfYesterday : startOfToday;
    const targetEnd = dateParam === 'yesterday' ? endOfYesterday : endOfToday;

    // 🔴 3. Helper function untuk membuat kondisi dasar (mitraId + branchId opsional)
    const getBaseCondition = (table: any) => {
      const condition = [eq(table.mitra_id, mitraId)];
      if (branchId) condition.push(eq(table.branch_id, branchId));
      return condition;
    };

    // 4. Jalankan Query Secara Paralel dengan branch_id terintegrasi
    const [ordersCountRes, activeOrdersRes, depletedRes, lowStockRes, activePromoRes] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(and(
          ...getBaseCondition(orders),
          gte(orders.createdAt, targetStart),
          lte(orders.createdAt, targetEnd)
        )),

      db.select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(and(
          ...getBaseCondition(orders),
          notInArray(orders.status, ['completed', 'cancelled'])
        )),

      db.select({ count: sql<number>`count(*)` })
        .from(products)
        .where(and(
          ...getBaseCondition(products),
          or(eq(products.status, 0), lte(products.stock, 0))
        )),

      db.select({ count: sql<number>`count(*)` })
        .from(materials)
        .where(and(
          ...getBaseCondition(materials),
          sql`${materials.stock} <= ${materials.low_stock_threshold}`
        )),

      db.select({ count: sql<number>`count(*)` })
        .from(coupon)
        .where(and(
          ...getBaseCondition(coupon),
          isNull(coupon.deletedAt), // Pastikan kupon tidak dihapus
          or(sql`${coupon.expired_date} IS NULL`, gte(coupon.expired_date, now))
        ))
    ]);

    return NextResponse.json({
      success: true,
      data: {
        targetOrderCount: Number(ordersCountRes[0]?.count || 0),
        activeOrdersCount: Number(activeOrdersRes[0]?.count || 0),
        depleted: Number(depletedRes[0]?.count || 0),
        lowStock: Number(lowStockRes[0]?.count || 0),
        activePromoCount: Number(activePromoRes[0]?.count || 0)
      }
    });

  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    return NextResponse.json({ success: false, message: 'Gagal memuat ringkasan data' }, { status: 500 });
  }
}