import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  jwtVerify,
  type JWTPayload,
} from 'jose';
import { requirePosAuth } from '@/lib/auth/posAuth';
import {
  reverseOrder,
  type ReverseOrderResult,
} from '@/lib/orders/reverseOrder';
import {
  queueTableIoT,
  queueTablePagerIoT,
} from '@/lib/iot/publish';
import { db } from '@/db';
import {
  coupon,
  orderItems,
  orders,
  products,
  tableList,
  settings,
} from '@/db/schema';
import {
  and,
  desc,
  eq,
  gte,
  inArray,
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
  confirmed_at:
    Date | string | null;
  preparing_at:
    Date | string | null;
  ready_at:
    Date | string | null;
  completed_at:
    Date | string | null;
  cancelled_at:
    Date | string | null;
  payment_paid_at:
    Date | string | null;
  table_number:
    number | null;
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

type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';

type PaymentStatus = '1' | '2' | '3' | '4';

class OrderUpdateError extends Error {
  status: number;
  code: string;
  details: unknown;

  constructor(
    status: number,
    message: string,
    code: string,
    details: unknown = null,
  ) {
    super(message);
    this.name = 'OrderUpdateError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function normalizeOrderStatus(value: unknown): OrderStatus | null {
  const status = normalizeString(value).toLowerCase();

  if (
    status === 'pending' ||
    status === 'confirmed' ||
    status === 'preparing' ||
    status === 'ready' ||
    status === 'completed' ||
    status === 'cancelled'
  ) {
    return status;
  }

  return null;
}

function normalizePaymentStatus(value: unknown): PaymentStatus | null {
  const status = normalizeString(value);
  return status === '1' || status === '2' || status === '3' || status === '4'
    ? status
    : null;
}

function isValidCashierTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
): boolean {
  if (currentStatus === nextStatus) {
    return true;
  }

  const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };

  return transitions[currentStatus].includes(nextStatus);
}

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

type ParsedAddonDetail = {
  id?: number | string;
  name: string;
  price: number;
  customer_note?: string;
  cust_notes?: string;
};

function parseRepeatedJson(
  value: unknown,
): unknown {
  let current = value;

  for (
    let attempt = 0;
    attempt < 5;
    attempt += 1
  ) {
    if (
      typeof current !==
      'string'
    ) {
      return current;
    }

    const trimmed =
      current.trim();

    if (!trimmed) {
      return [];
    }

    try {
      current =
        JSON.parse(
          trimmed,
        );
    } catch {
      return current;
    }
  }

  return current;
}

