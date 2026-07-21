import { NextResponse } from 'next/server';
import { and, eq, gt, inArray, isNull, lt, or } from 'drizzle-orm';

import { db } from '@/db';
import { branches, coupon, couponBranches, mitra } from '@/db/schema';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const code = searchParams.get('code');
  const branchSlug = searchParams.get('branch_slug');
  if (!slug || !code) return NextResponse.json({ success: false, message: 'Slug dan kode diperlukan' }, { status: 400 });

  try {
    const [foundMitra] = await db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
    if (!foundMitra) return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });

    let branchId: number | null = null;
    if (branchSlug) {
      const [branch] = await db.select({ id: branches.id }).from(branches).where(and(
        eq(branches.mitra_id, foundMitra.id), eq(branches.branch_slug, branchSlug), isNull(branches.deletedAt),
      )).limit(1);
      if (!branch) return NextResponse.json({ success: false, message: 'Cabang tidak ditemukan' }, { status: 404 });
      branchId = branch.id;
    }

    const now = new Date();
    const rows = await db.select().from(coupon).where(and(
      eq(coupon.mitra_id, foundMitra.id), eq(coupon.coupon_code, code.toUpperCase()), isNull(coupon.deletedAt),
      or(isNull(coupon.start_date), lt(coupon.start_date, now)),
      or(gt(coupon.expired_date, now), isNull(coupon.expired_date)),
      or(eq(coupon.max_use, 0), lt(coupon.already_used, coupon.max_use)),
    )).limit(1);

    const validCoupon = rows[0];
    if (!validCoupon) return NextResponse.json({ success: false, message: 'Kupon kedaluwarsa atau kuotanya habis.' }, { status: 400 });

    const mappings = await db.select().from(couponBranches).where(eq(couponBranches.coupon_id, validCoupon.id));
    const branchIds = mappings.map((item) => item.branch_id);
    const applies = branchIds.length === 0 || (branchId !== null && branchIds.includes(branchId));
    if (!applies) return NextResponse.json({ success: false, message: 'Kupon tidak berlaku di outlet ini.' }, { status: 400 });

    return NextResponse.json({
      success: true,
      data: {
        code: validCoupon.coupon_code,
        discountRate: validCoupon.discount_rate || 0,
        discountPrice: Number(validCoupon.discount_price) || 0,
        isMemberOnly: validCoupon.is_member_only,
        branchIds,
      },
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan saat memvalidasi kupon' }, { status: 500 });
  }
}
