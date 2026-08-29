import { db } from '@/db';
import {
  addons,
  coupon,
  couponUsages,
  orderItems,
  orders,
  products,
  tableList,
} from '@/db/schema';

import {
  and,
  eq,
  inArray,
  isNull,
  ne,
  sql,
} from 'drizzle-orm';

export type OrderTransaction =
  Parameters<
    Parameters<
      typeof db.transaction
    >[0]
  >[0];

export type ReversibleOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'cancelled';

export type ReverseOrderSource =
  | 'cashier'
  | 'midtrans';

export type ReverseOrderTarget = {
  id: number;
  orderCode: string;
  mitraId: number;
  branchId: number | null;
  tableId: number | null;
  status: ReversibleOrderStatus;

  /**
   * Dipakai sebagai informasi tambahan.
   *
   * Product stock hanya otomatis dikembalikan
   * jika status order saat dibatalkan = confirmed.
   *
   * preparing / ready tidak direstore otomatis
   * karena produk mungkin sudah diproses dapur.
   */
  confirmedAt?: Date | string | null;
};

export type ReverseOrderResult = {
  alreadyCancelled: boolean;

  restoredProductStock: boolean;
  restoredProductQuantity: number;

  restoredAddonStock: boolean;
  restoredAddonQuantity: number;

  restoredCouponUsage: boolean;
  restoredCouponUsageCount: number;

  tableReleased: boolean;
  tableId: number | null;

  orderCode: string;
};

export type ReverseOrderOptions = {
  tx: OrderTransaction;
  order: ReverseOrderTarget;

  /**
   * Alasan maksimal akan dipotong menjadi 255 karakter.
   */
  reason: string;

  source: ReverseOrderSource;

  now?: Date;

  /**
   * Midtrans dapat sekaligus menetapkan payment_status = 3.
   * Cashier biasanya membiarkan status pembayaran apa adanya.
   */
  paymentStatus?: '1' | '2' | '3' | '4';

  /**
   * Untuk webhook yang baru menerima transaction_id.
   */
  transactionId?: string | null;
};

function normalizeString(
  value: unknown,
): string {
  return String(
    value ?? '',
  ).trim();
}

function toPositiveInteger(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isInteger(
      parsed,
    ) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
}

function parseRepeatedJson(
  value: unknown,
): unknown {
  let current =
    value;

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
      return [];
    }
  }

  return current;
}

function parseAddonIds(
  value: unknown,
): number[] {
  const parsed =
    parseRepeatedJson(
      value,
    );

  if (!Array.isArray(parsed)) {
    return [];
  }

  const ids: number[] =
    [];

  for (
    const rawAddon of
    parsed
  ) {
    if (
      !rawAddon ||
      typeof rawAddon !==
        'object' ||
      Array.isArray(
        rawAddon,
      )
    ) {
      continue;
    }

    const addon =
      rawAddon as Record<
        string,
        unknown
      >;

    const addonId =
      toPositiveInteger(
        addon.id ??
        addon.addon_id ??
        addon.addonId,
      );

    if (addonId) {
      ids.push(
        addonId,
      );
    }
  }

  return ids;
}

function orderBranchCondition(
  branchId: number | null,
) {
  return branchId === null
    ? isNull(
        orders.branch_id,
      )
    : eq(
        orders.branch_id,
        branchId,
      );
}

function productBranchCondition(
  branchId: number | null,
) {
  return branchId === null
    ? isNull(
        products.branch_id,
      )
    : eq(
        products.branch_id,
        branchId,
      );
}

function addonBranchCondition(
  branchId: number | null,
) {
  return branchId === null
    ? isNull(
        addons.branch_id,
      )
    : eq(
        addons.branch_id,
        branchId,
      );
}

function tableBranchCondition(
  branchId: number | null,
) {
  return branchId === null
    ? isNull(
        tableList.branch_id,
      )
    : eq(
        tableList.branch_id,
        branchId,
      );
}

