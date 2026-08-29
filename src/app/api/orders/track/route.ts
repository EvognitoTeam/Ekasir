import { NextResponse } from 'next/server';

import { db } from '@/db';

import {
  mitra,
  orders,
  tableList,
} from '@/db/schema';

import {
  and,
  eq,
  isNull,
} from 'drizzle-orm';

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

function normalizeString(
  value: unknown,
): string {
  return String(
    value ?? '',
  ).trim();
}

/**
 * GET /api/orders/track?code=ORDER_CODE&slug=mitra-slug
 *
 * Endpoint tracking customer.
 *
 * `slug` digunakan untuk tenant scope agar order code dari mitra
 * lain tidak dapat dibaca bila kebetulan memiliki kode yang sama.
 *
 * Untuk kompatibilitas sementara, slug dibuat optional. Frontend
 * terbaru selalu mengirimkannya.
 */
export async function GET(
  request: Request,
) {
  const { searchParams } =
    new URL(
      request.url,
    );

  const code =
    normalizeString(
      searchParams.get(
        'code',
      ),
    );

  const slug =
    normalizeString(
      searchParams.get(
        'slug',
      ),
    );

  if (!code) {
    return jsonError(
      400,
      'Kode pesanan diperlukan.',
    );
  }

  try {
    let mitraId:
      number | null =
        null;

    if (slug) {
      const [
        foundMitra,
      ] =
        await db
          .select({
            id:
              mitra.id,
          })
          .from(
            mitra,
          )
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

      if (!foundMitra) {
        return jsonError(
          404,
          'Toko tidak ditemukan.',
        );
      }

      mitraId =
        Number(
          foundMitra.id,
        );
    }

    const conditions = [
      eq(
        orders.order_code,
        code,
      ),
      isNull(
        orders.deletedAt,
      ),
    ];

    if (
      mitraId !== null
    ) {
      conditions.push(
        eq(
          orders.mitra_id,
          mitraId,
        ),
      );
    }

    const data =
      await db
        .select({
          id:
            orders.id,

          order_code:
            orders.order_code,

          branch_id:
            orders.branch_id,

          status:
            orders.status,

          payment_status:
            orders.payment_status,

          payment_method:
            orders.payment_method,

          /**
           * Midtrans QRIS
           */
          qr_url:
            orders.qr_url,

          qr_string:
            orders.qr_string,

          expiry_time:
            orders.expiry_time,

          transaction_id:
            orders.transaction_id,

          /**
           * Table / service type
           */
          table_number:
            orders.table_number,

          table_name:
            tableList.table_name,

          manual_table_info:
            orders.manual_table_info,

          /**
           * Timeline
           */
          createdAt:
            orders.createdAt,

          created_at:
            orders.createdAt,

          confirmedAt:
            orders.confirmedAt,

          confirmed_at:
            orders.confirmedAt,

          preparingAt:
            orders.preparingAt,

          preparing_at:
            orders.preparingAt,

          readyAt:
            orders.readyAt,

          ready_at:
            orders.readyAt,

          completedAt:
            orders.completedAt,

          completed_at:
            orders.completedAt,

          cancelledAt:
            orders.cancelledAt,

          cancelled_at:
            orders.cancelledAt,
        })
        .from(
          orders,
        )
        .leftJoin(
          tableList,
          and(
            eq(
              tableList.id,
              orders.table_number,
            ),
            eq(
              tableList.mitra_id,
              orders.mitra_id,
            ),
          ),
        )
        .where(
          and(
            ...conditions,
          ),
        )
        .limit(1);

    if (
      data.length ===
        0
    ) {
      return jsonError(
        404,
        'Pesanan tidak ditemukan.',
      );
    }

    return NextResponse.json({
      success: true,

      /**
       * Tetap array supaya kompatibel dengan OrderTrackingView lama:
       * result.data[0]
       */
      data,
    });
  } catch (error) {
    console.error(
      '[ORDER_TRACK_GET_ERROR]',
      error,
    );

    return jsonError(
      500,
      'Gagal mengambil status pesanan.',
    );
  }
}
