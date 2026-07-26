import { NextResponse } from 'next/server';
import { db } from '@/db';
import {
  orders,
  mitra,
  cashouts,
} from '@/db/schema';

import {
  and,
  desc,
  eq,
  inArray,
  isNull,
} from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

type OrderRow = typeof orders.$inferSelect;

type MonthlyBucket = {
  monthIndex: number;
  monthName: string;
  gross: number;
  net: number;
  cash: number;
  qris: number;
  other: number;
  tax: number;
  service: number;
  platformFee: number;
  totalOrders: number;

  cashGross: number;
  qrisGross: number;
  otherGross: number;

  cashPlatformFee: number;
  qrisPlatformFee: number;
  otherPlatformFee: number;
};

function jsonError(
  status: number,
  message: string,
  code = 'REQUEST_FAILED',
  details: unknown = null,
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      message,
      error: {
        code,
        details,
      },
    },
    { status },
  );
}

function normalizePaymentMethod(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function toAmount(value: unknown): number {
  const amount = Number(value ?? 0);

  return Number.isFinite(amount)
    ? amount
    : 0;
}

function getOrderGross(order: OrderRow): number {
  return Math.max(
    0,
    toAmount(
      order.totalAfterDiscount ??
        order.total_price ??
        0,
    ),
  );
}

function getOrderTax(order: OrderRow): number {
  return Math.max(
    0,
    toAmount(order.tax),
  );
}

function getOrderService(order: OrderRow): number {
  /*
   * Service charge restoran.
   * Nilai ini dihitung untuk SEMUA metode pembayaran.
   */
  return Math.max(
    0,
    toAmount(order.service),
  );
}

function getOrderPlatformFee(order: OrderRow): number {
  /*
   * Fee platform sudah dibekukan pada masing-masing order.
   * Jangan dihitung ulang dari pengaturan mitra terbaru.
   */
  return Math.max(
    0,
    toAmount(order.platformFee),
  );
}

function isCashPayment(paymentMethod: string): boolean {
  return (
    paymentMethod === 'cash' ||
    paymentMethod === 'tunai'
  );
}

function isQrisPayment(paymentMethod: string): boolean {
  return paymentMethod === 'qris';
}

function isEligibleForPayout(
  orderDate: Date,
  now: Date,
): boolean {
  const orderYear = orderDate.getFullYear();
  const orderMonth = orderDate.getMonth();
  const orderDay = orderDate.getDate();

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  return (
    orderYear < currentYear ||
    (
      orderYear === currentYear &&
      orderMonth < currentMonth
    ) ||
    (
      orderYear === currentYear &&
      orderMonth === currentMonth &&
      orderDay <= 20
    )
  );
}

function isCurrentOrLastMonth(
  orderDate: Date,
  now: Date,
): boolean {
  const orderYear = orderDate.getFullYear();
  const orderMonth = orderDate.getMonth();

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const lastMonth =
    currentMonth === 0
      ? 11
      : currentMonth - 1;

  const lastMonthYear =
    currentMonth === 0
      ? currentYear - 1
      : currentYear;

  return (
    (
      orderYear === currentYear &&
      orderMonth === currentMonth
    ) ||
    (
      orderYear === lastMonthYear &&
      orderMonth === lastMonth
    )
  );
}

function createMonthlyBucket(
  monthIndex: number,
): MonthlyBucket {
  return {
    monthIndex,
    monthName: MONTH_NAMES[monthIndex],

    gross: 0,
    net: 0,

    cash: 0,
    qris: 0,
    other: 0,

    tax: 0,
    service: 0,
    platformFee: 0,

    totalOrders: 0,

    cashGross: 0,
    qrisGross: 0,
    otherGross: 0,

    cashPlatformFee: 0,
    qrisPlatformFee: 0,
    otherPlatformFee: 0,
  };
}

function finalizeBucket(
  bucket: MonthlyBucket,
): Omit<
  MonthlyBucket,
  | 'cashGross'
  | 'qrisGross'
  | 'otherGross'
  | 'cashPlatformFee'
  | 'qrisPlatformFee'
  | 'otherPlatformFee'
> {
  /*
   * Cash adalah uang yang sudah diterima langsung oleh mitra.
   */
  const cash = bucket.cashGross;

  /*
   * QRIS bersih dikurangi:
   * - fee transaksi QRIS;
   * - fee transaksi cash;
   * - fee metode lain.
   *
   * Alasannya, fee non-QRIS harus tetap ditagihkan dari saldo
   * digital yang tersedia untuk payout.
   */
  const qris =
    bucket.qrisGross -
    bucket.qrisPlatformFee -
    bucket.cashPlatformFee -
    bucket.otherPlatformFee;

  /*
   * Metode lain ditampilkan sebagai gross dikurangi fee-nya sendiri.
   */
  const other =
    bucket.otherGross -
    bucket.otherPlatformFee;

  return {
    monthIndex: bucket.monthIndex,
    monthName: bucket.monthName,

    gross: bucket.gross,
    net:
      bucket.gross -
      bucket.platformFee,

    cash,
    qris,
    other,

    tax: bucket.tax,
    service: bucket.service,
    platformFee: bucket.platformFee,

    totalOrders: bucket.totalOrders,
  };
}

export async function GET(
  request: Request,
): Promise<Response> {
  const { searchParams } =
    new URL(request.url);

  const slug =
    searchParams.get('slug')?.trim();

  if (!slug) {
    return jsonError(
      400,
      'Slug toko diperlukan.',
      'SLUG_REQUIRED',
    );
  }

  try {
    const [foundMitra] = await db
      .select()
      .from(mitra)
      .where(
        eq(
          mitra.mitra_slug,
          slug,
        ),
      )
      .limit(1);

    if (!foundMitra) {
      return jsonError(
        404,
        'Mitra tidak ditemukan.',
        'MITRA_NOT_FOUND',
      );
    }

    const mitraId = foundMitra.id;

    /*
     * Semua order sukses untuk histori seluruh waktu.
     */
    const allOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(
            orders.mitra_id,
            mitraId,
          ),
          eq(
            orders.status,
            'completed',
          ),
          eq(
            orders.payment_status,
            '2',
          ),
          isNull(
            orders.deletedAt,
          ),
        ),
      );

    const allHistoryData: Record<
      string,
      Record<string, MonthlyBucket>
    > = {};

    for (const order of allOrders) {
      if (!order.createdAt) {
        continue;
      }

      const orderDate =
        new Date(order.createdAt);

      const year =
        String(orderDate.getFullYear());

      const monthIndex =
        orderDate.getMonth();

      const month =
        String(monthIndex);

      if (!allHistoryData[year]) {
        allHistoryData[year] = {};
      }

      if (!allHistoryData[year][month]) {
        allHistoryData[year][month] =
          createMonthlyBucket(monthIndex);
      }

      const bucket =
        allHistoryData[year][month];

      const gross =
        getOrderGross(order);

      const tax =
        getOrderTax(order);

      const service =
        getOrderService(order);

      const platformFee =
        getOrderPlatformFee(order);

      const paymentMethod =
        normalizePaymentMethod(
          order.payment_method,
        );

      /*
       * Semua komponen berikut dihitung untuk SEMUA payment method.
       */
      bucket.totalOrders += 1;
      bucket.gross += gross;
      bucket.tax += tax;
      bucket.service += service;
      bucket.platformFee += platformFee;

      if (isCashPayment(paymentMethod)) {
        bucket.cashGross += gross;
        bucket.cashPlatformFee += platformFee;
      } else if (isQrisPayment(paymentMethod)) {
        bucket.qrisGross += gross;
        bucket.qrisPlatformFee += platformFee;
      } else {
        bucket.otherGross += gross;
        bucket.otherPlatformFee += platformFee;
      }
    }

    const withdrawalHistory =
      await db
        .select()
        .from(cashouts)
        .where(
          eq(
            cashouts.mitra_id,
            mitraId,
          ),
        )
        .orderBy(
          desc(
            cashouts.createdAt,
          ),
        );

    /*
     * Order selesai yang belum dicairkan.
     */
    const pendingOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(
            orders.mitra_id,
            mitraId,
          ),
          eq(
            orders.status,
            'completed',
          ),
          eq(
            orders.payment_status,
            '2',
          ),
          eq(
            orders.is_cashouted,
            false,
          ),
          isNull(
            orders.deletedAt,
          ),
        ),
      );

    const now = new Date();
    const currentDay = now.getDate();

    let totalCashGross = 0;
    let totalQrisGross = 0;
    let totalOtherGross = 0;

    /*
     * Tax, service, dan platform fee dihitung dari SEMUA metode.
     */
    let totalTax = 0;
    let totalService = 0;
    let totalPlatformFee = 0;

    let eligibleQrisGross = 0;
    let lockedQrisGross = 0;

    let eligibleCashFee = 0;
    let lockedCashFee = 0;

    let eligibleQrisFee = 0;
    let lockedQrisFee = 0;

    let eligibleOtherFee = 0;
    let lockedOtherFee = 0;

    const historyData: Record<
      string,
      Record<string, MonthlyBucket>
    > = {};

    for (const order of pendingOrders) {
      if (!order.createdAt) {
        continue;
      }

      const orderDate =
        new Date(order.createdAt);

      /*
       * Riwayat unpaid pada layar hanya menampilkan bulan berjalan
       * dan bulan sebelumnya.
       */
      if (
        !isCurrentOrLastMonth(
          orderDate,
          now,
        )
      ) {
        continue;
      }

      const year =
        String(orderDate.getFullYear());

      const monthIndex =
        orderDate.getMonth();

      const month =
        String(monthIndex);

      if (!historyData[year]) {
        historyData[year] = {};
      }

      if (!historyData[year][month]) {
        historyData[year][month] =
          createMonthlyBucket(monthIndex);
      }

      const bucket =
        historyData[year][month];

      const gross =
        getOrderGross(order);

      const tax =
        getOrderTax(order);

      const service =
        getOrderService(order);

      const platformFee =
        getOrderPlatformFee(order);

      const paymentMethod =
        normalizePaymentMethod(
          order.payment_method,
        );

      /*
       * Semua komponen dihitung tanpa memandang payment method.
       */
      bucket.totalOrders += 1;
      bucket.gross += gross;
      bucket.tax += tax;
      bucket.service += service;
      bucket.platformFee += platformFee;

      totalTax += tax;
      totalService += service;
      totalPlatformFee += platformFee;

      const eligible =
        isEligibleForPayout(
          orderDate,
          now,
        );

      if (isCashPayment(paymentMethod)) {
        bucket.cashGross += gross;
        bucket.cashPlatformFee += platformFee;

        totalCashGross += gross;

        if (eligible) {
          eligibleCashFee += platformFee;
        } else {
          lockedCashFee += platformFee;
        }
      } else if (isQrisPayment(paymentMethod)) {
        bucket.qrisGross += gross;
        bucket.qrisPlatformFee += platformFee;

        totalQrisGross += gross;

        if (eligible) {
          eligibleQrisGross += gross;
          eligibleQrisFee += platformFee;
        } else {
          lockedQrisGross += gross;
          lockedQrisFee += platformFee;
        }
      } else {
        bucket.otherGross += gross;
        bucket.otherPlatformFee += platformFee;

        totalOtherGross += gross;

        if (eligible) {
          eligibleOtherFee += platformFee;
        } else {
          lockedOtherFee += platformFee;
        }
      }
    }

    /*
     * Dana QRIS bersih:
     * QRIS gross dikurangi fee QRIS dan fee seluruh metode non-QRIS.
     */
    const eligibleQrisNet =
      eligibleQrisGross -
      eligibleQrisFee;

    const lockedQrisNet =
      lockedQrisGross -
      lockedQrisFee;

    const totalEligibleQris =
      eligibleQrisNet -
      eligibleCashFee -
      eligibleOtherFee;

    const totalLockedQris =
      lockedQrisNet -
      lockedCashFee -
      lockedOtherFee;

    const totalCashPlatformFee =
      eligibleCashFee +
      lockedCashFee;

    const totalQrisPlatformFee =
      eligibleQrisFee +
      lockedQrisFee;

    const totalOtherPlatformFee =
      eligibleOtherFee +
      lockedOtherFee;

    const historyArray =
      Object.keys(historyData)
        .sort(
          (a, b) =>
            Number(b) -
            Number(a),
        )
        .map((year) => ({
          year,
          months: Object.keys(
            historyData[year],
          )
            .sort(
              (a, b) =>
                Number(b) -
                Number(a),
            )
            .map((month) =>
              finalizeBucket(
                historyData[year][month],
              ),
            ),
        }));

    const allHistoryArray =
      Object.keys(allHistoryData)
        .sort(
          (a, b) =>
            Number(b) -
            Number(a),
        )
        .map((year) => ({
          year,
          months: Object.keys(
            allHistoryData[year],
          )
            .sort(
              (a, b) =>
                Number(b) -
                Number(a),
            )
            .map((month) =>
              finalizeBucket(
                allHistoryData[year][month],
              ),
            ),
        }));

    let canWithdraw = false;
    let withdrawalMessage = '';

    if (totalEligibleQris > 0) {
      if (totalEligibleQris >= 500000) {
        canWithdraw = true;
        withdrawalMessage =
          'Dana QRIS tersedia dan siap dicairkan.';
      } else if (currentDay >= 20) {
        canWithdraw = true;
        withdrawalMessage =
          'Periode pencairan dibuka mulai tanggal 20.';
      } else {
        const shortage =
          500000 -
          totalEligibleQris;

        withdrawalMessage =
          `Minimal penarikan Rp 500.000 ` +
          `(kurang Rp ${shortage.toLocaleString('id-ID')}). ` +
          'Atau tunggu mulai tanggal 20.';
      }
    } else if (totalEligibleQris < 0) {
      withdrawalMessage =
        `Terdapat minus fee sebesar Rp ` +
        `${Math.abs(totalEligibleQris).toLocaleString('id-ID')} ` +
        'dari transaksi non-QRIS.';
    } else {
      withdrawalMessage =
        'Belum ada dana QRIS yang dapat dicairkan.';
    }

    return NextResponse.json({
      success: true,
      data: {
        totalEligibleQris:
          Math.max(
            0,
            totalEligibleQris,
          ),

        totalLockedQris:
          Math.max(
            0,
            totalLockedQris,
          ),

        /*
         * Gross berdasarkan metode pembayaran.
         */
        totalCash:
          totalCashGross,

        totalQris:
          totalQrisGross,

        totalOther:
          totalOtherGross,

        /*
         * Dihitung dari semua metode pembayaran.
         */
        totalTax,
        totalService,
        totalPlatformFee,

        totalCashPlatformFee,
        totalQrisPlatformFee,
        totalOtherPlatformFee,

        /*
         * Alias sementara agar frontend lama tetap berjalan.
         */
        totalCashService:
          totalCashPlatformFee,

        totalQrisService:
          totalQrisPlatformFee,

        canWithdraw,
        withdrawalMessage,

        withdrawals:
          withdrawalHistory,

        history:
          historyArray,

        allHistory:
          allHistoryArray,
      },
    });
  } catch (error) {
    console.error(
      '[GET_PAYOUT_ERROR]',
      error,
    );

    return jsonError(
      500,
      'Internal Server Error',
      'INTERNAL_SERVER_ERROR',
      process.env.NODE_ENV === 'development'
        ? {
            message:
              error instanceof Error
                ? error.message
                : String(error),
          }
        : null,
    );
  }
}

