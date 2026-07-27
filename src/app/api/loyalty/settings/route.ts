import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, type JWTPayload } from 'jose';
import { and, eq, isNull, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  branches,
  mitra,
} from '@/db/schema';

export const dynamic = 'force-dynamic';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET ||
    'rahasia-super-aman-evokasir-2026',
);

type AuthPayload = JWTPayload & {
  userId?: number;
  mitraId?: number;
  branchId?: number | null;
  slug?: string;
  role?: string;
};

type EarningMode =
  | 'fixed_ratio'
  | 'tier_percentage';

type TierBasis =
  | 'lifetime_spending'
  | 'lifetime_points';

type LoyaltySettingsPayload = {
  isEnabled?: unknown;
  earningMode?: unknown;
  tierBasis?: unknown;
  earningAmount?: unknown;
  earningPoints?: unknown;
  minimumTransaction?: unknown;
  maximumPointsPerOrder?: unknown;
  redemptionValue?: unknown;
  minimumRedeemPoints?: unknown;
  maximumRedeemPoints?: unknown;
  maximumRedeemPercentage?: unknown;
  allowWithCoupon?: unknown;
  expirationEnabled?: unknown;
  expirationDays?: unknown;
};

type LoyaltyTierPayload = {
  id?: unknown;
  name?: unknown;
  code?: unknown;
  minimumSpending?: unknown;
  minimumLifetimePoints?: unknown;
  earningPercentage?: unknown;
  sortOrder?: unknown;
  isActive?: unknown;
};

type LoyaltyRequestBody = {
  mitraSlug?: unknown;
  branchSlug?: unknown;
  settings?: LoyaltySettingsPayload;
  tiers?: LoyaltyTierPayload[];
};

type MysqlExecuteResult<T> = [
  T,
  unknown,
];

type RawSettingsRow = {
  id: number;
  mitra_id: number;
  branch_id: number | null;
  points_enabled: number;
  points_earning_mode: EarningMode;
  points_earn_rate: number;
  points_earn_points: number;
  points_minimum_transaction: number;
  points_maximum_earn_per_order: number | null;
  points_tier_basis: TierBasis;
  points_redeem_rate: string | number;
  points_minimum_redeem: number;
  points_maximum_redeem: number | null;
  points_max_discount_percent: string | number;
  points_allow_with_coupon: number;
  points_expiration_enabled: number;
  points_expiration_days: number | null;
};

type RawTierRow = {
  id: number;
  mitra_id: number;
  branch_id: number | null;
  name: string;
  code: string;
  minimum_spending: string | number;
  minimum_lifetime_points: number;
  earning_percentage: string | number;
  sort_order: number;
  is_active: number;
};

type RawStatsRow = {
  points_in_circulation: string | number | null;
  members_with_points: string | number | null;
  point_transactions: string | number | null;
};

function jsonError(
  status: number,
  message: string,
) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    {
      status,
    },
  );
}

function normalizeString(
  value: unknown,
): string {
  return String(value ?? '').trim();
}

function normalizeNullableString(
  value: unknown,
): string | null {
  const normalized =
    normalizeString(value);

  return normalized || null;
}

function normalizeBoolean(
  value: unknown,
): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value)
      .trim()
      .toLowerCase() === 'true'
  );
}

function normalizeNumber(
  value: unknown,
  fallback = 0,
): number {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function normalizeNonNegativeInteger(
  value: unknown,
  fallback = 0,
): number {
  return Math.max(
    0,
    Math.floor(
      normalizeNumber(
        value,
        fallback,
      ),
    ),
  );
}

function normalizePositiveInteger(
  value: unknown,
  fallback = 1,
): number {
  return Math.max(
    1,
    Math.floor(
      normalizeNumber(
        value,
        fallback,
      ),
    ),
  );
}

function normalizeNullablePositiveInteger(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const number =
    normalizeNumber(value, 0);

  if (number <= 0) {
    return null;
  }

  return Math.floor(number);
}

function normalizeDecimal(
  value: unknown,
  fallback = 0,
): number {
  const number =
    normalizeNumber(
      value,
      fallback,
    );

  return Math.max(
    0,
    number,
  );
}

function normalizeEarningMode(
  value: unknown,
): EarningMode {
  return value ===
    'tier_percentage'
    ? 'tier_percentage'
    : 'fixed_ratio';
}

function normalizeTierBasis(
  value: unknown,
): TierBasis {
  return value ===
    'lifetime_points'
    ? 'lifetime_points'
    : 'lifetime_spending';
}

function normalizeTierCode(
  value: unknown,
): string {
  return normalizeString(value)
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      '-',
    )
    .replace(
      /^-+|-+$/g,
      '',
    )
    .slice(0, 30);
}

