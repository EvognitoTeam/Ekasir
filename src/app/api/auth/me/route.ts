import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import {
  and,
  eq,
  isNull,
  sql,
} from 'drizzle-orm';

import { db } from '@/db';
import {
  orders,
  users,
} from '@/db/schema';

import {
  getMembershipTier,
} from '@/lib/member/membership';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET ||
    'rahasia-super-aman-evokasir-2026',
);

type SessionPayload = {
  userId?: string | number;
  slug?: string;
  role?: string;
  name?: string;
  email?: string;
  branchId?: string | number | null;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const urlSlug = searchParams.get('slug');

    const cookieStore = await cookies();
    const token =
      cookieStore.get('ekasir_session')?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: 'Tidak ada sesi aktif',
        },
        {
          status: 401,
        },
      );
    }

    const { payload } = await jwtVerify(
      token,
      SECRET_KEY,
    );

    const session = payload as SessionPayload;

    const role = String(
      session.role ?? '',
    ).toLowerCase();

    const sessionSlug = String(
      session.slug ?? '',
    );

    /*
     * Customer biasa boleh membuka katalog mitra lain.
     * Owner, kasir, dan kitchen hanya boleh membuka
     * mitra yang sesuai dengan sesi.
     */
    if (
      role !== 'user' &&
      urlSlug &&
      sessionSlug !== urlSlug
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Akses ditolak. Sesi Anda tidak terdaftar di toko ini.',
        },
        {
          status: 403,
        },
      );
    }

    const userId = Number(session.userId);

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Identitas pengguna pada sesi tidak valid.',
        },
        {
          status: 401,
        },
      );
    }

    /*
     * Ambil data user terbaru dari MySQL agar memberId
     * tidak bergantung pada isi JWT.
     */
    const userRows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        memberId: users.memberId,
        branchId: users.branch_id,
        mitraId: users.mitra_id,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const user = userRows[0];

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Pengguna tidak ditemukan.',
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Decimal MySQL biasanya dikembalikan sebagai string.
     * CAST digunakan agar hasil SUM bisa dinormalisasi
     * menjadi angka.
     */
    const purchaseRows = await db
      .select({
        totalSpent: sql<string>`
          COALESCE(
            SUM(
              CAST(
                COALESCE(
                  ${orders.totalAfterDiscount},
                  ${orders.total_price},
                  0
                )
                AS DECIMAL(18, 0)
              )
            ),
            0
          )
        `,
        totalOrders: sql<number>`
          COUNT(${orders.id})
        `,
      })
      .from(orders)
      .where(
        and(
          eq(orders.user_id, user.id),
          eq(orders.status, 'completed'),
          isNull(orders.deletedAt),
        ),
      );

    const totalSpent = Number(
      purchaseRows[0]?.totalSpent ?? 0,
    );

    const totalOrders = Number(
      purchaseRows[0]?.totalOrders ?? 0,
    );

    const membership =
      getMembershipTier(totalSpent);

    return NextResponse.json({
      success: true,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,

        mitraId: user.mitraId,
        mitra_id: user.mitraId,

        branchId: user.branchId,
        branch_id: user.branchId,

        memberId: user.memberId,
        member_id: user.memberId,

        totalOrders,
        total_orders: totalOrders,

        totalSpent:
          membership.totalSpent,

        total_spent:
          membership.totalSpent,

        tier: membership.tier,
        member_tier: membership.tier,

        nextTier:
          membership.nextTier,

        nextTierMinimum:
          membership.nextTierMinimum,

        remainingToNextTier:
          membership.remainingToNextTier,

        tierProgress:
          membership.progress,

        /*
         * Ganti dengan kolom poin asli jika sistem poin
         * sudah disimpan pada database.
         */
        points: 0,
      },
    });
  } catch (error) {
    console.error(
      'GET /api/auth/me error:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: 'Sesi tidak valid.',
      },
      {
        status: 401,
      },
    );
  }
}