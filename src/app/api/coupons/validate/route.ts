import { NextResponse } from 'next/server';
import {
  and,
  eq,
  gt,
  isNull,
  lt,
  or,
} from 'drizzle-orm';

import { db } from '@/db';
import {
  branches,
  coupon,
  couponBranches,
  mitra,
  users,
} from '@/db/schema';

export const dynamic = 'force-dynamic';

function toPositiveInteger(value: string | null): number | null {
  if (!value) return null;

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const slug = searchParams.get('slug')?.trim();
  const code = searchParams.get('code')?.trim().toUpperCase();
  const branchSlug = searchParams.get('branch_slug')?.trim();
  const requestedUserId = toPositiveInteger(searchParams.get('user_id'));

  if (!slug || !code) {
    return NextResponse.json(
      {
        success: false,
        message: 'Slug dan kode diperlukan',
      },
      { status: 400 },
    );
  }

  try {
    const [foundMitra] = await db
      .select({ id: mitra.id })
      .from(mitra)
      .where(
        and(
          eq(mitra.mitra_slug, slug),
          isNull(mitra.deletedAt),
        ),
      )
      .limit(1);

    if (!foundMitra) {
      return NextResponse.json(
        {
          success: false,
          message: 'Mitra tidak ditemukan',
        },
        { status: 404 },
      );
    }

    let branchId: number | null = null;

    if (branchSlug) {
      const [branch] = await db
        .select({ id: branches.id })
        .from(branches)
        .where(
          and(
            eq(branches.mitra_id, foundMitra.id),
            eq(branches.branch_slug, branchSlug),
            isNull(branches.deletedAt),
          ),
        )
        .limit(1);

      if (!branch) {
        return NextResponse.json(
          {
            success: false,
            message: 'Cabang tidak ditemukan',
          },
          { status: 404 },
        );
      }

      branchId = branch.id;
    }

    let isAuthenticatedMember = false;
    let authenticatedUserId: number | null = null;

    if (requestedUserId !== null) {
      const [member] = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.id, requestedUserId),
            eq(users.mitra_id, foundMitra.id),
            isNull(users.deletedAt),
          ),
        )
        .limit(1);

      if (member) {
        isAuthenticatedMember = true;
        authenticatedUserId = member.id;
      }
    }

    const now = new Date();

    const [validCoupon] = await db
      .select()
      .from(coupon)
      .where(
        and(
          eq(coupon.mitra_id, foundMitra.id),
          eq(coupon.coupon_code, code),
          isNull(coupon.deletedAt),
          or(
            isNull(coupon.start_date),
            lt(coupon.start_date, now),
          ),
          or(
            gt(coupon.expired_date, now),
            isNull(coupon.expired_date),
          ),
          or(
            eq(coupon.max_use, 0),
            lt(coupon.already_used, coupon.max_use),
          ),
        ),
      )
      .limit(1);

    if (!validCoupon) {
      return NextResponse.json(
        {
          success: false,
          message: 'Kupon kedaluwarsa atau kuotanya habis.',
        },
        { status: 400 },
      );
    }

    const mappings = await db
      .select({
        branchId: couponBranches.branch_id,
      })
      .from(couponBranches)
      .where(
        eq(couponBranches.coupon_id, validCoupon.id),
      );

    const branchIds = mappings.map((item) => item.branchId);

    const applies =
      branchIds.length === 0 ||
      (branchId !== null && branchIds.includes(branchId));

    if (!applies) {
      return NextResponse.json(
        {
          success: false,
          message: 'Kupon tidak berlaku di outlet ini.',
        },
        { status: 400 },
      );
    }

    const isMemberOnly =
      Number(validCoupon.is_member_only) === 1 ||
      validCoupon.is_member_only === true;

    if (isMemberOnly && !isAuthenticatedMember) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Kupon ini hanya khusus Member. Silakan login terlebih dahulu.',
          code: 'MEMBER_LOGIN_REQUIRED',
        },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: validCoupon.id,
        code: validCoupon.coupon_code,
        discountRate: Number(validCoupon.discount_rate) || 0,
        discountPrice: Number(validCoupon.discount_price) || 0,
        isMemberOnly,
        isAuthenticatedMember,
        authenticatedUserId,
        branchIds,
      },
    });
  } catch (error) {
    console.error('Error validating coupon:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Terjadi kesalahan saat memvalidasi kupon',
      },
      { status: 500 },
    );
  }
}