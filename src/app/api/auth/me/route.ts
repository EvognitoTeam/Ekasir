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
  branches,
  mitra,
  orders,
  users,
} from '@/db/schema';


const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET ||
    'rahasia-super-aman-evokasir-2026',
);

type MysqlExecuteResult<T> = [T, unknown];

type LoyaltyRow = {
  points: number;
  tier_id: number | null;
  lifetime_points_earned: number;
  lifetime_points_redeemed: number;
  lifetime_spending: string | number;
  tier_name: string | null;
};

type LoyaltySettingsRow = {
  points_enabled: number;
  points_tier_basis: 'lifetime_spending' | 'lifetime_points';
  points_redeem_rate: string | number;
};

type NextTierRow = {
  name: string;
  minimum_spending: string | number;
  minimum_lifetime_points: number;
};

type SessionPayload = {
  userId?: string | number;
  slug?: string;
  role?: string;
  name?: string;
  email?: string;
  branchId?: string | number | null;
};

function normalizeString(value: unknown): string {
  return String(value ?? '').trim();
}

function branchSqlCondition(branchId: number | null) {
  return branchId === null
    ? sql`IS NULL`
    : sql`= ${branchId}`;
}

async function resolveScope(slug: string, branchSlug: string | null) {
  const mitraRows = await db
    .select({ id: mitra.id })
    .from(mitra)
    .where(
      and(
        eq(mitra.mitra_slug, slug),
        isNull(mitra.deletedAt),
      ),
    )
    .limit(1);

  const targetMitra = mitraRows[0];

  if (!targetMitra) {
    return null;
  }

  let branchId: number | null = null;

  if (branchSlug) {
    const branchRows = await db
      .select({ id: branches.id })
      .from(branches)
      .where(
        and(
          eq(branches.mitra_id, targetMitra.id),
          eq(branches.branch_slug, branchSlug),
          isNull(branches.deletedAt),
        ),
      )
      .limit(1);

    if (!branchRows[0]) {
      return null;
    }

    branchId = Number(branchRows[0].id);
  }

  return {
    mitraId: Number(targetMitra.id),
    branchId,
  };
}

async function loadSettings(mitraId: number, branchId: number | null) {
  const [scopedRows] = await db.execute(
    sql`
      SELECT
        points_enabled,
        points_tier_basis,
        points_redeem_rate
      FROM settings
      WHERE mitra_id = ${mitraId}
        AND branch_id ${branchSqlCondition(branchId)}
      ORDER BY id DESC
      LIMIT 1
    `,
  ) as unknown as MysqlExecuteResult<LoyaltySettingsRow[]>;

  if (scopedRows[0]) {
    return scopedRows[0];
  }

  if (branchId !== null) {
    const [globalRows] = await db.execute(
      sql`
        SELECT
          points_enabled,
          points_tier_basis,
          points_redeem_rate
        FROM settings
        WHERE mitra_id = ${mitraId}
          AND branch_id IS NULL
        ORDER BY id DESC
        LIMIT 1
      `,
    ) as unknown as MysqlExecuteResult<LoyaltySettingsRow[]>;

    return globalRows[0] ?? null;
  }

  return null;
}

async function loadBalance(userId: number, mitraId: number, branchId: number | null) {
  const [scopedRows] = await db.execute(
    sql`
      SELECT
        lp.points,
        lp.tier_id,
        lp.lifetime_points_earned,
        lp.lifetime_points_redeemed,
        lp.lifetime_spending,
        lt.name AS tier_name
      FROM loyalty_points lp
      LEFT JOIN loyalty_tiers lt
        ON lt.id = lp.tier_id
      WHERE lp.user_id = ${userId}
        AND lp.mitra_id = ${mitraId}
        AND lp.branch_id ${branchSqlCondition(branchId)}
        AND lp.deleted_at IS NULL
      ORDER BY lp.id ASC
      LIMIT 1
    `,
  ) as unknown as MysqlExecuteResult<LoyaltyRow[]>;

  if (scopedRows[0]) {
    return scopedRows[0];
  }

  if (branchId !== null) {
    const [globalRows] = await db.execute(
      sql`
        SELECT
          lp.points,
          lp.tier_id,
          lp.lifetime_points_earned,
          lp.lifetime_points_redeemed,
          lp.lifetime_spending,
          lt.name AS tier_name
        FROM loyalty_points lp
        LEFT JOIN loyalty_tiers lt
          ON lt.id = lp.tier_id
        WHERE lp.user_id = ${userId}
          AND lp.mitra_id = ${mitraId}
          AND lp.branch_id IS NULL
          AND lp.deleted_at IS NULL
        ORDER BY lp.id ASC
        LIMIT 1
      `,
    ) as unknown as MysqlExecuteResult<LoyaltyRow[]>;

    return globalRows[0] ?? null;
  }

  return null;
}