async function getAuthPayload():
Promise<AuthPayload | null> {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      'ekasir_session',
    )?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } =
      await jwtVerify(
        token,
        SECRET_KEY,
      );

    return payload as AuthPayload;
  } catch {
    return null;
  }
}

async function resolveAdminScope(
  slug: string,
  branchSlug: string | null,
) {
  const payload =
    await getAuthPayload();

  if (!payload) {
    return {
      error:
        jsonError(
          401,
          'Sesi admin tidak ditemukan atau sudah berakhir.',
        ),
    };
  }

  const role =
    normalizeString(
      payload.role,
    ).toLowerCase();

  if (role !== 'owner') {
    return {
      error:
        jsonError(
          403,
          'Hanya Owner yang dapat mengubah konfigurasi loyalty.',
        ),
    };
  }

  if (
    payload.slug &&
    payload.slug !== slug
  ) {
    return {
      error:
        jsonError(
          403,
          'Sesi admin tidak sesuai dengan mitra ini.',
        ),
    };
  }

  const [foundMitra] =
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

  if (
    !foundMitra ||
    Number(
      payload.mitraId,
    ) !==
      Number(
        foundMitra.id,
      )
  ) {
    return {
      error:
        jsonError(
          403,
          'Mitra tidak ditemukan atau akses ditolak.',
        ),
    };
  }

  let branchId:
    number | null =
    null;

  if (branchSlug) {
    const [foundBranch] =
      await db
        .select({
          id:
            branches.id,
        })
        .from(branches)
        .where(
          and(
            eq(
              branches.mitra_id,
              foundMitra.id,
            ),
            eq(
              branches.branch_slug,
              branchSlug,
            ),
            isNull(
              branches.deletedAt,
            ),
          ),
        )
        .limit(1);

    if (!foundBranch) {
      return {
        error:
          jsonError(
            404,
            'Cabang tidak ditemukan.',
          ),
      };
    }

    branchId =
      Number(
        foundBranch.id,
      );
  }

  return {
    payload,
    mitraId:
      Number(
        foundMitra.id,
      ),
    branchId,
  };
}

function getBranchConditionSql(
  branchId: number | null,
) {
  return branchId === null
    ? sql`IS NULL`
    : sql`= ${branchId}`;
}

function mapSettingsRow(
  row:
    RawSettingsRow | undefined,
) {
  return {
    isEnabled:
      Boolean(
        row?.points_enabled ??
          0,
      ),

    earningMode:
      row?.points_earning_mode ??
      'fixed_ratio',

    tierBasis:
      row?.points_tier_basis ??
      'lifetime_spending',

    earningAmount:
      Number(
        row?.points_earn_rate ??
          10000,
      ),

    earningPoints:
      Number(
        row?.points_earn_points ??
          1,
      ),

    minimumTransaction:
      Number(
        row?.points_minimum_transaction ??
          10000,
      ),

    maximumPointsPerOrder:
      row?.points_maximum_earn_per_order ??
      null,

    redemptionValue:
      Number(
        row?.points_redeem_rate ??
          1000,
      ),

    minimumRedeemPoints:
      Number(
        row?.points_minimum_redeem ??
          10,
      ),

    maximumRedeemPoints:
      row?.points_maximum_redeem ??
      null,

    maximumRedeemPercentage:
      Number(
        row?.points_max_discount_percent ??
          50,
      ),

    allowWithCoupon:
      Boolean(
        row?.points_allow_with_coupon ??
          0,
      ),

    expirationEnabled:
      Boolean(
        row?.points_expiration_enabled ??
          0,
      ),

    expirationDays:
      Number(
        row?.points_expiration_days ??
          365,
      ),
  };
}

