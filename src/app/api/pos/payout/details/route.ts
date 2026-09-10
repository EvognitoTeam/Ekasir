import {
  NextResponse,
} from 'next/server';

import {
  and,
  desc,
  eq,
  inArray,
  isNull,
} from 'drizzle-orm';

import {
  db,
} from '@/db';

import {
  branches,
  cashouts,
  orderItems,
  orders,
  products,
} from '@/db/schema';

import {
  requirePosAuth,
} from '@/lib/auth/posAuth';

export const dynamic =
  'force-dynamic';

export const runtime =
  'nodejs';

function jsonError(
  status: number,
  message: string,
  code = 'PAYOUT_DETAILS_FAILED',
) {
  return NextResponse.json(
    {
      success:
        false,

      message,

      error: {
        code,
      },
    },
    {
      status,
    },
  );
}

function normalizeString(
  value: unknown,
) {
  return String(
    value ??
      '',
  ).trim();
}

function money(
  value: unknown,
) {
  const parsed =
    Number(
      value ??
        0,
    );

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
}

type StoredAddon = {
  id?: number;
  name: string;
  price: number;
  customerNote?: string;
};

function parseStoredAddons(
  value: unknown,
): StoredAddon[] {
  let source:
    unknown =
      value;

  if (
    typeof source ===
    'string'
  ) {
    try {
      source =
        JSON.parse(
          source,
        );
    } catch {
      return [];
    }
  }

  if (
    source &&
    !Array.isArray(
      source,
    ) &&
    typeof source ===
      'object'
  ) {
    source =
      [
        source,
      ];
  }

  if (
    !Array.isArray(
      source,
    )
  ) {
    return [];
  }

  return source
    .map(
      (
        raw,
      ): StoredAddon | null => {
        if (
          !raw ||
          typeof raw !==
            'object'
        ) {
          return null;
        }

        const item =
          raw as Record<
            string,
            unknown
          >;

        const name =
          normalizeString(
            item.name ??
              item.title,
          );

        if (
          !name
        ) {
          return null;
        }

        const rawId =
          Number(
            item.id ??
              0,
          );

        return {
          id:
            Number.isInteger(
              rawId,
            ) &&
            rawId >
              0
              ? rawId
              : undefined,

          name,

          price:
            money(
              item.price,
            ),

          customerNote:
            normalizeString(
              item.customer_note ??
                item.customerNote,
            ) ||
            undefined,
        } satisfies StoredAddon;
      },
    )
    .filter(
      (
        item,
      ): item is StoredAddon =>
        item !==
        null,
    );
}

/**
 * ==========================================================
 * GET /api/pos/payout/details?slug=...
 * ==========================================================
 *
 * Endpoint read-only untuk audit seluruh riwayat dana QRIS:
 * - belum dicairkan
 * - sudah masuk batch pencairan
 * - pending
 * - approved
 * - rejected
 *
 * Sumber perhitungan memakai SNAPSHOT yang sudah tersimpan di order:
 *
 * subtotal      = orders.total_price
 * discount      = orders.discount
 * service       = orders.service
 * tax           = orders.tax
 * gross         = orders.totalAfterDiscount
 * platformFee   = orders.platformFee
 * netPayout     = gross - platformFee
 *
 * Detail item memakai snapshot order_items.price,
 * bukan harga product saat ini.
 *
 * Scope transaksi:
 * - tenant/session sesuai
 * - payment_method = qris
 * - payment_status = 2 / lunas
 * - tidak soft-delete
 *
 * is_cashouted TIDAK difilter agar histori payout tetap dapat diaudit.
 *
 * NOTE:
 * Endpoint ini sengaja tidak mengubah state pencairan.
 * POST pencairan tetap memakai /api/pos/payout yang sudah ada.
 */

