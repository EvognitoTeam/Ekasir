import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  jwtVerify,
  type JWTPayload,
} from 'jose';
import { db } from '@/db';
import {
  coupon,
  mitra,
  orderItems,
  orders,
  products,
  tableList,
} from '@/db/schema';
import {
  and,
  desc,
  eq,
  isNull,
  sql,
  type SQL,
} from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SECRET_KEY =
  new TextEncoder().encode(
    process.env.JWT_SECRET ||
      'rahasia-super-aman-evokasir-2026',
  );

type AuthPayload =
  JWTPayload & {
    userId?: number;
    mitraId?: number;
    branchId?: number | null;
    slug?: string;
    role?: string;
  };

type MysqlExecuteResult<T> = [
  T,
  unknown,
];

type LockedOrderRow = {
  id: number;
  order_code: string;
  mitra_id: number;
  branch_id: number | null;
  user_id: number | null;
  cashier_id: number | null;
  status:
    | 'pending'
    | 'confirmed'
    | 'preparing'
    | 'ready'
    | 'completed'
    | 'cancelled';
  payment_status:
    | '1'
    | '2'
    | '3'
    | '4';
  total_price: string | number;
  discount: string | number | null;
  total_after_discount:
    | string
    | number
    | null;
  tax: string | number;
  service: string | number;
  points_discount:
    | string
    | number;
  points_earned: number;
  points_awarded_at:
    Date | string | null;
};

type PointSettingsRow = {
  id: number;
  points_enabled: number;
  points_earning_mode:
    | 'fixed_ratio'
    | 'tier_percentage';
  points_earn_rate:
    string | number;
  points_earn_points: number;
  points_minimum_transaction:
    string | number;
  points_maximum_earn_per_order:
    number | null;
  points_tier_basis:
    | 'lifetime_spending'
    | 'lifetime_points';
  points_redeem_rate:
    string | number;
  points_require_paid_order: number;
  points_include_tax_service: number;
  points_expiration_enabled: number;
  points_expiration_days:
    number | null;
};

type LoyaltyBalanceRow = {
  id: number;
  points: number;
  tier_id: number | null;
  lifetime_points_earned: number;
  lifetime_points_redeemed: number;
  lifetime_spending:
    string | number;
};

type LoyaltyTierRow = {
  id: number;
  name: string;
  earning_percentage:
    string | number;
  minimum_spending:
    string | number;
  minimum_lifetime_points:
    number;
};

type MemberIdentityRow = {
  member_id: string | null;
};

type AwardResult = {
  processed: boolean;
  awarded: boolean;
  points: number;
  tierName: string | null;
  reason: string;
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
  return String(
    value ?? '',
  ).trim();
}

function normalizeInteger(
  value: unknown,
): number {
  const number =
    Number(value ?? 0);

  if (
    !Number.isFinite(
      number,
    )
  ) {
    return 0;
  }

  return Math.floor(
    number,
  );
}

function isBranchScopedRole(
  role?: string,
) {
  const normalized =
    normalizeString(
      role,
    ).toLowerCase();

  return (
    normalized ===
      'cashier' ||
    normalized ===
      'kitchen'
  );
}

function branchCondition(
  branchId?: number | null,
): SQL {
  return branchId == null
    ? isNull(
        orders.branch_id,
      )
    : eq(
        orders.branch_id,
        Number(branchId),
      );
}

function rawBranchCondition(
  branchId:
    number | null,
) {
  return branchId === null
    ? sql`IS NULL`
    : sql`= ${branchId}`;
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

    return payload as
      AuthPayload;
  } catch {
    return null;
  }
}

