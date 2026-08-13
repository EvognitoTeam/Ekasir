import {
  NextResponse,
} from 'next/server';

import {
  and,
  eq,
  isNull,
  or,
  sql,
} from 'drizzle-orm';

import {
  db,
} from '@/db';

import {
  loyaltyPoints,
  mitra,
  users,
} from '@/db/schema';

export const dynamic =
  'force-dynamic';

export const runtime =
  'nodejs';

type RequestBody = {
  slug?: unknown;
  identifier?: unknown;
};

function normalizeString(
  value: unknown,
) {
  return String(
    value ?? '',
  ).trim();
}

export async function POST(
  request: Request,
): Promise<Response> {
  try {
    const body =
      await request.json() as
        RequestBody;

    const slug =
      normalizeString(
        body.slug,
      );

    const identifier =
      normalizeString(
        body.identifier,
      );

    if (
      !slug ||
      !identifier
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Slug serta ID member atau email wajib diisi.',
        },
        {
          status:
            400,
        },
      );
    }

    // =========================================================
    // 1. CARI MITRA BERDASARKAN SLUG
    // =========================================================

    const [
      currentMitra,
    ] =
      await db
        .select({
          id:
            mitra.id,
        })
        .from(mitra)
        .where(
          and(
            eq(
              mitra.mitra_slug,
              slug,
            ),
            isNull(
              mitra.deletedAt,
            ),
          ),
        )
        .limit(1);

    if (!currentMitra) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Mitra tidak ditemukan.',
        },
        {
          status:
            404,
        },
      );
    }

    // =========================================================
    // 2. NORMALISASI IDENTIFIER
    // =========================================================

    const normalizedIdentifier =
      identifier.toLowerCase();

    // =========================================================
    // 3. CARI MEMBER
    // =========================================================

    const [
      member,
    ] =
      await db
        .select({
          id:
            users.id,
          memberId:
            users.memberId,
          name:
            users.name,
          email:
            users.email,
          phone:
            users.phone,
          role:
            users.role,
        })
        .from(users)
        .where(
          and(
            eq(
              users.mitra_id,
              currentMitra.id,
            ),
            isNull(
              users.deletedAt,
            ),
            or(
              sql`LOWER(${users.email}) = ${normalizedIdentifier}`,
              sql`LOWER(${users.memberId}) = ${normalizedIdentifier}`,
            ),
          ),
        )
        .limit(1);

    if (
      !member ||
      !member.memberId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Member tidak ditemukan pada mitra ini.',
        },
        {
          status:
            404,
        },
      );
    }

    // =========================================================
    // 4. AMBIL TOTAL POINTS MEMBER
    // =========================================================
    //
    // Karena loyalty_points dapat memiliki record berdasarkan
    // branch_id, kita jumlahkan seluruh saldo poin member
    // dalam mitra tersebut.
    //
    // Contoh:
    // Branch A = 500
    // Branch B = 300
    // Branch C = 200
    // ----------------
    // Total     = 1000
    //
    // =========================================================

    const [
      loyalty,
    ] =
      await db
        .select({
          points:
            sql<number>`
              COALESCE(
                SUM(${loyaltyPoints.points}),
                0
              )
            `.as('points'),

          lifetimePointsEarned:
            sql<number>`
              COALESCE(
                SUM(${loyaltyPoints.lifetime_points_earned}),
                0
              )
            `.as(
              'lifetime_points_earned',
            ),

          lifetimePointsRedeemed:
            sql<number>`
              COALESCE(
                SUM(${loyaltyPoints.lifetime_points_redeemed}),
                0
              )
            `.as(
              'lifetime_points_redeemed',
            ),

          lifetimeSpending:
            sql<number>`
              COALESCE(
                SUM(${loyaltyPoints.lifetime_spending}),
                0
              )
            `.as(
              'lifetime_spending',
            ),
        })
        .from(loyaltyPoints)
        .where(
          and(
            eq(
              loyaltyPoints.user_id,
              member.id,
            ),
            eq(
              loyaltyPoints.mitra_id,
              currentMitra.id,
            ),
          ),
        );

    // =========================================================
    // 5. NORMALISASI DATA POINTS
    // =========================================================

    const points =
      Number(
        loyalty?.points ?? 0,
      );

    const lifetimePointsEarned =
      Number(
        loyalty?.lifetimePointsEarned ??
          0,
      );

    const lifetimePointsRedeemed =
      Number(
        loyalty?.lifetimePointsRedeemed ??
          0,
      );

    const lifetimeSpending =
      Number(
        loyalty?.lifetimeSpending ??
          0,
      );

    // =========================================================
    // 6. RESPONSE
    // =========================================================

    return NextResponse.json({
      success: true,

      data: {
        userId:
          member.id,

        memberId:
          member.memberId,

        name:
          member.name,

        email:
          member.email,

        phone:
          member.phone ??
          null,

        // Saldo poin saat ini
        points,

        // Informasi tambahan loyalty
        lifetimePointsEarned,

        lifetimePointsRedeemed,

        lifetimeSpending,
      },
    });
  } catch (error) {
    console.error(
      '[KIOSK_MEMBER_IDENTIFY_ERROR]',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Gagal mencari data member.',
      },
      {
        status:
          500,
      },
    );
  }
}