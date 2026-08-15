import { NextResponse } from 'next/server';
import {
  and,
  eq,
  isNull,
} from 'drizzle-orm';

import { db } from '@/db';
import {
  branches,
  coupon,
  couponBranches,
  mitra,
  users,
  orders,
} from '@/db/schema';

export const dynamic = 'force-dynamic';

function toPositiveInteger(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
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
      { success: false, message: 'Slug dan kode diperlukan' },
      { status: 400 },
    );
  }

  try {
    // 1. Cek Mitra
    const [foundMitra] = await db
      .select({ id: mitra.id })
      .from(mitra)
      .where(and(eq(mitra.mitra_slug, slug), isNull(mitra.deletedAt)))
      .limit(1);

    if (!foundMitra) {
      return NextResponse.json(
        { success: false, message: 'Mitra tidak ditemukan' },
        { status: 404 },
      );
    }

    // 2. Cek Cabang (Jika Ada)
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
          { success: false, message: 'Cabang tidak ditemukan' },
          { status: 404 },
        );
      }
      branchId = branch.id;
    }

    // 3. Cek Status Member Login
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

    // 🟢 4. CEK KEBERADAAN KUPON (TANPA FILTER WAKTU DULU)
    const [couponExists] = await db
      .select()
      .from(coupon)
      .where(
        and(
          eq(coupon.mitra_id, foundMitra.id),
          eq(coupon.coupon_code, code),
          isNull(coupon.deletedAt)
        )
      )
      .limit(1);

    if (!couponExists) {
      return NextResponse.json(
        { success: false, message: 'Kupon tidak ditemukan.' },
        { status: 404 },
      );
    }

    // 🟢 5. VALIDASI WAKTU DAN KUOTA (Pesan Error Spesifik)
    const now = new Date();
    
    // Cek apakah promo belum dimulai
    if (couponExists.start_date && new Date(couponExists.start_date) > now) {
      return NextResponse.json(
        { success: false, message: 'Promo ini belum dimulai.' },
        { status: 400 },
      );
    }

    // Cek apakah promo sudah lewat (expired)
    if (couponExists.expired_date && new Date(couponExists.expired_date) < now) {
       return NextResponse.json(
        { success: false, message: 'Kupon sudah kedaluwarsa.' },
        { status: 400 },
      );
    }

    // Cek limit kuota global
    if (couponExists.max_use > 0 && couponExists.already_used >= couponExists.max_use) {
      return NextResponse.json(
        { success: false, message: 'Kuota promo ini sudah habis dipakai orang.' },
        { status: 400 },
      );
    }

    const validCoupon = couponExists;

    // 6. Validasi Cabang Kupon
    const mappings = await db
      .select({ branchId: couponBranches.branch_id })
      .from(couponBranches)
      .where(eq(couponBranches.coupon_id, validCoupon.id));

    const branchIds = mappings.map((item) => item.branchId);
    const applies = branchIds.length === 0 || (branchId !== null && branchIds.includes(branchId));

    if (!applies) {
      return NextResponse.json(
        { success: false, message: 'Kupon tidak berlaku di outlet ini.' },
        { status: 400 },
      );
    }

    const isMemberOnly = Number(validCoupon.is_member_only) === 1 || validCoupon.is_member_only === true;

    if (isMemberOnly && !isAuthenticatedMember) {
      return NextResponse.json(
        { success: false, message: 'Kupon ini khusus Member. Silakan login terlebih dahulu.', code: 'MEMBER_LOGIN_REQUIRED' },
        { status: 401 },
      );
    }

    // 7. Validasi Limitasi Penggunaan Per User
    const couponData = validCoupon as any; 
    const maxUsePerUser = Number(couponData.max_use_per_user || 0);
    const dailyLimit = Number(couponData.daily_user_limit || 0);
    const monthlyLimit = Number(couponData.monthly_user_limit || 0);
    const yearlyLimit = Number(couponData.yearly_user_limit || 0);

    const requiresUserLimits = maxUsePerUser > 0 || dailyLimit > 0 || monthlyLimit > 0 || yearlyLimit > 0;

    if (requiresUserLimits) {
      if (!isAuthenticatedMember || !authenticatedUserId) {
        return NextResponse.json(
          { success: false, message: 'Kupon spesial ini memerlukan Anda untuk login terlebih dahulu.', code: 'MEMBER_LOGIN_REQUIRED' },
          { status: 401 },
        );
      }

      const userUsages = await db
        .select({ createdAt: orders.createdAt })
        .from(orders)
        .where(
          and(
            eq(orders.user_id, authenticatedUserId),
            eq(orders.discountId, validCoupon.id),
            eq(orders.status, 'completed')
          )
        );

      const totalUsage = userUsages.length;

      if (maxUsePerUser > 0 && totalUsage >= maxUsePerUser) {
        return NextResponse.json(
          { success: false, message: 'Anda sudah mencapai batas maksimal penggunaan promo ini.' },
          { status: 400 },
        );
      }

      if (dailyLimit > 0) {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dailyUsage = userUsages.filter((o) => new Date(o.createdAt!) >= startOfDay).length;
        if (dailyUsage >= dailyLimit) {
          return NextResponse.json(
            { success: false, message: 'Batas harian kupon ini telah habis. Silakan coba lagi besok.' },
            { status: 400 },
          );
        }
      }

      if (monthlyLimit > 0) {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyUsage = userUsages.filter((o) => new Date(o.createdAt!) >= startOfMonth).length;
        if (monthlyUsage >= monthlyLimit) {
          return NextResponse.json(
            { success: false, message: 'Batas bulanan penggunaan kupon ini telah habis.' },
            { status: 400 },
          );
        }
      }

      if (yearlyLimit > 0) {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const yearlyUsage = userUsages.filter((o) => new Date(o.createdAt!) >= startOfYear).length;
        if (yearlyUsage >= yearlyLimit) {
          return NextResponse.json(
            { success: false, message: 'Batas tahunan penggunaan kupon ini telah habis.' },
            { status: 400 },
          );
        }
      }
    }

    // 8. Return Payload Sukses
    return NextResponse.json({
      success: true,
      data: {
        id: validCoupon.id,
        code: validCoupon.coupon_code,
        discountRate: Number(validCoupon.discount_rate) || 0,
        discountPrice: Number(validCoupon.discount_price) || 0,
        min_purchase: Number(couponData.min_purchase) || 0,
        max_discount: Number(couponData.max_discount) || 0,
        is_auto_apply: Boolean(couponData.is_auto_apply === true || Number(couponData.is_auto_apply) === 1),
        applicable_items: couponData.applicable_items || [],
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
        message: 'Terjadi kesalahan internal saat memvalidasi kupon',
      },
      { status: 500 },
    );
  }
}