async function loadNextTier(
  mitraId: number,
  branchId: number | null,
  basis: 'lifetime_spending' | 'lifetime_points',
  currentValue: number,
) {
  const thresholdColumn =
    basis === 'lifetime_points'
      ? sql`minimum_lifetime_points`
      : sql`minimum_spending`;

  const [rows] = await db.execute(
    sql`
      SELECT
        name,
        minimum_spending,
        minimum_lifetime_points
      FROM loyalty_tiers
      WHERE mitra_id = ${mitraId}
        AND branch_id ${branchSqlCondition(branchId)}
        AND is_active = 1
        AND deleted_at IS NULL
        AND ${thresholdColumn} > ${currentValue}
      ORDER BY ${thresholdColumn} ASC, sort_order ASC, id ASC
      LIMIT 1
    `,
  ) as unknown as MysqlExecuteResult<NextTierRow[]>;

  return rows[0] ?? null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const urlSlug = normalizeString(searchParams.get('slug'));
    const rawBranchSlug =
      normalizeString(
        searchParams.get(
          'branch_slug',
        ),
      );

    /*
     * Nama halaman dari route catch-all tidak boleh diperlakukan
     * sebagai slug cabang.
     */
    const reservedCustomerRoutes =
      new Set([
        'profile',
        'history',
        'checkout',
        'coupons',
        'cart',
        'menu',
      ]);

    const branchSlug =
      rawBranchSlug &&
      !reservedCustomerRoutes.has(
        rawBranchSlug.toLowerCase(),
      )
        ? rawBranchSlug
        : null;

    const cookieStore = await cookies();
    const token = cookieStore.get('ekasir_session')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada sesi aktif' },
        { status: 401 },
      );
    }

    const { payload } = await jwtVerify(token, SECRET_KEY);
    const session = payload as SessionPayload;

    const role = normalizeString(session.role).toLowerCase();
    const sessionSlug = normalizeString(session.slug);

    if (role !== 'user' && urlSlug && sessionSlug !== urlSlug) {
      return NextResponse.json(
        {
          success: false,
          message: 'Akses ditolak. Sesi Anda tidak terdaftar di toko ini.',
        },
        { status: 403 },
      );
    }

    const userId = Number(session.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Identitas pengguna pada sesi tidak valid.',
        },
        { status: 401 },
      );
    }

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
      .where(
        and(
          eq(users.id, userId),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    const user = userRows[0];

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Pengguna tidak ditemukan.' },
        { status: 404 },
      );
    }

    const targetSlug = urlSlug || sessionSlug;

    if (!targetSlug) {
      return NextResponse.json(
        { success: false, message: 'Slug mitra diperlukan.' },
        { status: 400 },
      );
    }

    const scope = await resolveScope(targetSlug, branchSlug);

    if (!scope) {
      return NextResponse.json(
        { success: false, message: 'Mitra atau cabang tidak ditemukan.' },
        { status: 404 },
      );
    }

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
        totalOrders: sql<number>`COUNT(${orders.id})`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.user_id, user.id),
          eq(orders.mitra_id, scope.mitraId),
          scope.branchId === null
            ? isNull(orders.branch_id)
            : eq(orders.branch_id, scope.branchId),
          eq(orders.status, 'completed'),
          isNull(orders.deletedAt),
        ),
      );

    const totalSpent = Number(purchaseRows[0]?.totalSpent ?? 0);
    const totalOrders = Number(purchaseRows[0]?.totalOrders ?? 0);

    const settings = await loadSettings(scope.mitraId, scope.branchId);
    const balance = await loadBalance(user.id, scope.mitraId, scope.branchId);

    const points = Number(balance?.points ?? 0);
    const lifetimePointsEarned = Number(balance?.lifetime_points_earned ?? 0);
    const lifetimePointsRedeemed = Number(balance?.lifetime_points_redeemed ?? 0);
    const lifetimeSpending = Number(balance?.lifetime_spending ?? totalSpent);

    const tierBasis =
      settings?.points_tier_basis ?? 'lifetime_spending';

    const tierValue =
      tierBasis === 'lifetime_points'
        ? lifetimePointsEarned
        : lifetimeSpending;

    const nextTier = await loadNextTier(
      scope.mitraId,
      scope.branchId,
      tierBasis,
      tierValue,
    );

    const nextTierMinimum = nextTier
      ? Number(
          tierBasis === 'lifetime_points'
            ? nextTier.minimum_lifetime_points
            : nextTier.minimum_spending,
        )
      : null;

    const remainingToNextTier =
      nextTierMinimum === null
        ? 0
        : Math.max(0, nextTierMinimum - tierValue);

    const tierProgress =
      nextTierMinimum && nextTierMinimum > 0
        ? Math.min(100, Math.max(0, (tierValue / nextTierMinimum) * 100))
        : nextTier
          ? 0
          : 100;

    const pointValue = Math.max(
      0,
      Number(settings?.points_redeem_rate ?? 0),
    );

    const pointsRupiahValue = points * pointValue;

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,

        mitraId: scope.mitraId,
        mitra_id: scope.mitraId,
        branchId: scope.branchId,
        branch_id: scope.branchId,

        memberId: user.memberId,
        member_id: user.memberId,

        points,
        point: points,
        loyalty_points: points,
        total_points: points,

        pointValue,
        point_value: pointValue,
        pointsRupiahValue,
        points_rupiah_value: pointsRupiahValue,

        loyaltyEnabled: Boolean(settings?.points_enabled),
        loyalty_enabled: Boolean(settings?.points_enabled),

        lifetimePointsEarned,
        lifetime_points_earned: lifetimePointsEarned,
        lifetimePointsRedeemed,
        lifetime_points_redeemed: lifetimePointsRedeemed,
        lifetimeSpending,
        lifetime_spending: lifetimeSpending,

        totalOrders,
        total_orders: totalOrders,
        totalSpent,
        total_spent: totalSpent,

        tier: balance?.tier_name || 'Member',
        member_tier: balance?.tier_name || 'Member',

        nextTier: nextTier?.name ?? null,
        next_tier: nextTier?.name ?? null,
        nextTierMinimum,
        next_tier_minimum: nextTierMinimum,
        remainingToNextTier,
        remaining_to_next_tier: remainingToNextTier,
        tierProgress,
        tier_progress: tierProgress,
        tierBasis,
        tier_basis: tierBasis,
      },
    });
  } catch (error) {
    console.error(
      '[AUTH_ME_LOYALTY_ERROR]',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Gagal mengambil data profil.',
      },
      {
        status: 500,
      },
    );
  }
}