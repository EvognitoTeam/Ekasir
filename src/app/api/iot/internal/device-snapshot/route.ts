import {
  NextResponse,
} from 'next/server';

import { db } from '@/db';

import {
  orders,
  tableList,
} from '@/db/schema';

import {
  and,
  desc,
  eq,
  inArray,
  isNull,
} from 'drizzle-orm';

import type {
  IoTOrderStatus,
  IoTTablePhysicalStatus,
  IoTTableSnapshot,
} from '@/lib/iot/types';

export const dynamic =
  'force-dynamic';

export const runtime =
  'nodejs';

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

function authorizeInternal(
  request: Request,
): boolean {
  const expected =
    process.env.IOT_INTERNAL_SECRET;

  if (!expected) {
    console.error(
      '[IOT_CONFIG_ERROR] IOT_INTERNAL_SECRET belum dikonfigurasi.',
    );

    return false;
  }

  const received =
    request.headers.get(
      'x-internal-secret',
    ) ??
    '';

  return received ===
    expected;
}

function normalizeTableStatus(
  value: unknown,
): IoTTablePhysicalStatus {
  const status =
    Number(
      value ?? 0,
    );

  if (status === 1) {
    return 'available';
  }

  if (status === 2) {
    return 'occupied';
  }

  return 'unknown';
}

function isoOrNull(
  value: unknown,
): string | null {
  if (!value) {
    return null;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(
          String(value),
        );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date.toISOString();
}

/**
 * GET /api/iot/internal/device-snapshot?tableId=12
 *
 * Endpoint ini HANYA dipanggil oleh IoT Gateway di localhost.
 * ESP32 tidak perlu mengakses database / Next API ini secara langsung.
 */
export async function GET(
  request: Request,
) {
  if (
    !authorizeInternal(
      request,
    )
  ) {
    return jsonError(
      401,
      'Unauthorized IoT internal request.',
    );
  }

  const { searchParams } =
    new URL(
      request.url,
    );

  const tableId =
    Number(
      searchParams.get(
        'tableId',
      ) ??
      0,
    );

  if (
    !Number.isInteger(
      tableId,
    ) ||
    tableId <= 0
  ) {
    return jsonError(
      400,
      'tableId tidak valid.',
    );
  }

  try {
    const [
      table,
    ] =
      await db
        .select({
          id:
            tableList.id,

          mitraId:
            tableList.mitra_id,

          branchId:
            tableList.branch_id,

          code:
            tableList.table_code,

          name:
            tableList.table_name,

          status:
            tableList.status,
        })
        .from(
          tableList,
        )
        .where(
          and(
            eq(
              tableList.id,
              tableId,
            ),
            isNull(
              tableList.deletedAt,
            ),
          ),
        )
        .limit(1);

    if (!table) {
      return jsonError(
        404,
        'Meja tidak ditemukan.',
      );
    }

    if (table.mitraId == null) {
      return NextResponse.json(
        {
          success: false,
          message: 'Mitra meja tidak ditemukan',
        },
        { status: 400 },
      );
    }

    /**
     * Ambil order aktif terakhir untuk meja.
     *
     * Kitchen berhenti di ready; completed dilakukan Cashier/front.
     */
    const [
      activeOrder,
    ] =
      await db
        .select({
          id:
            orders.id,

          code:
            orders.order_code,

          status:
            orders.status,

          paymentStatus:
            orders.payment_status,

          paymentMethod:
            orders.payment_method,

          customerName:
            orders.name,

          createdAt:
            orders.createdAt,

          confirmedAt:
            orders.confirmedAt,

          preparingAt:
            orders.preparingAt,

          readyAt:
            orders.readyAt,
        })
        .from(
          orders,
        )
        .where(
          and(
            eq(
              orders.table_number,
              tableId,
            ),

            eq(
              orders.mitra_id,
              table.mitraId,
            ),

            table.branchId ===
              null
              ? isNull(
                  orders.branch_id,
                )
              : eq(
                  orders.branch_id,
                  table.branchId,
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

            isNull(
              orders.deletedAt,
            ),
          ),
        )
        .orderBy(
          desc(
            orders.createdAt,
          ),
        )
        .limit(1);

    const physicalStatus =
      normalizeTableStatus(
        table.status,
      );

    const normalizedOrderStatus =
      activeOrder
        ? (
            activeOrder.status as
              IoTOrderStatus
          )
        : null;

    const pagerActive =
      normalizedOrderStatus ===
      'ready';

    const snapshot:
      IoTTableSnapshot = {
        type:
          'table.snapshot',

        revision:
          Date.now(),

        generatedAt:
          new Date()
            .toISOString(),

        table: {
          id:
            Number(
              table.id,
            ),

          mitraId:
            Number(
              table.mitraId,
            ),

          branchId:
            table.branchId ===
              null
              ? null
              : Number(
                  table.branchId,
                ),

          code:
            String(
              table.code ??
              table.id,
            ),

          name:
            String(
              table.name ??
              `Table ${table.id}`,
            ),

          status:
            physicalStatus,

          rawStatus:
            table.status ===
              null
              ? null
              : Number(
                  table.status,
                ),
        },

        order:
          activeOrder
            ? {
                id:
                  Number(
                    activeOrder.id,
                  ),

                code:
                  String(
                    activeOrder.code,
                  ),

                status:
                  activeOrder.status as
                    IoTOrderStatus,

                paymentStatus:
                  activeOrder.paymentStatus as
                    '1' |
                    '2' |
                    '3' |
                    '4',

                paymentMethod:
                  activeOrder.paymentMethod ??
                  null,

                customerName:
                  activeOrder.customerName ??
                  null,

                createdAt:
                  isoOrNull(
                    activeOrder.createdAt,
                  ),

                confirmedAt:
                  isoOrNull(
                    activeOrder.confirmedAt,
                  ),

                preparingAt:
                  isoOrNull(
                    activeOrder.preparingAt,
                  ),

                readyAt:
                  isoOrNull(
                    activeOrder.readyAt,
                  ),
              }
            : null,

        /**
         * Phase berikutnya:
         * query reservasi hari ini / reservasi terdekat.
         */
        reservation:
          null,

        pager: {
          active:
            pagerActive,

          type:
            pagerActive
              ? 'order_ready'
              : null,

          message:
            pagerActive
              ? 'Pesanan Anda sudah siap.'
              : null,
        },

        /**
         * LED merah = physical occupancy
         * LED kuning = reservation (Phase berikutnya)
         * LED biru = pager ready
         */
        leds: {
          red:
            physicalStatus ===
              'occupied'
              ? 'on'
              : 'off',

          yellow:
            'off',

          blue:
            pagerActive
              ? 'fast_blink'
              : 'off',
        },
      };

    return NextResponse.json({
      success:
        true,

      data:
        snapshot,
    });
  } catch (error) {
    console.error(
      '[IOT_DEVICE_SNAPSHOT_ERROR]',
      {
        tableId,
        error,
      },
    );

    return jsonError(
      500,
      'Gagal membuat snapshot meja.',
    );
  }
}
