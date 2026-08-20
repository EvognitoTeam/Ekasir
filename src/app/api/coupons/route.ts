import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { and, eq, gt, inArray, isNull, lt, or } from 'drizzle-orm';

import { db } from '@/db';
import { branches, coupon, couponBranches, mitra, couponUsages } from '@/db/schema';

export const dynamic = 'force-dynamic';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026'
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const branchSlug = searchParams.get('branch_slug');
  
  // 🔴 PARAMETER BARU: Cek apakah meminta riwayat
  const includeHistory = searchParams.get('include_history') === 'true';
  
  if (!slug) {
    return NextResponse.json({ success: false, message: 'Slug diperlukan' }, { status: 400 });
  }

  try {
    const [foundMitra] = await db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
    if (!foundMitra) {
      return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });
    }

    let branchId: number | null = null;
    if (branchSlug) {
      const [branch] = await db.select({ id: branches.id }).from(branches).where(and(
        eq(branches.mitra_id, foundMitra.id), eq(branches.branch_slug, branchSlug), isNull(branches.deletedAt),
      )).limit(1);
      if (!branch) {
        return NextResponse.json({ success: false, message: 'Cabang tidak ditemukan' }, { status: 404 });
      }
      branchId = branch.id;
    }

    let userId: number | null = null;
    const usedCouponIds = new Set<number>(); 

    const cookieStore = await cookies();
    const token = cookieStore.get('ekasir_session')?.value;
    
    if (token) {
      try {
        const { payload } = await jwtVerify(token, SECRET_KEY);
        if (payload && payload.userId) {
          userId = Number(payload.userId);
          const usages = await db
            .select({ coupon_id: couponUsages.coupon_id })
            .from(couponUsages)
            .where(eq(couponUsages.user_id, userId));
            
          usages.forEach(u => usedCouponIds.add(u.coupon_id));
        }
      } catch (e) {}
    }

    const now = new Date();

    // 🔴 KONDISI 1: Promo Publik Aktif
    const publicActiveCondition = and(
      eq(coupon.is_claimable, false),
      or(isNull(coupon.start_date), lt(coupon.start_date, now)),
      or(gt(coupon.expired_date, now), isNull(coupon.expired_date)),
      or(eq(coupon.max_use, 0), lt(coupon.already_used, coupon.max_use))
    );

    // 🔴 KONDISI 2: Promo Privat (Hanya yang masih aktif)
    const privateActiveCondition = and(
      eq(coupon.is_claimable, true),
      eq(coupon.claimed_by_user_id, userId),
      or(isNull(coupon.start_date), lt(coupon.start_date, now)),
      or(gt(coupon.expired_date, now), isNull(coupon.expired_date)),
      or(eq(coupon.max_use, 0), lt(coupon.already_used, coupon.max_use))
    );

    // 🔴 KONDISI 3: Semua Promo Privat (Termasuk kedaluwarsa, untuk history tab)
    const privateAllCondition = and(
      eq(coupon.is_claimable, true),
      eq(coupon.claimed_by_user_id, userId)
    );

    // Beralih kondisi tergantung apakah minta history atau untuk checkout
    const visibilityCondition = userId
      ? or(
          publicActiveCondition,
          includeHistory ? privateAllCondition : privateActiveCondition
        )
      : publicActiveCondition;

    const rows = await db.select().from(coupon).where(and(
      eq(coupon.mitra_id, foundMitra.id), 
      isNull(coupon.deletedAt),
      visibilityCondition
    ));
    
    if (rows.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const mappings = await db.select().from(couponBranches).where(inArray(couponBranches.coupon_id, rows.map((row) => row.id)));
    const map = new Map<number, number[]>();
    for (const item of mappings) {
      map.set(item.coupon_id, [...(map.get(item.coupon_id) || []), item.branch_id]);
    }

    const data = rows
      .map((row) => ({ 
        ...row, 
        branch_ids: map.get(row.id) || [],
        is_used: usedCouponIds.has(row.id) 
      }))
      .filter((row) => {
        // 🔴 Jika untuk Checkout (!includeHistory), tendang kupon yang sudah dipakai
        if (!includeHistory && row.is_used) {
          return false;
        }
        return row.branch_ids.length === 0 || (branchId !== null && row.branch_ids.includes(branchId));
      });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching coupon:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}