async function getCashierOrderScope(
  slug: string,
) {
  const payload =
    await getAuthPayload();

  if (!payload) {
    return {
      error:
        jsonError(
          401,
          'Sesi kasir tidak ditemukan atau sudah berakhir.',
        ),
    };
  }

  if (
    payload.slug !== slug
  ) {
    return {
      error:
        jsonError(
          403,
          'Sesi kasir tidak sesuai dengan toko ini.',
        ),
    };
  }

  const role =
    normalizeString(
      payload.role,
    ).toLowerCase();

  if (
    ![
      'owner',
      'cashier',
      'kitchen',
    ].includes(role)
  ) {
    return {
      error:
        jsonError(
          403,
          'Akun tidak memiliki akses operasional.',
        ),
    };
  }

  const foundMitra =
    await db
      .select({
        id:
          mitra.id,
      })
      .from(mitra)
      .where(
        eq(
          mitra.mitra_slug,
          slug,
        ),
      )
      .limit(1);

  if (
    foundMitra.length ===
      0 ||
    Number(
      payload.mitraId,
    ) !==
      Number(
        foundMitra[0].id,
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

  const conditions:
    SQL[] = [
      eq(
        orders.mitra_id,
        foundMitra[0].id,
      ),
    ];

  if (
    isBranchScopedRole(
      payload.role,
    )
  ) {
    conditions.push(
      branchCondition(
        payload.branchId,
      ),
    );
  }

  return {
    payload,
    mitraId:
      Number(
        foundMitra[0].id,
      ),
    condition:
      and(
        ...conditions,
      ) as SQL,
  };
}

async function loadPointSettings(
  tx: any,
  mitraId: number,
  branchId:
    number | null,
): Promise<
  PointSettingsRow | null
> {
  const [
    branchRows,
  ] =
    await tx.execute(
      sql`
        SELECT
          id,
          points_enabled,
          points_earning_mode,
          points_earn_rate,
          points_earn_points,
          points_minimum_transaction,
          points_maximum_earn_per_order,
          points_tier_basis,
          points_redeem_rate,
          points_require_paid_order,
          points_include_tax_service,
          points_expiration_enabled,
          points_expiration_days
        FROM settings
        WHERE mitra_id =
          ${mitraId}
          AND branch_id
            ${rawBranchCondition(
              branchId,
            )}
        ORDER BY id DESC
        LIMIT 1
      `,
    ) as MysqlExecuteResult<
      PointSettingsRow[]
    >;

  if (branchRows[0]) {
    return branchRows[0];
  }

  /*
   * Bila cabang belum memiliki override,
   * gunakan konfigurasi global mitra.
   */
  if (
    branchId !== null
  ) {
    const [
      globalRows,
    ] =
      await tx.execute(
        sql`
          SELECT
            id,
            points_enabled,
            points_earning_mode,
            points_earn_rate,
            points_earn_points,
            points_minimum_transaction,
            points_maximum_earn_per_order,
            points_tier_basis,
            points_redeem_rate,
            points_require_paid_order,
            points_include_tax_service,
            points_expiration_enabled,
            points_expiration_days
          FROM settings
          WHERE mitra_id =
            ${mitraId}
            AND branch_id
              IS NULL
          ORDER BY id DESC
          LIMIT 1
        `,
      ) as MysqlExecuteResult<
        PointSettingsRow[]
      >;

    return (
      globalRows[0] ??
      null
    );
  }

  return null;
}

async function loadMemberIdentity(
  tx: any,
  userId: number,
  mitraId: number,
): Promise<MemberIdentityRow | null> {
  const [
    rows,
  ] =
    await tx.execute(
      sql`
        SELECT
          member_id
        FROM users
        WHERE id =
          ${userId}
          AND mitra_id =
            ${mitraId}
          AND deleted_at
            IS NULL
        LIMIT 1
      `,
    ) as MysqlExecuteResult<
      MemberIdentityRow[]
    >;

  return rows[0] ?? null;
}

async function loadCurrentBalance(
  tx: any,
  userId: number,
  mitraId: number,
  branchId:
    number | null,
): Promise<
  LoyaltyBalanceRow | null
> {
  const [
    rows,
  ] =
    await tx.execute(
      sql`
        SELECT
          id,
          points,
          tier_id,
          lifetime_points_earned,
          lifetime_points_redeemed,
          lifetime_spending
        FROM loyalty_points
        WHERE user_id =
          ${userId}
          AND mitra_id =
            ${mitraId}
          AND branch_id
            ${rawBranchCondition(
              branchId,
            )}
          AND deleted_at
            IS NULL
        ORDER BY id ASC
        LIMIT 1
        FOR UPDATE
      `,
    ) as MysqlExecuteResult<
      LoyaltyBalanceRow[]
    >;

  return (
    rows[0] ??
    null
  );
}

async function loadQualifiedTier(
  tx: any,
  mitraId: number,
  branchId:
    number | null,
  tierBasis:
    | 'lifetime_spending'
    | 'lifetime_points',
  lifetimeSpending:
    number,
  lifetimePoints:
    number,
): Promise<
  LoyaltyTierRow | null
> {
  const thresholdCondition =
    tierBasis ===
    'lifetime_points'
      ? sql`
          minimum_lifetime_points
            <= ${lifetimePoints}
        `
      : sql`
          minimum_spending
            <= ${lifetimeSpending}
        `;

  const [
    scopedRows,
  ] =
    await tx.execute(
      sql`
        SELECT
          id,
          name,
          earning_percentage,
          minimum_spending,
          minimum_lifetime_points
        FROM loyalty_tiers
        WHERE mitra_id =
          ${mitraId}
          AND branch_id
            ${rawBranchCondition(
              branchId,
            )}
          AND is_active = 1
          AND deleted_at
            IS NULL
          AND ${thresholdCondition}
        ORDER BY
          ${
            tierBasis ===
            'lifetime_points'
              ? sql`
                  minimum_lifetime_points
                    DESC
                `
              : sql`
                  minimum_spending
                    DESC
                `
          },
          sort_order DESC,
          id DESC
        LIMIT 1
      `,
    ) as MysqlExecuteResult<
      LoyaltyTierRow[]
    >;

  if (scopedRows[0]) {
    return scopedRows[0];
  }

  if (
    branchId !== null
  ) {
    const [
      globalRows,
    ] =
      await tx.execute(
        sql`
          SELECT
            id,
            name,
            earning_percentage,
            minimum_spending,
            minimum_lifetime_points
          FROM loyalty_tiers
          WHERE mitra_id =
            ${mitraId}
            AND branch_id
              IS NULL
            AND is_active = 1
            AND deleted_at
              IS NULL
            AND ${thresholdCondition}
          ORDER BY
            ${
              tierBasis ===
              'lifetime_points'
                ? sql`
                    minimum_lifetime_points
                      DESC
                  `
                : sql`
                    minimum_spending
                      DESC
                  `
            },
            sort_order DESC,
            id DESC
          LIMIT 1
        `,
      ) as MysqlExecuteResult<
        LoyaltyTierRow[]
      >;

    return (
      globalRows[0] ??
      null
    );
  }

  return null;
}

function calculateEligibleAmount(
  order:
    LockedOrderRow,
  includeTaxService:
    boolean,
): number {
  const subtotal =
    normalizeInteger(
      order.total_price,
    );

  const discount =
    Math.max(
      0,
      normalizeInteger(
        order.discount,
      ),
    );

  const pointDiscount =
    Math.max(
      0,
      normalizeInteger(
        order.points_discount,
      ),
    );

  if (
    includeTaxService
  ) {
    return Math.max(
      0,
      normalizeInteger(
        order.total_after_discount,
      ) -
        pointDiscount,
    );
  }

  return Math.max(
    0,
    subtotal -
      discount -
      pointDiscount,
  );
}

function calculateEarnedPoints({
  settings,
  eligibleAmount,
  tier,
}: {
  settings:
    PointSettingsRow;
  eligibleAmount:
    number;
  tier:
    LoyaltyTierRow | null;
}) {
  if (
    eligibleAmount <
    normalizeInteger(
      settings.points_minimum_transaction,
    )
  ) {
    return {
      points: 0,
      snapshotRate: 0,
    };
  }

  let points = 0;
  let snapshotRate = 0;

  if (
    settings.points_earning_mode ===
    'tier_percentage'
  ) {
    if (!tier) {
      return {
        points: 0,
        snapshotRate: 0,
      };
    }

    const percentage =
      Math.max(
        0,
        Number(
          tier.earning_percentage ??
            0,
        ),
      );

    const pointValue =
      Math.max(
        1,
        normalizeInteger(
          settings.points_redeem_rate,
        ),
      );

    const rewardRupiah =
      Math.floor(
        eligibleAmount *
          (
            percentage /
            100
          ),
      );

    points =
      Math.floor(
        rewardRupiah /
          pointValue,
      );

    snapshotRate =
      percentage;
  } else {
    const amountRate =
      Math.max(
        1,
        normalizeInteger(
          settings.points_earn_rate,
        ),
      );

    const pointsPerRate =
      Math.max(
        1,
        normalizeInteger(
          settings.points_earn_points,
        ),
      );

    points =
      Math.floor(
        eligibleAmount /
          amountRate,
      ) *
      pointsPerRate;

    snapshotRate =
      amountRate;
  }

  const maximumPoints =
    settings
      .points_maximum_earn_per_order;

  if (
    maximumPoints !==
      null &&
    Number(maximumPoints) >
      0
  ) {
    points =
      Math.min(
        points,
        Number(
          maximumPoints,
        ),
      );
  }

  return {
    points:
      Math.max(
        0,
        Math.floor(
          points,
        ),
      ),
    snapshotRate,
  };
}

async function awardOrderPoints(
  tx: any,
  order:
    LockedOrderRow,
  finalStatus: string,
  finalPaymentStatus:
    string,
  now: Date,
): Promise<AwardResult> {
  if (
    finalStatus !==
    'completed'
  ) {
    return {
      processed: false,
      awarded: false,
      points: 0,
      tierName: null,
      reason:
        'Order belum completed.',
    };
  }

  if (
    order.points_awarded_at
  ) {
    return {
      processed: true,
      awarded:
        Number(
          order.points_earned,
        ) > 0,
      points:
        Number(
          order.points_earned,
        ),
      tierName: null,
      reason:
        'Order sudah pernah diproses untuk poin.',
    };
  }

  if (!order.user_id) {
    return {
      processed: false,
      awarded: false,
      points: 0,
      tierName: null,
      reason:
        'Order guest tidak memiliki user_id.',
    };
  }

  const settings =
    await loadPointSettings(
      tx,
      order.mitra_id,
      order.branch_id,
    );

  if (
    !settings ||
    Number(
      settings.points_enabled,
    ) !== 1
  ) {
    return {
      processed: false,
      awarded: false,
      points: 0,
      tierName: null,
      reason:
        'Program poin tidak aktif.',
    };
  }

  const requirePaid =
    Number(
      settings.points_require_paid_order,
    ) === 1;

  if (
    requirePaid &&
    finalPaymentStatus !==
      '2'
  ) {
    return {
      processed: false,
      awarded: false,
      points: 0,
      tierName: null,
      reason:
        'Order belum berstatus lunas.',
    };
  }

  const eligibleAmount =
    calculateEligibleAmount(
      order,
      Number(
        settings.points_include_tax_service,
      ) === 1,
    );

  let balance =
    await loadCurrentBalance(
      tx,
      order.user_id,
      order.mitra_id,
      order.branch_id,
    );

  if (!balance) {
    const memberIdentity =
      await loadMemberIdentity(
        tx,
        order.user_id,
        order.mitra_id,
      );

    const memberId =
      normalizeString(
        memberIdentity?.member_id,
      );

    if (!memberId) {
      return {
        processed: false,
        awarded: false,
        points: 0,
        tierName: null,
        reason:
          'User belum memiliki member_id.',
      };
    }

    await tx.execute(
      sql`
        INSERT INTO loyalty_points (
          user_id,
          mitra_id,
          branch_id,
          tier_id,
          points,
          member_id,
          lifetime_points_earned,
          lifetime_points_redeemed,
          lifetime_spending,
          last_earned_at,
          last_redeemed_at,
          created_at,
          updated_at,
          deleted_at
        )
        VALUES (
          ${order.user_id},
          ${order.mitra_id},
          ${order.branch_id},
          NULL,
          0,
          ${memberId},
          0,
          0,
          0,
          NULL,
          NULL,
          ${now},
          ${now},
          NULL
        )
      `,
    );

    balance =
      await loadCurrentBalance(
        tx,
        order.user_id,
        order.mitra_id,
        order.branch_id,
      );
  }

  if (!balance) {
    throw new Error(
      'Saldo loyalty gagal dibuat.',
    );
  }

  /*
   * Tier untuk order ini ditentukan dari histori sebelum order saat ini.
   * Setelah order selesai, lifetime spending bertambah dan tier berikutnya
   * dapat naik untuk transaksi selanjutnya.
   */
  const currentTier =
    settings.points_earning_mode ===
    'tier_percentage'
      ? await loadQualifiedTier(
          tx,
          order.mitra_id,
          order.branch_id,
          settings.points_tier_basis,
          normalizeInteger(
            balance.lifetime_spending,
          ),
          Number(
            balance.lifetime_points_earned,
          ),
        )
      : null;

  const calculation =
    calculateEarnedPoints({
      settings,
      eligibleAmount,
      tier:
        currentTier,
    });

  const points =
    calculation.points;

  const balanceBefore =
    Number(
      balance.points,
    );

  const balanceAfter =
    balanceBefore +
    points;

  const newLifetimeSpending =
    normalizeInteger(
      balance.lifetime_spending,
    ) +
    eligibleAmount;

  const newLifetimePoints =
    Number(
      balance.lifetime_points_earned,
    ) +
    points;

  const nextTier =
    settings.points_earning_mode ===
    'tier_percentage'
      ? await loadQualifiedTier(
          tx,
          order.mitra_id,
          order.branch_id,
          settings.points_tier_basis,
          newLifetimeSpending,
          newLifetimePoints,
        )
      : null;

  await tx.execute(
    sql`
      UPDATE loyalty_points
      SET
        points =
          ${balanceAfter},
        tier_id =
          ${nextTier?.id ?? currentTier?.id ?? null},
        lifetime_points_earned =
          ${newLifetimePoints},
        lifetime_spending =
          ${newLifetimeSpending},
        last_earned_at =
          ${
            points > 0
              ? now
              : null
          },
        updated_at =
          ${now}
      WHERE id =
        ${balance.id}
    `,
  );

  if (
    points > 0
  ) {
    const idempotencyKey =
      `earn-order-${order.id}`;

    const expiresAt =
      Number(
        settings.points_expiration_enabled,
      ) === 1 &&
      Number(
        settings.points_expiration_days,
      ) > 0
        ? new Date(
            now.getTime() +
              Number(
                settings.points_expiration_days,
              ) *
                24 *
                60 *
                60 *
                1000,
          )
        : null;

    const rupiahValue =
      points *
      Math.max(
        1,
        normalizeInteger(
          settings.points_redeem_rate,
        ),
      );

    await tx.execute(
      sql`
        INSERT INTO member_point_ledgers (
          mitra_id,
          branch_id,
          user_id,
          tier_id,
          order_id,
          cashier_id,
          type,
          earning_mode,
          earning_rate_snapshot,
          points,
          balance_before,
          balance_after,
          rupiah_value,
          expires_at,
          expired_at,
          reversed_ledger_id,
          description,
          metadata,
          idempotency_key,
          created_at,
          updated_at
        )
        VALUES (
          ${order.mitra_id},
          ${order.branch_id},
          ${order.user_id},
          ${currentTier?.id ?? null},
          ${order.id},
          ${order.cashier_id},
          'earn',
          ${settings.points_earning_mode},
          ${calculation.snapshotRate},
          ${points},
          ${balanceBefore},
          ${balanceAfter},
          ${rupiahValue},
          ${expiresAt},
          NULL,
          NULL,
          ${
            `Poin dari order ${order.order_code}`
          },
          ${JSON.stringify({
            eligibleAmount,
            tierName:
              currentTier?.name ??
              null,
          })},
          ${idempotencyKey},
          ${now},
          ${now}
        )
      `,
    );
  }

  /*
   * points_awarded_at juga diisi saat hasilnya 0 supaya order yang sama
   * tidak dihitung ulang setelah konfigurasi loyalty berubah.
   */
  await tx.execute(
    sql`
      UPDATE orders
      SET
        points_earned =
          ${points},
        points_awarded_at =
          ${now},
        points_earning_mode =
          ${settings.points_earning_mode},
        points_earning_rate_snapshot =
          ${calculation.snapshotRate},
        points_tier_id =
          ${currentTier?.id ?? null},
        updated_at =
          ${now}
      WHERE id =
        ${order.id}
    `,
  );

  return {
    processed: true,
    awarded:
      points > 0,
    points,
    tierName:
      currentTier?.name ??
      null,
    reason:
      points > 0
        ? 'Poin berhasil diberikan.'
        : 'Order diproses tetapi tidak menghasilkan poin.',
  };
}

export async function GET(
  request: Request,
) {
  const { searchParams } =
    new URL(request.url);

  const userId =
    searchParams.get(
      'userId',
    );

  const slug =
    searchParams.get(
      'slug',
    );

  if (
    !userId &&
    !slug
  ) {
    return jsonError(
      400,
      'User ID atau Slug Toko diperlukan.',
    );
  }

  try {
    let queryCondition:
      SQL;

    if (slug) {
      const scope =
        await getCashierOrderScope(
          slug,
        );

      if (
        'error' in scope
      ) {
        return scope.error;
      }

      queryCondition =
        scope.condition;
    } else {
      queryCondition =
        eq(
          orders.user_id,
          Number(userId),
        );
    }

    const userOrders =
      await db
        .select({
          id:
            orders.id,
          order_code:
            orders.order_code,
          branch_id:
            orders.branch_id,
          total_price:
            orders.total_price,
          totalPrice:
            orders.total_price,
          total_after_discount:
            orders.totalAfterDiscount,
          discount:
            orders.discount,
          discount_id:
            orders.discountId,
          status:
            orders.status,
          createdAt:
            orders.createdAt,
          created_at:
            orders.createdAt,
          coupon_code:
            coupon.coupon_code,
          table_name:
            tableList.table_name,
          table_number:
            orders.table_number,
          manual_table_info:
            orders.manual_table_info,
          manualTableInfo:
            orders.manual_table_info,
          paymentStatus:
            orders.payment_status,
          paymentMethod:
            orders.payment_method,
          customerName:
            orders.name,
        })
        .from(orders)
        .leftJoin(
          coupon,
          eq(
            orders.discountId,
            coupon.id,
          ),
        )
        .leftJoin(
          tableList,
          eq(
            orders.table_number,
            tableList.id,
          ),
        )
        .where(
          queryCondition,
        )
        .orderBy(
          desc(
            orders.createdAt,
          ),
        );

    const historyWithItems =
      await Promise.all(
        userOrders.map(
          async (order) => {
            /*
             * Checkout website saat ini belum selalu mengisi branch_id
             * pada order_items. Query item cukup dikunci oleh order_id.
             */
            const items =
              await db
                .select()
                .from(
                  orderItems,
                )
                .where(
                  eq(
                    orderItems.order_id,
                    order.id,
                  ),
                );

            const itemsWithParsedNotes =
              items.map(
                (item) => {
                  let parsedAddOns:
                    unknown[] = [];

                  if (
                    item.notes
                  ) {
                    if (
                      typeof item.notes ===
                      'string'
                    ) {
                      if (
                        item.notes !==
                          '[]' &&
                        item.notes !==
                          ''
                      ) {
                        try {
                          const parsed =
                            JSON.parse(
                              item.notes,
                            );

                          parsedAddOns =
                            Array.isArray(
                              parsed,
                            )
                              ? parsed
                              : [
                                  parsed,
                                ];
                        } catch {
                          console.error(
                            `Gagal parse notes untuk item ID ${item.id}`,
                          );
                        }
                      }
                    } else if (
                      typeof item.notes ===
                      'object'
                    ) {
                      parsedAddOns =
                        Array.isArray(
                          item.notes,
                        )
                          ? item.notes
                          : [
                              item.notes,
                            ];
                    }
                  }

                  return {
                    ...item,
                    menuItemId:
                      String(
                        item.product_id,
                      ),
                    selectedAddOnsDetails:
                      parsedAddOns,
                  };
                },
              );

            const normalizedManualTableInfo =
              normalizeString(
                order.manual_table_info,
              ).toLowerCase();

            const isTakeaway =
              [
                'takeaway',
                'take away',
                'bungkus',
              ].includes(
                normalizedManualTableInfo,
              );

            return {
              ...order,
              orderType:
                isTakeaway
                  ? 'takeaway'
                  : 'dine-in',
              order_type:
                isTakeaway
                  ? 'takeaway'
                  : 'dine-in',
              serviceType:
                isTakeaway
                  ? 'takeaway'
                  : 'dine_in',
              service_type:
                isTakeaway
                  ? 'takeaway'
                  : 'dine_in',
              adminNotes:
                '',
              items:
                itemsWithParsedNotes,
            };
          },
        ),
      );

    return NextResponse.json({
      success: true,
      data:
        historyWithItems,
    });
  } catch (error) {
    console.error(
      '[ORDERS_GET_ERROR]',
      error,
    );

    return jsonError(
      500,
      'Gagal mengambil data pesanan.',
    );
  }
}

export async function PUT(
  request: Request,
) {
  const { searchParams } =
    new URL(request.url);

  const slug =
    searchParams.get(
      'slug',
    );

  if (!slug) {
    return jsonError(
      400,
      'Slug Toko diperlukan.',
    );
  }

  try {
    const scope =
      await getCashierOrderScope(
        slug,
      );

    if (
      'error' in scope
    ) {
      return scope.error;
    }

    const body =
      await request.json();

    const {
      orderId,
      status,
      paymentStatus,
      adminNotes,
      getPayment,
      cashChange,
    } = body;

    const numericOrderId =
      Number(orderId);

    if (
      !Number.isInteger(
        numericOrderId,
      ) ||
      numericOrderId <= 0
    ) {
      return jsonError(
        400,
        'ID Pesanan diperlukan.',
      );
    }

    const targetCondition =
      and(
        eq(
          orders.id,
          numericOrderId,
        ),
        scope.condition,
      );

    const targetOrder =
      await db
        .select({
          id:
            orders.id,
        })
        .from(orders)
        .where(
          targetCondition,
        )
        .limit(1);

    if (
      targetOrder.length ===
      0
    ) {
      return jsonError(
        404,
        'Pesanan tidak ditemukan pada scope kasir ini.',
      );
    }

    let pointResult:
      AwardResult = {
        processed: false,
        awarded: false,
        points: 0,
        tierName: null,
        reason:
          'Belum diproses.',
      };

    await db.transaction(
      async (tx) => {
        const [
          lockedRows,
        ] =
          await tx.execute(
            sql`
              SELECT
                id,
                order_code,
                mitra_id,
                branch_id,
                user_id,
                cashier_id,
                status,
                payment_status,
                total_price,
                discount,
                totalAfterDiscount
                  AS total_after_discount,
                tax,
                service,
                points_discount,
                points_earned,
                points_awarded_at
              FROM orders
              WHERE id =
                ${numericOrderId}
                AND mitra_id =
                  ${scope.mitraId}
              LIMIT 1
              FOR UPDATE
            `,
          ) as MysqlExecuteResult<
            LockedOrderRow[]
          >;

        const lockedOrder =
          lockedRows[0];

        if (!lockedOrder) {
          throw new Error(
            'Order tidak ditemukan saat transaksi dikunci.',
          );
        }

        const now =
          new Date();

        const finalStatus =
          status
            ? normalizeString(
                status,
              )
            : lockedOrder.status;

        let finalPaymentStatus =
          paymentStatus
            ? normalizeString(
                paymentStatus,
              )
            : lockedOrder.payment_status;

        const updateData:
          Record<
            string,
            unknown
          > = {
            updatedAt:
              now,
          };

        if (
          paymentStatus
        ) {
          updateData.payment_status =
            finalPaymentStatus;

          if (
            finalPaymentStatus ===
            '2'
          ) {
            updateData.paymentPaidAt =
              now;
          }
        }

        if (
          adminNotes !==
          undefined
        ) {
          updateData.admin_notes =
            adminNotes;
        }

        if (
          getPayment !==
            undefined &&
          getPayment !==
            null
        ) {
          updateData.getPayment =
            String(
              getPayment,
            );
        }

        if (
          cashChange !==
            undefined &&
          cashChange !==
            null
        ) {
          updateData.cashChange =
            String(
              cashChange,
            );

          updateData.payment_status =
            '2';

          updateData.paymentPaidAt =
            now;

          finalPaymentStatus =
            '2';
        }

        if (status) {
          updateData.status =
            finalStatus;

          if (
            finalStatus ===
            'confirmed'
          ) {
            updateData.confirmedAt =
              now;
          }

          if (
            finalStatus ===
            'preparing'
          ) {
            updateData.preparingAt =
              now;
          }

          if (
            finalStatus ===
              'ready' ||
            finalStatus ===
              'completed'
          ) {
            updateData.readyAt =
              now;
          }

          if (
            finalStatus ===
            'completed'
          ) {
            updateData.completedAt =
              now;
          }

          if (
            finalStatus ===
            'cancelled'
          ) {
            updateData.cancelledAt =
              now;
          }
        }

        await tx
          .update(orders)
          .set(
            updateData,
          )
          .where(
            targetCondition,
          );

        const isFirstConfirmation =
          finalStatus ===
            'confirmed' &&
          lockedOrder.status !==
            'confirmed';

        if (
          isFirstConfirmation
        ) {
          const items =
            await tx
              .select()
              .from(
                orderItems,
              )
              .where(
                eq(
                  orderItems.order_id,
                  numericOrderId,
                ),
              );

          for (
            const item of
            items
          ) {
            await tx
              .update(
                products,
              )
              .set({
                stock:
                  sql`
                    ${products.stock}
                    -
                    ${item.quantity}
                  `,
              })
              .where(
                eq(
                  products.id,
                  item.product_id,
                ),
              );
          }
        }

        pointResult =
          await awardOrderPoints(
            tx,
            lockedOrder,
            finalStatus,
            finalPaymentStatus,
            now,
          );
      },
    );

    return NextResponse.json({
      success: true,
      message:
        pointResult.awarded
          ? `Data pesanan diperbarui dan ${pointResult.points} poin diberikan.`
          : 'Data pesanan berhasil diperbarui.',
      loyalty: pointResult,
    });
  } catch (error) {
    console.error(
      '[ORDERS_PUT_ERROR]',
      error,
    );

    return jsonError(
      500,
      error instanceof Error
        ? error.message
        : 'Gagal memperbarui data pesanan.',
    );
  }
}