function parseStoredAddons(
  value: unknown,
): ParsedAddonDetail[] {
  const parsed =
    parseRepeatedJson(
      value,
    );

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.reduce<
    ParsedAddonDetail[]
  >(
    (
      result,
      rawAddon,
    ) => {
      if (
        !rawAddon ||
        typeof rawAddon !==
          'object' ||
        Array.isArray(
          rawAddon,
        )
      ) {
        return result;
      }

      const addon =
        rawAddon as
          Record<
            string,
            unknown
          >;

      const name =
        normalizeString(
          addon.name ??
          addon.addon_name ??
          addon.addOnName ??
          addon.label,
        );

      const customerNote =
        normalizeString(
          addon.customer_note ??
          addon.customerNote ??
          addon.cust_notes ??
          addon.note,
        );

      if (
        !name &&
        !customerNote
      ) {
        return result;
      }

      const normalized:
        ParsedAddonDetail = {
          name:
            name ||
            `Note: ${customerNote}`,
          price:
            Math.max(
              0,
              normalizeInteger(
                addon.price ??
                addon.addon_price ??
                addon.addonPrice,
              ),
            ),
        };

      const addonId =
        addon.id ??
        addon.addon_id ??
        addon.addonId;

      if (
        addonId !==
          undefined &&
        addonId !==
          null &&
        addonId !==
          ''
      ) {
        normalized.id =
          typeof addonId ===
            'number'
            ? addonId
            : normalizeString(
                addonId,
              );
      }

      if (customerNote) {
        normalized.customer_note =
          customerNote;
        normalized.cust_notes =
          customerNote;
      }

      result.push(
        normalized,
      );

      return result;
    },
    [],
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
  const auth = await requirePosAuth({
    roles: [
      'Owner',
      'Cashier',
      'Kitchen',
    ],
  });

  if (!auth.ok) {
    return {
      error: auth.response,
    };
  }

  const { session } = auth;

  if (session.slug !== slug) {
    return {
      error: jsonError(
        403,
        'Sesi operasional tidak sesuai dengan toko ini.',
      ),
    };
  }

  const conditions: SQL[] = [
    eq(
      orders.mitra_id,
      session.mitraId,
    ),
    isNull(
      orders.deletedAt,
    ),
  ];

  /*
   * Preserve behaviour KALOO POS:
   * - Owner dapat memantau seluruh mitra.
   * - Cashier dan Kitchen hanya cabang pada session.
   */
  if (
    session.role === 'Cashier' ||
    session.role === 'Kitchen'
  ) {
    conditions.push(
      branchCondition(
        session.branchId,
      ),
    );
  }

  return {
    session,
    mitraId: session.mitraId,
    branchId: session.branchId,
    condition: and(
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
          points_expiration_days,
          is_tax_included
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
            points_expiration_days,
            is_tax_included
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
  settings: PointSettingsRow;
  eligibleAmount: number;
  tier: LoyaltyTierRow | null;
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
    settings.points_maximum_earn_per_order;

  if (
    maximumPoints !== null &&
    Number(maximumPoints) > 0
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

  const userIdRaw =
    searchParams.get(
      'userId',
    );

  const slug =
    searchParams.get(
      'slug',
    );

  const statusFilter =
    normalizeString(
      searchParams.get(
        'status',
      ),
    ).toLowerCase();

  if (
    !userIdRaw &&
    !slug
  ) {
    return jsonError(
      400,
      'User ID atau Slug Toko diperlukan.',
    );
  }

  try {
    let queryCondition: SQL;

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

      if (
        statusFilter ===
        'active'
      ) {
        queryCondition =
          and(
            queryCondition,
            inArray(
              orders.status,
              [
                'pending',
                'confirmed',
                'preparing',
                'ready',
              ],
            ),
          ) as SQL;
      }
    } else {
      const numericUserId =
        Number(userIdRaw);

      if (
        !Number.isInteger(
          numericUserId,
        ) ||
        numericUserId <= 0
      ) {
        return jsonError(
          400,
          'User ID tidak valid.',
        );
      }

      /*
       * Customer history tidak boleh dapat dibaca hanya dengan menebak userId.
       * Pastikan cookie session adalah User yang sama.
       */
      const payload =
        await getAuthPayload();

      const sessionUserId =
        Number(
          payload?.userId ?? 0,
        );

      const sessionRole =
        normalizeString(
          payload?.role,
        ).toLowerCase();

      if (
        !payload ||
        sessionRole !==
          'user' ||
        sessionUserId !==
          numericUserId
      ) {
        return jsonError(
          403,
          'Anda tidak memiliki akses ke riwayat pesanan ini.',
        );
      }

      const customerConditions: SQL[] = [
        eq(
          orders.user_id,
          numericUserId,
        ),
        isNull(
          orders.deletedAt,
        ),
      ];

      const sessionMitraId =
        Number(
          payload.mitraId ?? 0,
        );

      if (
        Number.isInteger(
          sessionMitraId,
        ) &&
        sessionMitraId > 0
      ) {
        customerConditions.push(
          eq(
            orders.mitra_id,
            sessionMitraId,
          ),
        );
      }

      queryCondition =
        and(
          ...customerConditions,
        ) as SQL;
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
          couponCode:
            coupon.coupon_code,
          voucher_code:
            coupon.coupon_code,
          voucherCode:
            coupon.coupon_code,
          table_name:
            tableList.table_name,
          table_number:
            orders.table_number,
          manual_table_info:
            orders.manual_table_info,
          manualTableInfo:
            orders.manual_table_info,
          tax:
            orders.tax,
          service:
            orders.service,
          serviceCharge:
            orders.service,
          is_tax_included:
            sql<number>`
              COALESCE(
                (
                  SELECT
                    s.is_tax_included
                  FROM settings AS s
                  WHERE
                    s.mitra_id =
                      ${orders.mitra_id}
                    AND (
                      s.branch_id =
                        ${orders.branch_id}
                      OR s.branch_id
                        IS NULL
                    )
                  ORDER BY
                    CASE
                      WHEN s.branch_id =
                        ${orders.branch_id}
                      THEN 0
                      ELSE 1
                    END,
                    s.id DESC
                  LIMIT 1
                ),
                0
              )
            `,
          isTaxIncluded:
            sql<number>`
              COALESCE(
                (
                  SELECT
                    s.is_tax_included
                  FROM settings AS s
                  WHERE
                    s.mitra_id =
                      ${orders.mitra_id}
                    AND (
                      s.branch_id =
                        ${orders.branch_id}
                      OR s.branch_id
                        IS NULL
                    )
                  ORDER BY
                    CASE
                      WHEN s.branch_id =
                        ${orders.branch_id}
                      THEN 0
                      ELSE 1
                    END,
                    s.id DESC
                  LIMIT 1
                ),
                0
              )
            `,
          paymentStatus:
            orders.payment_status,
          paymentMethod:
            orders.payment_method,
          payment_method:
            orders.payment_method,
          getPayment:
            orders.getPayment,
          get_payment:
            orders.getPayment,
          cashChange:
            orders.cashChange,
          cash_change:
            orders.cashChange,
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

    if (
      userOrders.length === 0
    ) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    /*
     * Hindari N+1:
     * semua order item diambil sekali lalu dikelompokkan di memory.
     */
    const orderIds =
      userOrders.map(
        (order) =>
          Number(order.id),
      );

    const allItems =
      await db
        .select()
        .from(
          orderItems,
        )
        .where(
          and(
            inArray(
              orderItems.order_id,
              orderIds,
            ),
            isNull(
              orderItems.deletedAt,
            ),
          ),
        );

    const itemsByOrder =
      new Map<
        number,
        typeof allItems
      >();

    for (
      const item of
      allItems
    ) {
      const orderId =
        Number(
          item.order_id,
        );

      const list =
        itemsByOrder.get(
          orderId,
        ) ?? [];

      list.push(item);

      itemsByOrder.set(
        orderId,
        list,
      );
    }

    const historyWithItems =
      userOrders.map(
        (order) => {
          const items =
            itemsByOrder.get(
              Number(
                order.id,
              ),
            ) ?? [];

          const itemsWithParsedNotes =
            items.map(
              (item) => {
                const parsedAddOns =
                  parseStoredAddons(
                    item.notes,
                  );

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

          const manualIsTakeaway =
            [
              'takeaway',
              'take away',
              'take_away',
              'bungkus',
            ].includes(
              normalizedManualTableInfo,
            );

          const hasPhysicalTable =
            Boolean(
              order.table_number,
            );

          const resolvedTableLabel =
            hasPhysicalTable
              ? (
                  order.table_name ||
                  String(
                    order.table_number,
                  )
                )
              : (
                  order.manual_table_info ||
                  null
                );

          return {
            ...order,
            tableLabel:
              resolvedTableLabel,
            table_label:
              resolvedTableLabel,
            orderType:
              manualIsTakeaway
                ? 'takeaway'
                : 'dine-in',
            order_type:
              manualIsTakeaway
                ? 'takeaway'
                : 'dine-in',
            serviceType:
              manualIsTakeaway
                ? 'takeaway'
                : 'dine_in',
            service_type:
              manualIsTakeaway
                ? 'takeaway'
                : 'dine_in',
            adminNotes:
              '',
            items:
              itemsWithParsedNotes,
          };
        },
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
    normalizeString(
      searchParams.get(
        'slug',
      ),
    );

  if (!slug) {
    return jsonError(
      400,
      'Slug Toko diperlukan.',
    );
  }

  /*
   * Flow front-of-house KALOO POS:
   * Owner adalah mode pantau pada Cashier UI.
   * Perubahan order dari route ini dilakukan Cashier.
   * Kitchen mempunyai endpoint sendiri dan berhenti di ready.
   */
  const auth =
    await requirePosAuth({
      roles: [
        'Cashier',
      ],
    });

  if (!auth.ok) {
    return auth.response;
  }

  const { session } = auth;

  if (
    session.slug !== slug
  ) {
    return jsonError(
      403,
      'Sesi kasir tidak sesuai dengan toko ini.',
    );
  }

  try {
    let body: {
      orderId?: unknown;
      status?: unknown;
      paymentStatus?: unknown;
      adminNotes?: unknown;
      getPayment?: unknown;
      cashChange?: unknown;
      cancelReason?: unknown;
      soundPager?: unknown;
    };

    try {
      body =
        await request.json() as {
          orderId?: unknown;
          status?: unknown;
          paymentStatus?: unknown;
          adminNotes?: unknown;
          getPayment?: unknown;
          cashChange?: unknown;
          cancelReason?: unknown;
          soundPager?: unknown;
        };
    } catch {
      return jsonError(
        400,
        'Request body harus berupa JSON yang valid.',
      );
    }

    const numericOrderId =
      Number(
        body.orderId,
      );

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

    const requestedStatus =
      body.status ===
        undefined
        ? null
        : normalizeOrderStatus(
            body.status,
          );

    if (
      body.status !==
        undefined &&
      requestedStatus === null
    ) {
      return jsonError(
        400,
        'Status pesanan tidak valid.',
      );
    }

    const requestedPaymentStatus =
      body.paymentStatus ===
        undefined
        ? null
        : normalizePaymentStatus(
            body.paymentStatus,
          );

    if (
      body.paymentStatus !==
        undefined &&
      requestedPaymentStatus ===
        null
    ) {
      return jsonError(
        400,
        'Status pembayaran tidak valid.',
      );
    }

    /*
     * Scope Cashier SELALU mengikuti mitra + branch dari session.
     * slug hanya validasi tambahan, bukan sumber scope database.
     */
    const targetConditions: SQL[] = [
      eq(
        orders.id,
        numericOrderId,
      ),
      eq(
        orders.mitra_id,
        session.mitraId,
      ),
      isNull(
        orders.deletedAt,
      ),
      branchCondition(
        session.branchId,
      ),
    ];

    const targetCondition =
      and(
        ...targetConditions,
      ) as SQL;

    const [targetOrder] =
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

    if (!targetOrder) {
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

    let reversalResult:
      ReverseOrderResult | null =
        null;

    const tableIoTSyncRef: {
      current:
        | {
            tableId: number;
            orderCode: string;
            reason: string;
          }
        | null;
    } = {
      current: null,
    };

    const tablePagerCommandRef: {
      current:
        | {
            tableId: number;
            active: boolean;
            reason: string;
          }
        | null;
    } = {
      current: null,
    };

    await db.transaction(
      async (tx) => {
        const [lockedRows] =
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
                points_awarded_at,
                confirmed_at,
                preparing_at,
                ready_at,
                completed_at,
                cancelled_at,
                payment_paid_at,
                table_number
              FROM orders
              WHERE id =
                ${numericOrderId}
                AND mitra_id =
                  ${session.mitraId}
                AND branch_id
                  ${rawBranchCondition(
                    session.branchId,
                  )}
                AND deleted_at
                  IS NULL
              LIMIT 1
              FOR UPDATE
            `,
          ) as unknown as MysqlExecuteResult<
            LockedOrderRow[]
          >;

        const lockedOrder =
          lockedRows[0];

        if (!lockedOrder) {
          throw new OrderUpdateError(
            404,
            'Order tidak ditemukan saat transaksi dikunci.',
            'ORDER_NOT_FOUND',
          );
        }

        /*
         * IoT tidak menerima state buatan dari route ini.
         * Kita hanya mengingat meja yang perlu di-sync. Setelah transaksi
         * commit, gateway 3010 akan membaca ulang DB dan mengirim full snapshot.
         */
        if (lockedOrder.table_number) {
          tableIoTSyncRef.current = {
            tableId:
              lockedOrder.table_number,
            orderCode:
              lockedOrder.order_code,
            reason:
              'cashier-order-updated',
          };
        }

        const now =
          new Date();

        const finalStatus: OrderStatus =
          requestedStatus ??
          lockedOrder.status;

        let finalPaymentStatus: PaymentStatus =
          requestedPaymentStatus ??
          lockedOrder.payment_status;

        if (
          requestedStatus !== null &&
          !isValidCashierTransition(
            lockedOrder.status,
            requestedStatus,
          )
        ) {
          throw new OrderUpdateError(
            409,
            'Perubahan status pesanan tidak diperbolehkan untuk flow Cashier.',
            'INVALID_ORDER_STATUS_TRANSITION',
            {
              currentStatus: lockedOrder.status,
              requestedStatus,
            },
          );
        }

        if (
          requestedStatus === 'completed' &&
          finalPaymentStatus !== '2'
        ) {
          throw new OrderUpdateError(
            409,
            'Pesanan harus berstatus lunas sebelum diselesaikan.',
            'ORDER_NOT_PAID',
            {
              paymentStatus: finalPaymentStatus,
            },
          );
        }

        /**
         * ==================================================
         * CANCEL / REVERSAL
         * ==================================================
         *
         * Semua side-effect cancel dipusatkan di reverseOrder().
         * Kitchen tidak menggunakan route ini.
         *
         * pending:
         * - addon + coupon + table
         *
         * confirmed:
         * - product + addon + coupon + table
         *
         * preparing / ready:
         * - product TIDAK direstore otomatis
         * - addon + coupon + table
         */
        if (
          requestedStatus ===
          'cancelled'
        ) {
          if (
            lockedOrder.status ===
            'completed'
          ) {
            throw new OrderUpdateError(
              409,
              'Order completed tidak dapat dibatalkan dengan flow cancel biasa.',
              'COMPLETED_ORDER_REQUIRES_REFUND',
            );
          }

          const cancelReason =
            normalizeString(
              body.cancelReason ??
              body.adminNotes,
            ) ||
            'Dibatalkan oleh kasir';

          reversalResult =
            await reverseOrder({
              tx,
              order: {
                id:
                  lockedOrder.id,
                orderCode:
                  lockedOrder.order_code,
                mitraId:
                  lockedOrder.mitra_id,
                branchId:
                  lockedOrder.branch_id,
                tableId:
                  lockedOrder.table_number,
                status:
                  lockedOrder.status,
                confirmedAt:
                  lockedOrder.confirmed_at,
              },
              reason:
                cancelReason,
              source:
                'cashier',
              now,
            });

          if (
            body.adminNotes !==
            undefined
          ) {
            await tx
              .update(
                orders,
              )
              .set({
                admin_notes:
                  normalizeString(
                    body.adminNotes,
                  ) ||
                  null,
                updatedAt:
                  now,
              })
              .where(
                targetCondition,
              );
          }

          if (
            reversalResult.tableId
          ) {
            tableIoTSyncRef.current = {
              tableId:
                reversalResult.tableId,
              orderCode:
                reversalResult.orderCode,
              reason:
                reversalResult.tableReleased
                  ? 'cashier-order-cancelled-table-released'
                  : 'cashier-order-cancelled',
            };

            tablePagerCommandRef.current = {
              tableId:
                reversalResult.tableId,
              active:
                false,
              reason:
                'cashier-order-cancelled',
            };
          }

          pointResult = {
            processed:
              false,
            awarded:
              false,
            points:
              0,
            tierName:
              null,
            reason:
              'Order dibatalkan, poin tidak diberikan.',
          };

          return;
        }

        const updateData:
          Partial<
            typeof orders.$inferInsert
          > = {
            updatedAt:
              now,
          };

        if (
          requestedPaymentStatus !==
          null
        ) {
          updateData.payment_status =
            requestedPaymentStatus;

          if (
            requestedPaymentStatus ===
              '2' &&
            lockedOrder.payment_status !==
              '2' &&
            !lockedOrder.payment_paid_at
          ) {
            updateData.paymentPaidAt =
              now;
          }
        }

        if (
          body.adminNotes !==
          undefined
        ) {
          updateData.admin_notes =
            normalizeString(
              body.adminNotes,
            ) || null;
        }

        if (
          body.getPayment !==
            undefined &&
          body.getPayment !==
            null
        ) {
          const amount =
            Number(
              body.getPayment,
            );

          if (
            !Number.isFinite(
              amount,
            ) ||
            amount < 0
          ) {
            throw new OrderUpdateError(
              400,
              'Nominal pembayaran tidak valid.',
              'INVALID_GET_PAYMENT',
            );
          }

          updateData.getPayment =
            String(
              Math.floor(
                amount,
              ),
            );
        }

        if (
          body.cashChange !==
            undefined &&
          body.cashChange !==
            null
        ) {
          const change =
            Number(
              body.cashChange,
            );

          if (
            !Number.isFinite(
              change,
            ) ||
            change < 0
          ) {
            throw new OrderUpdateError(
              400,
              'Nominal kembalian tidak valid.',
              'INVALID_CASH_CHANGE',
            );
          }

          updateData.cashChange =
            String(
              Math.floor(
                change,
              ),
            );

          updateData.payment_status =
            '2';

          finalPaymentStatus =
            '2';

          if (
            lockedOrder.payment_status !==
              '2' &&
            !lockedOrder.payment_paid_at
          ) {
            updateData.paymentPaidAt =
              now;
          }
        }

        if (
          requestedStatus !==
          null
        ) {
          updateData.status =
            requestedStatus;

          /*
           * Timestamp tidak ditulis ulang saat retry status yang sama.
           * confirmedAt juga menjadi marker first confirmation / stock deduction.
           */
          if (
            requestedStatus ===
              'confirmed' &&
            !lockedOrder.confirmed_at
          ) {
            updateData.confirmedAt =
              now;
          }

          if (
            requestedStatus ===
              'preparing' &&
            !lockedOrder.preparing_at
          ) {
            updateData.preparingAt =
              now;
          }

          if (
            requestedStatus ===
              'ready' &&
            !lockedOrder.ready_at
          ) {
            updateData.readyAt =
              now;
          }

          /*
           * completed hanya mengisi completedAt.
           * readyAt adalah tanggung jawab Kitchen saat order menjadi ready.
           */
          if (
            requestedStatus ===
              'completed' &&
            lockedOrder.status !==
              'completed'
          ) {
            updateData.completedAt =
              now;
          }

          /*
           * Pager dipisahkan dari status order.
           *
           * Untuk READY:
           * - soundPager = true  -> pager ON
           * - soundPager = false -> pager OFF
           *
           * Bila caller lama tidak mengirim soundPager,
           * pertahankan behaviour lama: pager ON.
           */
          if (
            requestedStatus ===
              'ready' &&
            lockedOrder.table_number
          ) {
            const shouldSoundPager =
              body.soundPager ===
                undefined
                ? true
                : body.soundPager ===
                  true;

            tablePagerCommandRef.current = {
              tableId:
                lockedOrder.table_number,
              active:
                shouldSoundPager,
              reason:
                shouldSoundPager
                  ? 'cashier-ready-with-pager'
                  : 'cashier-ready-silent',
            };
          }

          if (
            requestedStatus ===
              'completed' &&
            lockedOrder.table_number
          ) {
            tablePagerCommandRef.current = {
              tableId:
                lockedOrder.table_number,
              active:
                false,
              reason:
                'cashier-order-completed',
            };
          }

        }

        /*
         * FIRST CONFIRMATION
         * ------------------
         * Jangan memakai lockedOrder.status !== 'confirmed', karena request
         * retry / undo dapat membuat stok terpotong berkali-kali.
         * confirmed_at adalah marker bahwa first-confirmation pernah diproses.
         */
        const isFirstConfirmation =
          finalStatus ===
            'confirmed' &&
          !lockedOrder.confirmed_at;

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
                and(
                  eq(
                    orderItems.order_id,
                    numericOrderId,
                  ),
                  isNull(
                    orderItems.deletedAt,
                  ),
                ),
              );

          for (
            const item of
            items
          ) {
            const productConditions: SQL[] = [
              eq(
                products.id,
                item.product_id,
              ),
              eq(
                products.mitra_id,
                lockedOrder.mitra_id,
              ),
              eq(
                products.status,
                1,
              ),
              isNull(
                products.deletedAt,
              ),
              gte(
                products.stock,
                item.quantity,
              ),
            ];

            productConditions.push(
              lockedOrder.branch_id ===
                null
                ? isNull(
                    products.branch_id,
                  )
                : eq(
                    products.branch_id,
                    lockedOrder.branch_id,
                  ),
            );

            const stockResult =
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
                  and(
                    ...productConditions,
                  ),
                );

            const header =
              stockResult[0] as {
                affectedRows?: number;
              };

            if (
              Number(
                header?.affectedRows ??
                  0,
              ) === 0
            ) {
              throw new OrderUpdateError(
                409,
                'Stok produk tidak mencukupi atau produk sudah tidak tersedia.',
                'PRODUCT_STOCK_NOT_AVAILABLE',
                {
                  productId:
                    item.product_id,
                  quantity:
                    item.quantity,
                  branchId:
                    lockedOrder.branch_id,
                },
              );
            }
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

        /*
         * Order COMPLETED tidak otomatis me-release meja.
         *
         * Source of truth status meja adalah table_list.status:
         * 1 = available
         * 2 = occupied
         * 3 = reserved
         *
         * Jadi ready -> completed hanya menutup lifecycle order.
         * Jika table_list.status masih 2, IoT harus tetap menampilkan
         * OCCUPIED sampai endpoint/service meja mengubah status menjadi 1.
         */
        if (
          requestedStatus === 'completed' &&
          lockedOrder.table_number
        ) {
          tableIoTSyncRef.current = {
            tableId:
              lockedOrder.table_number,
            orderCode:
              lockedOrder.order_code,
            reason:
              'cashier-order-completed',
          };
        }

        if (
          tableIoTSyncRef.current &&
          tableIoTSyncRef.current.reason ===
            'cashier-order-updated'
        ) {
          if (
            requestedStatus !== null
          ) {
            tableIoTSyncRef.current.reason =
              `cashier-status:${requestedStatus}`;
          } else if (
            requestedPaymentStatus !== null ||
            body.cashChange !== undefined
          ) {
            tableIoTSyncRef.current.reason =
              `cashier-payment:${finalPaymentStatus}`;
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

    /*
     * Jalankan setelah DB transaction commit.
     *
     * Next.js tidak perlu mengetahui apakah ESP32 sedang online.
     * Gateway 3010 akan membaca state terbaru dari DB lalu mengirim snapshot
     * ke device yang terhubung. Bila gateway/device sedang offline, operasi
     * kasir tetap berhasil dan device akan self-heal saat reconnect.
     */
    const tableIoTSync =
      tableIoTSyncRef.current;

    const tablePagerCommand =
      tablePagerCommandRef.current;

    if (
      tablePagerCommand
    ) {
      /*
       * table-pager endpoint langsung membangun snapshot terbaru setelah
       * DB commit, sehingga READY + pilihan bunyi/tidak bunyi sinkron.
       */
      queueTablePagerIoT(
        tablePagerCommand.tableId,
        tablePagerCommand.active,
        tablePagerCommand.reason,
        'order_ready',
      );
    } else if (
      tableIoTSync
    ) {
      queueTableIoT(
        tableIoTSync.tableId,
        tableIoTSync.reason,
      );
    }

    return NextResponse.json({
      success: true,
      message:
        pointResult.awarded
          ? `Data pesanan diperbarui dan ${pointResult.points} poin diberikan.`
          : 'Data pesanan berhasil diperbarui.',
      loyalty:
        pointResult,
      reversal:
        reversalResult,
    });
  } catch (error) {
    console.error(
      '[ORDERS_PUT_ERROR]',
      error,
    );

    if (
      error instanceof
      OrderUpdateError
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            error.message,
          error: {
            code:
              error.code,
            details:
              error.details,
          },
        },
        {
          status:
            error.status,
        },
      );
    }

    return jsonError(
      500,
      error instanceof Error
        ? error.message
        : 'Gagal memperbarui data pesanan.',
    );
  }
}