export async function POST(
  request: Request,
): Promise<Response> {
  try {
    let body: {
      slug?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return jsonError(
        400,
        'Request body harus berupa JSON yang valid.',
        'INVALID_JSON',
      );
    }

    const slug =
      String(body.slug ?? '').trim();

    if (!slug) {
      return jsonError(
        400,
        'Slug toko diperlukan.',
        'SLUG_REQUIRED',
      );
    }

    const [foundMitra] = await db
      .select()
      .from(mitra)
      .where(
        eq(
          mitra.mitra_slug,
          slug,
        ),
      )
      .limit(1);

    if (!foundMitra) {
      return jsonError(
        404,
        'Mitra tidak ditemukan.',
        'MITRA_NOT_FOUND',
      );
    }

    const mitraId =
      foundMitra.id;

    const pendingOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(
            orders.mitra_id,
            mitraId,
          ),
          eq(
            orders.status,
            'completed',
          ),
          eq(
            orders.payment_status,
            '2',
          ),
          eq(
            orders.is_cashouted,
            false,
          ),
          isNull(
            orders.deletedAt,
          ),
        ),
      );

    const now = new Date();
    const currentDay = now.getDate();

    let eligibleQrisGross = 0;
    let eligibleQrisFee = 0;

    /*
     * Semua fee non-QRIS ikut dipotong dari saldo QRIS payout.
     */
    let eligibleNonQrisFee = 0;

    const eligibleOrderIds: number[] = [];

    for (const order of pendingOrders) {
      if (!order.createdAt) {
        continue;
      }

      const orderDate =
        new Date(order.createdAt);

      if (
        !isEligibleForPayout(
          orderDate,
          now,
        )
      ) {
        continue;
      }

      const paymentMethod =
        normalizePaymentMethod(
          order.payment_method,
        );

      const gross =
        getOrderGross(order);

      const platformFee =
        getOrderPlatformFee(order);

      eligibleOrderIds.push(order.id);

      if (isQrisPayment(paymentMethod)) {
        eligibleQrisGross += gross;
        eligibleQrisFee += platformFee;
      } else {
        /*
         * Cash, transfer, debit, credit card, e-wallet lain, dll.
         */
        eligibleNonQrisFee += platformFee;
      }
    }

    const eligibleQrisNet =
      eligibleQrisGross -
      eligibleQrisFee;

    const totalEligibleQris =
      eligibleQrisNet -
      eligibleNonQrisFee;

    if (eligibleOrderIds.length === 0) {
      return jsonError(
        400,
        'Tidak ada transaksi valid untuk dicairkan.',
        'NO_ELIGIBLE_ORDERS',
      );
    }

    if (totalEligibleQris <= 0) {
      return jsonError(
        400,
        'Tidak ada dana QRIS yang bisa dicairkan.',
        'NO_WITHDRAWABLE_BALANCE',
        {
          eligibleQrisGross,
          eligibleQrisFee,
          eligibleNonQrisFee,
        },
      );
    }

    if (
      totalEligibleQris < 500000 &&
      currentDay < 20
    ) {
      return jsonError(
        400,
        'Minimal penarikan Rp 500.000 atau tunggu mulai tanggal 20.',
        'MINIMUM_WITHDRAWAL_NOT_MET',
        {
          amount:
            totalEligibleQris,

          minimum:
            500000,

          shortage:
            500000 -
            totalEligibleQris,
        },
      );
    }

    const createdAt = new Date();

    await db.transaction(
      async (tx) => {
        await tx
          .insert(cashouts)
          .values({
            mitra_id:
              mitraId,

            amount:
              String(
                totalEligibleQris,
              ),

            createdAt,
            updatedAt:
              createdAt,
          });

        await tx
          .update(orders)
          .set({
            is_cashouted:
              true,

            updatedAt:
              createdAt,
          })
          .where(
            inArray(
              orders.id,
              eligibleOrderIds,
            ),
          );
      },
    );

    return NextResponse.json({
      success: true,
      message:
        'Permintaan penarikan dana berhasil dikirim.',

      amount:
        totalEligibleQris,

      data: {
        amount:
          totalEligibleQris,

        eligibleOrderCount:
          eligibleOrderIds.length,

        eligibleQrisGross,
        eligibleQrisFee,
        eligibleNonQrisFee,

        totalPlatformFee:
          eligibleQrisFee +
          eligibleNonQrisFee,
      },
    });
  } catch (error) {
    console.error(
      '[POST_PAYOUT_ERROR]',
      error,
    );

    return jsonError(
      500,
      'Internal Server Error',
      'INTERNAL_SERVER_ERROR',
      process.env.NODE_ENV === 'development'
        ? {
            message:
              error instanceof Error
                ? error.message
                : String(error),
          }
        : null,
    );
  }
}