/**
 * ==========================================================
 * RESTORE PRODUCT STOCK
 * ==========================================================
 *
 * HANYA dipanggil ketika status order yang dibatalkan
 * masih `confirmed`.
 *
 * preparing / ready tidak otomatis direstore karena produk
 * mungkin sudah mulai / selesai diproduksi dapur.
 */
async function restoreProductStocks(
  tx: OrderTransaction,
  order: ReverseOrderTarget,
  now: Date,
): Promise<number> {
  const items =
    await tx
      .select({
        productId:
          orderItems.product_id,
        quantity:
          orderItems.quantity,
      })
      .from(
        orderItems,
      )
      .where(
        and(
          eq(
            orderItems.order_id,
            order.id,
          ),
          isNull(
            orderItems.deletedAt,
          ),
        ),
      );

  const quantityByProduct =
    new Map<
      number,
      number
    >();

  for (
    const item of
    items
  ) {
    const productId =
      toPositiveInteger(
        item.productId,
      );

    const quantity =
      Math.max(
        0,
        Number(
          item.quantity ??
          0,
        ),
      );

    if (
      !productId ||
      quantity <= 0
    ) {
      continue;
    }

    quantityByProduct.set(
      productId,
      (
        quantityByProduct.get(
          productId,
        ) ??
        0
      ) +
        quantity,
    );
  }

  let restoredQuantity =
    0;

  for (
    const [
      productId,
      quantity,
    ] of
    quantityByProduct
  ) {
    await tx
      .update(
        products,
      )
      .set({
        stock:
          sql`
            ${products.stock}
            +
            ${quantity}
          `,
        updatedAt:
          now,
      })
      .where(
        and(
          eq(
            products.id,
            productId,
          ),
          eq(
            products.mitra_id,
            order.mitraId,
          ),
          productBranchCondition(
            order.branchId,
          ),
        ),
      );

    restoredQuantity +=
      quantity;
  }

  return restoredQuantity;
}

/**
 * ==========================================================
 * RESTORE ADDON STOCK
 * ==========================================================
 *
 * Checkout KALOO POS memotong addon ketika order dibuat.
 * Karena itu cancel order mengembalikan addon yang tercatat
 * di order_items.notes.
 *
 * Order lama yang tidak menyimpan addon ID tidak dapat
 * direstore dengan aman dan akan dilewati.
 */
async function restoreAddonStocks(
  tx: OrderTransaction,
  order: ReverseOrderTarget,
  now: Date,
): Promise<number> {
  const items =
    await tx
      .select({
        quantity:
          orderItems.quantity,
        notes:
          orderItems.notes,
      })
      .from(
        orderItems,
      )
      .where(
        and(
          eq(
            orderItems.order_id,
            order.id,
          ),
          isNull(
            orderItems.deletedAt,
          ),
        ),
      );

  const quantityByAddon =
    new Map<
      number,
      number
    >();

  for (
    const item of
    items
  ) {
    const itemQuantity =
      Math.max(
        0,
        Number(
          item.quantity ??
          0,
        ),
      );

    if (
      itemQuantity <= 0
    ) {
      continue;
    }

    const addonIds =
      parseAddonIds(
        item.notes,
      );

    for (
      const addonId of
      addonIds
    ) {
      quantityByAddon.set(
        addonId,
        (
          quantityByAddon.get(
            addonId,
          ) ??
          0
        ) +
          itemQuantity,
      );
    }
  }

  let restoredQuantity =
    0;

  for (
    const [
      addonId,
      quantity,
    ] of
    quantityByAddon
  ) {
    await tx
      .update(
        addons,
      )
      .set({
        stock:
          sql`
            COALESCE(
              ${addons.stock},
              0
            )
            +
            ${quantity}
          `,
        updatedAt:
          now,
      })
      .where(
        and(
          eq(
            addons.id,
            addonId,
          ),
          eq(
            addons.mitra_id,
            order.mitraId,
          ),
          addonBranchCondition(
            order.branchId,
          ),
          eq(
            addons.is_track_stock,
            true,
          ),
        ),
      );

    restoredQuantity +=
      quantity;
  }

  return restoredQuantity;
}