export async function GET(
  request: Request,
) {
  const auth =
    await requirePosAuth({
      roles: [
        'Owner',
      ],
    });

  if (
    !auth.ok
  ) {
    return auth.response;
  }

  const {
    session,
  } =
    auth;

  const {
    searchParams,
  } =
    new URL(
      request.url,
    );

  const slug =
    normalizeString(
      searchParams.get(
        'slug',
      ),
    );

  if (
    !slug
  ) {
    return jsonError(
      400,
      'Slug toko diperlukan.',
      'PAYOUT_DETAILS_SLUG_REQUIRED',
    );
  }

  if (
    slug !==
    session.slug
  ) {
    return jsonError(
      403,
      'Slug toko tidak sesuai dengan sesi Owner.',
      'PAYOUT_DETAILS_MITRA_MISMATCH',
    );
  }

  try {
    const conditions = [
      eq(
        orders.mitra_id,
        session.mitraId,
      ),

      eq(
        orders.payment_method,
        'qris',
      ),

      eq(
        orders.payment_status,
        '2',
      ),

      /**
       * Detail endpoint ini sengaja mengambil:
       * - belum dicairkan
       * - sedang diajukan
       * - sudah approved
       * - rejected
       *
       * Status pencairan akan ditentukan dari:
       * orders.is_cashouted + cashout_id + cashouts.status.
       */
      isNull(
        orders.deletedAt,
      ),
    ];

    /**
     * Owner branch hanya melihat scope cabangnya.
     * Owner pusat melihat seluruh mitra.
     */
    if (
      session.branchId !==
      null
    ) {
      conditions.push(
        eq(
          orders.branch_id,
          session.branchId,
        ),
      );
    }

    const rawOrders =
      await db
        .select({
          id:
            orders.id,

          orderCode:
            orders.order_code,

          branchId:
            orders.branch_id,

          branchName:
            branches.name,

          customerName:
            orders.name,

          createdAt:
            orders.createdAt,

          paidAt:
            orders.paymentPaidAt,

          transactionId:
            orders.transaction_id,

          issuer:
            orders.issuer,

          subtotal:
            orders.total_price,

          discount:
            orders.discount,

          service:
            orders.service,

          tax:
            orders.tax,

          gross:
            orders.totalAfterDiscount,

          platformFeeRate:
            orders.platformFeeRate,

          platformFee:
            orders.platformFee,

          isCashouted:
            orders.is_cashouted,

          cashoutId:
            orders.cashout_id,

          timeCashout:
            orders.time_cashout,

          cashoutStatus:
            cashouts.status,

          cashoutAmount:
            cashouts.amount,

          cashoutCreatedAt:
            cashouts.createdAt,

          cashoutUpdatedAt:
            cashouts.updatedAt,
        })
        .from(
          orders,
        )
        .leftJoin(
          branches,
          eq(
            orders.branch_id,
            branches.id,
          ),
        )
        .leftJoin(
          cashouts,
          eq(
            orders.cashout_id,
            cashouts.id,
          ),
        )
        .where(
          and(
            ...conditions,
          ),
        )
        .orderBy(
          desc(
            orders.paymentPaidAt,
          ),
          desc(
            orders.createdAt,
          ),
          desc(
            orders.id,
          ),
        );

    if (
      rawOrders.length ===
      0
    ) {
      return NextResponse.json({
        success:
          true,

        data: {
          generatedAt:
            new Date().toISOString(),

          summary: {
            orderCount:
              0,

            itemLineCount:
              0,

            itemQuantity:
              0,

            subtotal:
              0,

            discount:
              0,

            service:
              0,

            tax:
              0,

            gross:
              0,

            platformFee:
              0,

            netPayout:
              0,
          },

          statusSummary: {
            eligible:
              0,

            pending:
              0,

            approved:
              0,

            rejected:
              0,

            cashouted:
              0,
          },

          cashoutBatches:
            [],

          orders:
            [],
        },
      });
    }

    const orderIds =
      rawOrders.map(
        (
          order,
        ) =>
          Number(
            order.id,
          ),
      );

    const rawItems =
      await db
        .select({
          id:
            orderItems.id,

          orderId:
            orderItems.order_id,

          productId:
            orderItems.product_id,

          productName:
            products.name,

          quantity:
            orderItems.quantity,

          unitPrice:
            orderItems.price,

          notes:
            orderItems.notes,
        })
        .from(
          orderItems,
        )
        .leftJoin(
          products,
          eq(
            orderItems.product_id,
            products.id,
          ),
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
        )
        .orderBy(
          orderItems.order_id,
          orderItems.id,
        );

    const itemsByOrder =
      new Map<
        number,
        Array<{
          id: number;
          productId: number;
          name: string;
          quantity: number;
          unitPrice: number;
          lineTotal: number;
          addons: StoredAddon[];
        }>
      >();

    for (
      const item of
      rawItems
    ) {
      const orderId =
        Number(
          item.orderId,
        );

      const quantity =
        Math.max(
          0,
          Number(
            item.quantity ??
              0,
          ) ||
            0,
        );

      const unitPrice =
        money(
          item.unitPrice,
        );

      const normalizedItem = {
        id:
          Number(
            item.id,
          ),

        productId:
          Number(
            item.productId,
          ),

        name:
          normalizeString(
            item.productName,
          ) ||
          `Item ${item.productId}`,

        quantity,

        /**
         * Snapshot order_items.price.
         * Pada flow checkout KALOO, nilai ini adalah
         * unit price yang sudah divalidasi untuk order tersebut.
         */
        unitPrice,

        lineTotal:
          unitPrice *
          quantity,

        addons:
          parseStoredAddons(
            item.notes,
          ),
      };

      const existing =
        itemsByOrder.get(
          orderId,
        ) ??
        [];

      existing.push(
        normalizedItem,
      );

      itemsByOrder.set(
        orderId,
        existing,
      );
    }

    const normalizedOrders =
      rawOrders.map(
        (
          order,
        ) => {
          const gross =
            money(
              order.gross,
            );

          const platformFee =
            money(
              order.platformFee,
            );

          const items =
            itemsByOrder.get(
              Number(
                order.id,
              ),
            ) ??
            [];

          return {
            id:
              Number(
                order.id,
              ),

            orderCode:
              normalizeString(
                order.orderCode,
              ),

            branchId:
              order.branchId ===
              null
                ? null
                : Number(
                    order.branchId,
                  ),

            branchName:
              order.branchId ===
              null
                ? 'Pusat / Main'
                : normalizeString(
                    order.branchName,
                  ) ||
                  `Cabang #${order.branchId}`,

            customerName:
              normalizeString(
                order.customerName,
              ) ||
              '-',

            createdAt:
              order.createdAt,

            paidAt:
              order.paidAt,

            transactionId:
              normalizeString(
                order.transactionId,
              ) ||
              null,

            issuer:
              normalizeString(
                order.issuer,
              ) ||
              null,

            isCashouted:
              Boolean(
                order.isCashouted,
              ),

            payoutState:
              !order.isCashouted
                ? 'eligible'
                : order.cashoutStatus ===
                    'approved'
                  ? 'approved'
                  : order.cashoutStatus ===
                      'rejected'
                    ? 'rejected'
                    : order.cashoutStatus ===
                        'pending'
                      ? 'pending'
                      : 'cashouted',

            cashout: {
              id:
                order.cashoutId ===
                  null ||
                order.cashoutId ===
                  undefined
                  ? null
                  : Number(
                      order.cashoutId,
                    ),

              status:
                normalizeString(
                  order.cashoutStatus,
                ) ||
                null,

              amount:
                order.cashoutAmount ===
                  null ||
                order.cashoutAmount ===
                  undefined
                  ? null
                  : money(
                      order.cashoutAmount,
                    ),

              timeCashout:
                order.timeCashout,

              createdAt:
                order.cashoutCreatedAt,

              updatedAt:
                order.cashoutUpdatedAt,
            },

            calculation: {
              subtotal:
                money(
                  order.subtotal,
                ),

              discount:
                money(
                  order.discount,
                ),

              service:
                money(
                  order.service,
                ),

              tax:
                money(
                  order.tax,
                ),

              gross,

              platformFeeRate:
                money(
                  order.platformFeeRate,
                ),

              platformFee,

              /**
               * Formula payout yang auditable.
               *
               * Breakdown subtotal/discount/service/tax tetap
               * ditampilkan sebagai snapshot order.
               *
               * Kita tidak merekonstruksi gross dari komponen
               * karena inclusive pricing dapat membuat formulanya
               * berbeda. Gross selalu memakai stored final total.
               */
              netPayout:
                Math.max(
                  0,
                  gross -
                    platformFee,
                ),
            },

            itemLineCount:
              items.length,

            itemQuantity:
              items.reduce(
                (
                  total,
                  item,
                ) =>
                  total +
                  item.quantity,
                0,
              ),

            items,
          };
        },
      );

    const summary =
      normalizedOrders.reduce(
        (
          current,
          order,
        ) => ({
          orderCount:
            current.orderCount +
            1,

          itemLineCount:
            current.itemLineCount +
            order.itemLineCount,

          itemQuantity:
            current.itemQuantity +
            order.itemQuantity,

          subtotal:
            current.subtotal +
            order.calculation.subtotal,

          discount:
            current.discount +
            order.calculation.discount,

          service:
            current.service +
            order.calculation.service,

          tax:
            current.tax +
            order.calculation.tax,

          gross:
            current.gross +
            order.calculation.gross,

          platformFee:
            current.platformFee +
            order.calculation.platformFee,

          netPayout:
            current.netPayout +
            order.calculation.netPayout,
        }),
        {
          orderCount:
            0,

          itemLineCount:
            0,

          itemQuantity:
            0,

          subtotal:
            0,

          discount:
            0,

          service:
            0,

          tax:
            0,

          gross:
            0,

          platformFee:
            0,

          netPayout:
            0,
        },
      );

    const statusSummary =
      normalizedOrders.reduce<
        Record<
          PayoutState,
          number
        >
      >(
        (
          current,
          order,
        ) => {
          const payoutState =
            order.payoutState;

          if (
            isPayoutState(
              payoutState,
            )
          ) {
            current[
              payoutState
            ] += 1;
          }

          return current;
        },
        {
          eligible:
            0,

          pending:
            0,

          approved:
            0,

          rejected:
            0,

          cashouted:
            0,
        },
      );

    /**
     * Satu cashout dapat berisi banyak order.
     *
     * Karena itu amount cashout TIDAK boleh dijumlahkan per order,
     * sebab akan double-count.
     *
     * Kita buat daftar batch unik berdasarkan cashout_id.
     */
    const cashoutBatchMap =
      new Map<
        number,
        {
          id: number;
          status: string | null;
          amount: number | null;
          timeCashout: Date | string | null;
          createdAt: Date | string | null;
          updatedAt: Date | string | null;
          orderCount: number;
          orderCodes: string[];
          calculatedNetOrders: number;
        }
      >();

    for (
      const order of
      normalizedOrders
    ) {
      if (
        order.cashout.id ===
        null
      ) {
        continue;
      }

      const existing =
        cashoutBatchMap.get(
          order.cashout.id,
        );

      if (
        existing
      ) {
        existing.orderCount +=
          1;

        existing.orderCodes.push(
          order.orderCode,
        );

        existing.calculatedNetOrders +=
          order.calculation.netPayout;

        continue;
      }

      cashoutBatchMap.set(
        order.cashout.id,
        {
          id:
            order.cashout.id,

          status:
            order.cashout.status,

          amount:
            order.cashout.amount,

          timeCashout:
            order.cashout.timeCashout,

          createdAt:
            order.cashout.createdAt,

          updatedAt:
            order.cashout.updatedAt,

          orderCount:
            1,

          orderCodes: [
            order.orderCode,
          ],

          calculatedNetOrders:
            order.calculation.netPayout,
        },
      );
    }

    const cashoutBatches =
      Array.from(
        cashoutBatchMap.values(),
      ).sort(
        (
          a,
          b,
        ) =>
          b.id -
          a.id,
      );

    return NextResponse.json({
      success:
        true,

      data: {
        generatedAt:
          new Date().toISOString(),

        summary,

        statusSummary,

        cashoutBatches,

        orders:
          normalizedOrders,
      },
    });
  } catch (
    error
  ) {
    console.error(
      '[PAYOUT_DETAILS_GET_ERROR]',
      error,
    );

    return jsonError(
      500,
      'Gagal mengambil detail dana pencairan.',
      'PAYOUT_DETAILS_FETCH_FAILED',
    );
  }
}

type PayoutState =
  | 'eligible'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cashouted';

function isPayoutState(
  value:
    unknown,
): value is PayoutState {
  return (
    value ===
      'eligible' ||
    value ===
      'pending' ||
    value ===
      'approved' ||
    value ===
      'rejected' ||
    value ===
      'cashouted'
  );
}