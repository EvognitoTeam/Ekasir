import { NextResponse } from 'next/server';
import { and, eq, gt, inArray, isNull, lt, or } from 'drizzle-orm';

import { db } from '@/db';
import { branches, coupon, couponBranches, mitra } from '@/db/schema';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const branchSlug = searchParams.get('branch_slug');
  if (!slug) return NextResponse.json({ success: false, message: 'Slug diperlukan' }, { status: 400 });

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
      eq(coupon.mitra_id, foundMitra.id), isNull(coupon.deletedAt),
      or(isNull(coupon.start_date), lt(coupon.start_date, now)),
      or(gt(coupon.expired_date, now), isNull(coupon.expired_date)),
      or(eq(coupon.max_use, 0), lt(coupon.already_used, coupon.max_use)),
    ));
    if (rows.length === 0) return NextResponse.json({ success: true, data: [] });

    const mappings = await db.select().from(couponBranches).where(inArray(couponBranches.coupon_id, rows.map((row) => row.id)));
    const map = new Map<number, number[]>();
    for (const item of mappings) map.set(item.coupon_id, [...(map.get(item.coupon_id) || []), item.branch_id]);

    const data = rows
      .map((row) => ({ ...row, branch_ids: map.get(row.id) || [] }))
      .filter((row) => row.branch_ids.length === 0 || (branchId !== null && row.branch_ids.includes(branchId)));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching coupon:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