/**
 * ==========================================================
 * RESTORE COUPON
 * ==========================================================
 *
 * coupon_usages menjadi marker idempotency.
 *
 * Setelah usage dihapus, pemanggilan reversal berikutnya
 * tidak lagi mengurangi already_used.
 */
async function restoreCouponUsage(
  tx: OrderTransaction,
  order: ReverseOrderTarget,
  now: Date,
): Promise<number> {
  const usages =
    await tx
      .select({
        id:
          couponUsages.id,
        couponId:
          couponUsages.coupon_id,
      })
      .from(
        couponUsages,
      )
      .where(
        and(
          eq(
            couponUsages.order_id,
            order.id,
          ),
          eq(
            couponUsages.mitra_id,
            order.mitraId,
          ),
        ),
      );

  if (
    usages.length === 0
  ) {
    return 0;
  }

  await tx
    .delete(
      couponUsages,
    )
    .where(
      and(
        eq(
          couponUsages.order_id,
          order.id,
        ),
        eq(
          couponUsages.mitra_id,
          order.mitraId,
        ),
      ),
    );

  const usageCountByCoupon =
    new Map<
      number,
      number
    >();

  for (
    const usage of
    usages
  ) {
    usageCountByCoupon.set(
      usage.couponId,
      (
        usageCountByCoupon.get(
          usage.couponId,
        ) ??
        0
      ) +
        1,
    );
  }

  for (
    const [
      couponId,
      usageCount,
    ] of
    usageCountByCoupon
  ) {
    await tx
      .update(
        coupon,
      )
      .set({
        already_used:
          sql`
            GREATEST(
              COALESCE(
                ${coupon.already_used},
                0
              )
              -
              ${usageCount},
              0
            )
          `,
        updatedAt:
          now,
      })
      .where(
        and(
          eq(
            coupon.id,
            couponId,
          ),
          eq(
            coupon.mitra_id,
            order.mitraId,
          ),
        ),
      );
  }

  return usages.length;
}

/**
 * ==========================================================
 * RELEASE TABLE
 * ==========================================================
 */
async function releaseTableIfUnused(
  tx: OrderTransaction,
  order: ReverseOrderTarget,
  now: Date,
): Promise<boolean> {
  if (
    order.tableId ===
    null
  ) {
    return false;
  }

  const [
    otherActiveOrder,
  ] =
    await tx
      .select({
        id:
          orders.id,
      })
      .from(
        orders,
      )
      .where(
        and(
          eq(
            orders.mitra_id,
            order.mitraId,
          ),
          orderBranchCondition(
            order.branchId,
          ),
          eq(
            orders.table_number,
            order.tableId,
          ),
          ne(
            orders.id,
            order.id,
          ),
          inArray(
            orders.status,
            [
              'pending',
              'confirmed',
              'preparing',
              'ready',
            ],
          ),
          inArray(
            orders.payment_status,
            [
              '1',
              '2',
              '4',
            ],
          ),
          isNull(
            orders.deletedAt,
          ),
        ),
      )
      .limit(1);

  if (
    otherActiveOrder
  ) {
    return false;
  }

  await tx
    .update(
      tableList,
    )
    .set({
      status:
        1,
      updatedAt:
        now,
    })
    .where(
      and(
        eq(
          tableList.id,
          order.tableId,
        ),
        eq(
          tableList.mitra_id,
          order.mitraId,
        ),
        tableBranchCondition(
          order.branchId,
        ),
        isNull(
          tableList.deletedAt,
        ),
      ),
    );

  return true;
}