function mapTierRow(
  row: RawTierRow,
) {
  return {
    id:
      String(row.id),
    name:
      row.name,
    code:
      row.code,
    minimumSpending:
      Number(
        row.minimum_spending ??
          0,
      ),
    minimumLifetimePoints:
      Number(
        row.minimum_lifetime_points ??
          0,
      ),
    earningPercentage:
      Number(
        row.earning_percentage ??
          0,
      ),
    sortOrder:
      Number(
        row.sort_order ??
          0,
      ),
    isActive:
      Boolean(
        row.is_active,
      ),
  };
}

export async function GET(
  request: Request,
): Promise<Response> {
  const { searchParams } =
    new URL(request.url);

  const slug =
    normalizeString(
      searchParams.get(
        'slug',
      ),
    );

  const branchSlug =
    normalizeNullableString(
      searchParams.get(
        'branch_slug',
      ),
    );

  if (!slug) {
    return jsonError(
      400,
      'Slug mitra diperlukan.',
    );
  }

  try {
    const scope =
      await resolveAdminScope(
        slug,
        branchSlug,
      );

    if ('error' in scope) {
      return scope.error;
    }

    const {
      mitraId,
      branchId,
    } = scope;

    const branchCondition =
      getBranchConditionSql(
        branchId,
      );

    const [
      settingsRows,
    ] =
      await db.execute(
        sql`
          SELECT
            id,
            mitra_id,
            branch_id,
            points_enabled,
            points_earning_mode,
            points_earn_rate,
            points_earn_points,
            points_minimum_transaction,
            points_maximum_earn_per_order,
            points_tier_basis,
            points_redeem_rate,
            points_minimum_redeem,
            points_maximum_redeem,
            points_max_discount_percent,
            points_allow_with_coupon,
            points_expiration_enabled,
            points_expiration_days
          FROM settings
          WHERE mitra_id =
            ${mitraId}
            AND branch_id
              ${branchCondition}
          ORDER BY id DESC
          LIMIT 1
        `,
      ) as MysqlExecuteResult<
        RawSettingsRow[]
      >;

    const [
      tierRows,
    ] =
      await db.execute(
        sql`
          SELECT
            id,
            mitra_id,
            branch_id,
            name,
            code,
            minimum_spending,
            minimum_lifetime_points,
            earning_percentage,
            sort_order,
            is_active
          FROM loyalty_tiers
          WHERE mitra_id =
            ${mitraId}
            AND branch_id
              ${branchCondition}
            AND deleted_at
              IS NULL
          ORDER BY
            sort_order ASC,
            id ASC
        `,
      ) as MysqlExecuteResult<
        RawTierRow[]
      >;

    const [
      statsRows,
    ] =
      await db.execute(
        sql`
          SELECT
            (
              SELECT
                COALESCE(
                  SUM(lp.points),
                  0
                )
              FROM loyalty_points lp
              WHERE lp.mitra_id =
                ${mitraId}
                AND lp.branch_id
                  ${branchCondition}
                AND lp.deleted_at
                  IS NULL
            )
              AS points_in_circulation,

            (
              SELECT
                COUNT(*)
              FROM loyalty_points lp
              WHERE lp.mitra_id =
                ${mitraId}
                AND lp.branch_id
                  ${branchCondition}
                AND lp.points > 0
                AND lp.deleted_at
                  IS NULL
            )
              AS members_with_points,

            (
              SELECT
                COUNT(*)
              FROM member_point_ledgers mpl
              WHERE mpl.mitra_id =
                ${mitraId}
                AND mpl.branch_id
                  ${branchCondition}
            )
              AS point_transactions
        `,
      ) as MysqlExecuteResult<
        RawStatsRow[]
      >;

    const stats =
      statsRows[0];

    return NextResponse.json({
      success: true,
      data: {
        mitraId,
        branchId,
        settings:
          mapSettingsRow(
            settingsRows[0],
          ),
        tiers:
          tierRows.map(
            mapTierRow,
          ),
        stats: {
          pointsInCirculation:
            Number(
              stats?.points_in_circulation ??
                0,
            ),
          membersWithPoints:
            Number(
              stats?.members_with_points ??
                0,
            ),
          pointTransactions:
            Number(
              stats?.point_transactions ??
                0,
            ),
        },
      },
    });
  } catch (error) {
    console.error(
      '[LOYALTY_SETTINGS_GET_ERROR]',
      error,
    );

    return jsonError(
      500,
      'Gagal mengambil konfigurasi loyalty.',
    );
  }
}