/**
 * ==========================================================
 * REVERSE ORDER
 * ==========================================================
 *
 * Rules:
 *
 * pending:
 * - restore addon
 * - restore coupon
 * - release table
 *
 * confirmed:
 * - restore product
 * - restore addon
 * - restore coupon
 * - release table
 *
 * preparing / ready:
 * - PRODUCT TIDAK DIRESTORE otomatis
 * - restore addon
 * - restore coupon
 * - release table
 *
 * completed:
 * - tidak diterima oleh type ReversibleOrderStatus.
 *   Refund/Void completed harus flow terpisah.
 *
 * cancelled:
 * - idempotent, tidak melakukan reversal kedua kali.
 */
export async function reverseOrder({
  tx,
  order,
  reason,
  source,
  now = new Date(),
  paymentStatus,
  transactionId,
}: ReverseOrderOptions): Promise<ReverseOrderResult> {
  if (
    order.status ===
    'cancelled'
  ) {
    return {
      alreadyCancelled:
        true,

      restoredProductStock:
        false,
      restoredProductQuantity:
        0,

      restoredAddonStock:
        false,
      restoredAddonQuantity:
        0,

      restoredCouponUsage:
        false,
      restoredCouponUsageCount:
        0,

      tableReleased:
        false,
      tableId:
        order.tableId,

      orderCode:
        order.orderCode,
    };
  }

  /**
   * Order dibuat cancelled lebih dahulu di transaction yang sama.
   * Jika salah satu reversal gagal, transaction rollback sehingga
   * order tidak tertinggal sebagai cancelled setengah jalan.
   */
  const orderUpdate:
    Partial<
      typeof orders.$inferInsert
    > = {
      status:
        'cancelled',

      cancelledAt:
        now,

      cancelReason:
        (
          normalizeString(
            reason,
          ) ||
          (
            source ===
              'midtrans'
              ? 'Pembayaran dibatalkan oleh Midtrans'
              : 'Dibatalkan oleh kasir'
          )
        ).slice(
          0,
          255,
        ),

      updatedAt:
        now,
    };

  if (
    paymentStatus !==
    undefined
  ) {
    orderUpdate.payment_status =
      paymentStatus;
  }

  if (
    transactionId !==
    undefined
  ) {
    orderUpdate.transaction_id =
      transactionId;
  }

  await tx
    .update(
      orders,
    )
    .set(
      orderUpdate,
    )
    .where(
      and(
        eq(
          orders.id,
          order.id,
        ),
        eq(
          orders.mitra_id,
          order.mitraId,
        ),
        orderBranchCondition(
          order.branchId,
        ),
        isNull(
          orders.deletedAt,
        ),
      ),
    );

  /**
   * Product stock hanya direstore jika order masih confirmed.
   */
  const restoredProductQuantity =
    order.status ===
      'confirmed'
      ? await restoreProductStocks(
          tx,
          order,
          now,
        )
      : 0;

  /**
   * Addon dipotong sejak checkout.
   */
  const restoredAddonQuantity =
    await restoreAddonStocks(
      tx,
      order,
      now,
    );

  /**
   * Coupon usage dikembalikan untuk order yang dibatalkan.
   */
  const restoredCouponUsageCount =
    await restoreCouponUsage(
      tx,
      order,
      now,
    );

  /**
   * Meja dilepas jika tidak ada order aktif lain.
   */
  const tableReleased =
    await releaseTableIfUnused(
      tx,
      order,
      now,
    );

  return {
    alreadyCancelled:
      false,

    restoredProductStock:
      restoredProductQuantity >
      0,

    restoredProductQuantity,

    restoredAddonStock:
      restoredAddonQuantity >
      0,

    restoredAddonQuantity,

    restoredCouponUsage:
      restoredCouponUsageCount >
      0,

    restoredCouponUsageCount,

    tableReleased,

    tableId:
      order.tableId,

    orderCode:
      order.orderCode,
  };
}