export async function PUT(
  request: Request,
): Promise<Response> {
  let body:
    LoyaltyRequestBody;

  try {
    body =
      await request.json() as
        LoyaltyRequestBody;
  } catch {
    return jsonError(
      400,
      'Payload JSON tidak valid.',
    );
  }

  const slug =
    normalizeString(
      body.mitraSlug,
    );

  const branchSlug =
    normalizeNullableString(
      body.branchSlug,
    );

  if (!slug) {
    return jsonError(
      400,
      'Slug mitra diperlukan.',
    );
  }

  if (
    !body.settings ||
    !Array.isArray(
      body.tiers,
    )
  ) {
    return jsonError(
      400,
      'Settings dan tiers diperlukan.',
    );
  }

  try {
    const scope =
      await resolveAdminScope(
        slug,
        branchSlug,
      );

    if ('error' in scope) {
      return scope.error;
    }

    const {
      mitraId,
      branchId,
    } = scope;

    const settings =
      body.settings;

    const earningMode =
      normalizeEarningMode(
        settings.earningMode,
      );

    const tierBasis =
      normalizeTierBasis(
        settings.tierBasis,
      );

    const normalizedTiers =
      body.tiers.map(
        (
          tier,
          index,
        ) => {
          const name =
            normalizeString(
              tier.name,
            );

          const code =
            normalizeTierCode(
              tier.code ||
              name,
            );

          return {
            name,
            code,
            minimumSpending:
              normalizeNonNegativeInteger(
                tier.minimumSpending,
              ),
            minimumLifetimePoints:
              normalizeNonNegativeInteger(
                tier.minimumLifetimePoints,
              ),
            earningPercentage:
              Math.min(
                100,
                normalizeDecimal(
                  tier.earningPercentage,
                ),
              ),
            sortOrder:
              index + 1,
            isActive:
              normalizeBoolean(
                tier.isActive,
              ),
          };
        },
      );

    if (
      earningMode ===
        'tier_percentage' &&
      normalizedTiers.filter(
        (tier) =>
          tier.isActive,
      ).length === 0
    ) {
      return jsonError(
        400,
        'Aktifkan minimal satu tier.',
      );
    }

    if (
      normalizedTiers.some(
        (tier) =>
          !tier.name ||
          !tier.code,
      )
    ) {
      return jsonError(
        400,
        'Nama dan kode tier tidak boleh kosong.',
      );
    }

    const tierCodes =
      normalizedTiers.map(
        (tier) =>
          tier.code,
      );

    if (
      new Set(
        tierCodes,
      ).size !==
      tierCodes.length
    ) {
      return jsonError(
        400,
        'Kode tier tidak boleh sama.',
      );
    }

    const pointsEnabled =
      normalizeBoolean(
        settings.isEnabled,
      )
        ? 1
        : 0;

    const earningAmount =
      normalizePositiveInteger(
        settings.earningAmount,
        10000,
      );

    const earningPoints =
      normalizePositiveInteger(
        settings.earningPoints,
        1,
      );

    const minimumTransaction =
      normalizeNonNegativeInteger(
        settings.minimumTransaction,
      );

    const maximumEarnPerOrder =
      normalizeNullablePositiveInteger(
        settings.maximumPointsPerOrder,
      );

    const redemptionValue =
      normalizePositiveInteger(
        settings.redemptionValue,
        1000,
      );

    const minimumRedeem =
      normalizePositiveInteger(
        settings.minimumRedeemPoints,
        10,
      );

    const maximumRedeem =
      normalizeNullablePositiveInteger(
        settings.maximumRedeemPoints,
      );

    const maximumDiscountPercent =
      Math.min(
        100,
        Math.max(
          1,
          normalizeDecimal(
            settings.maximumRedeemPercentage,
            50,
          ),
        ),
      );

    const allowWithCoupon =
      normalizeBoolean(
        settings.allowWithCoupon,
      )
        ? 1
        : 0;

    const expirationEnabled =
      normalizeBoolean(
        settings.expirationEnabled,
      )
        ? 1
        : 0;

    const expirationDays =
      expirationEnabled
        ? normalizePositiveInteger(
            settings.expirationDays,
            365,
          )
        : null;

    const branchCondition =
      getBranchConditionSql(
        branchId,
      );

    await db.transaction(
      async (tx) => {
        const [
          existingRows,
        ] =
          await tx.execute(
            sql`
              SELECT id
              FROM settings
              WHERE mitra_id =
                ${mitraId}
                AND branch_id
                  ${branchCondition}
              ORDER BY id DESC
              LIMIT 1
            `,
          ) as MysqlExecuteResult<
            Array<{
              id: number;
            }>
          >;

        const existingSettings =
          existingRows[0];

        if (
          existingSettings
        ) {
          await tx.execute(
            sql`
              UPDATE settings
              SET
                points_enabled =
                  ${pointsEnabled},
                points_earning_mode =
                  ${earningMode},
                points_earn_rate =
                  ${earningAmount},
                points_earn_points =
                  ${earningPoints},
                points_minimum_transaction =
                  ${minimumTransaction},
                points_maximum_earn_per_order =
                  ${maximumEarnPerOrder},
                points_tier_basis =
                  ${tierBasis},
                points_redeem_rate =
                  ${redemptionValue},
                points_minimum_redeem =
                  ${minimumRedeem},
                points_maximum_redeem =
                  ${maximumRedeem},
                points_max_discount_percent =
                  ${maximumDiscountPercent},
                points_allow_with_coupon =
                  ${allowWithCoupon},
                points_expiration_enabled =
                  ${expirationEnabled},
                points_expiration_days =
                  ${expirationDays},
                points_updated_at =
                  CURRENT_TIMESTAMP,
                updated_at =
                  CURRENT_TIMESTAMP
              WHERE id =
                ${existingSettings.id}
            `,
          );
        } else {
          await tx.execute(
            sql`
              INSERT INTO settings (
                mitra_id,
                branch_id,
                points_enabled,
                points_earning_mode,
                points_earn_rate,
                points_earn_points,
                points_minimum_transaction,
                points_maximum_earn_per_order,
                points_tier_basis,
                points_redeem_rate,
                points_minimum_redeem,
                points_maximum_redeem,
                points_max_discount_percent,
                points_allow_with_coupon,
                points_expiration_enabled,
                points_expiration_days,
                points_require_paid_order,
                points_include_tax_service,
                points_updated_at,
                created_at,
                updated_at
              )
              VALUES (
                ${mitraId},
                ${branchId},
                ${pointsEnabled},
                ${earningMode},
                ${earningAmount},
                ${earningPoints},
                ${minimumTransaction},
                ${maximumEarnPerOrder},
                ${tierBasis},
                ${redemptionValue},
                ${minimumRedeem},
                ${maximumRedeem},
                ${maximumDiscountPercent},
                ${allowWithCoupon},
                ${expirationEnabled},
                ${expirationDays},
                1,
                0,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
              )
            `,
          );
        }

        /*
         * Soft-delete konfigurasi tier lama agar histori dan referensi
         * tier lama tidak langsung hilang.
         */
        await tx.execute(
          sql`
            UPDATE loyalty_tiers
            SET
              deleted_at =
                CURRENT_TIMESTAMP,
              updated_at =
                CURRENT_TIMESTAMP
            WHERE mitra_id =
              ${mitraId}
              AND branch_id
                ${branchCondition}
              AND deleted_at
                IS NULL
          `,
        );

        for (
          const tier of
          normalizedTiers
        ) {
          await tx.execute(
            sql`
              INSERT INTO loyalty_tiers (
                mitra_id,
                branch_id,
                name,
                code,
                minimum_spending,
                minimum_lifetime_points,
                earning_percentage,
                sort_order,
                is_active,
                created_at,
                updated_at,
                deleted_at
              )
              VALUES (
                ${mitraId},
                ${branchId},
                ${tier.name},
                ${tier.code},
                ${tier.minimumSpending},
                ${tier.minimumLifetimePoints},
                ${tier.earningPercentage},
                ${tier.sortOrder},
                ${
                  tier.isActive
                    ? 1
                    : 0
                },
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP,
                NULL
              )
            `,
          );
        }
      },
    );

    return NextResponse.json({
      success: true,
      message:
        'Konfigurasi loyalty dan tier berhasil disimpan.',
    });
  } catch (error) {
    console.error(
      '[LOYALTY_SETTINGS_PUT_ERROR]',
      error,
    );

    return jsonError(
      500,
      'Gagal menyimpan konfigurasi loyalty.',
    );
  }
}