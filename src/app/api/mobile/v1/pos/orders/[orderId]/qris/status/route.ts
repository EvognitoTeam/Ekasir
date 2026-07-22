import { NextRequest, NextResponse } from 'next/server';
import {
  and,
  eq,
  isNull,
  type SQL,
} from 'drizzle-orm';

import { db } from '@/db';
import { orders } from '@/db/schema';
import { requireMobileAuth } from '@/lib/mobile-api/auth';

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

function errorResponse(
  status: number,
  code: string,
  message: string,
  details: unknown = null,
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
    },
    { status },
  );
}

function mapPaymentStatus(status: string) {
  switch (status) {
    case '1':
      return 'pending';

    case '2':
      return 'paid';

    case '3':
      return 'expired';

    case '4':
      return 'failed';

    default:
      return 'unknown';
  }
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  try {
    console.log('[QRIS_STATUS_START]', {
      method: request.method,
      url: request.url,
    });

    /*
     * requireMobileAuth() milik Anda langsung
     * mengembalikan payload JWT.
     */
    const payload =
      await requireMobileAuth(request);

    console.log(
      '[QRIS_STATUS_AUTH_RESULT]',
      payload,
    );

    if (!payload) {
      return errorResponse(
        401,
        'UNAUTHORIZED',
        'Access token tidak valid atau telah kedaluwarsa.',
      );
    }

    const userId = Number(payload.userId);
    const mitraId = Number(payload.mitraId);

    const branchId =
      payload.branchId === null ||
      payload.branchId === undefined
        ? null
        : Number(payload.branchId);

    const role = String(
      payload.role ?? '',
    ).toLowerCase();

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return errorResponse(
        401,
        'INVALID_USER_ID',
        'User ID pada access token tidak valid.',
        {
          userId: payload.userId,
        },
      );
    }

    if (
      !Number.isInteger(mitraId) ||
      mitraId <= 0
    ) {
      return errorResponse(
        401,
        'INVALID_MITRA_ID',
        'Mitra ID pada access token tidak valid.',
        {
          mitraId: payload.mitraId,
        },
      );
    }

    const params = await context.params;
    const orderId = Number(params.orderId);

    if (
      !Number.isInteger(orderId) ||
      orderId <= 0
    ) {
      return errorResponse(
        400,
        'INVALID_ORDER_ID',
        'Order ID tidak valid.',
        {
          receivedOrderId:
            params.orderId,
        },
      );
    }

    const conditions: SQL[] = [
      eq(orders.id, orderId),
      eq(orders.mitra_id, mitraId),
      isNull(orders.deletedAt),
    ];

    /*
     * Owner dapat membaca semua cabang.
     * Cashier/Kitchen hanya cabang pada token.
     */
    if (role !== 'owner') {
      if (branchId === null) {
        conditions.push(
          isNull(orders.branch_id),
        );
      } else {
        conditions.push(
          eq(
            orders.branch_id,
            branchId,
          ),
        );
      }
    }

    const whereCondition =
      and(...conditions);

    if (!whereCondition) {
      return errorResponse(
        500,
        'EMPTY_QUERY_CONDITION',
        'Kondisi query order tidak berhasil dibuat.',
      );
    }

    const [order] = await db
      .select({
        id: orders.id,
        orderCode: orders.order_code,
        mitraId: orders.mitra_id,
        branchId: orders.branch_id,

        status: orders.status,

        paymentMethod:
          orders.payment_method,

        paymentStatus:
          orders.payment_status,

        transactionId:
          orders.transaction_id,

        paymentType:
          orders.payment_type,

        issuer: orders.issuer,

        qrUrl: orders.qr_url,

        qrString: orders.qr_string,

        expiryTime:
          orders.expiry_time,

        totalPrice:
          orders.total_price,

        totalAfterDiscount:
          orders.totalAfterDiscount,

        tax: orders.tax,
        service: orders.service,

        createdAt:
          orders.createdAt,

        updatedAt:
          orders.updatedAt,
      })
      .from(orders)
      .where(whereCondition)
      .limit(1);

    if (!order) {
      return errorResponse(
        404,
        'ORDER_NOT_FOUND',
        'Pesanan tidak ditemukan atau berada di luar scope akun.',
        {
          orderId,
          mitraId,
          branchId,
          role,
        },
      );
    }

    if (order.paymentMethod !== 'qris') {
      return errorResponse(
        422,
        'ORDER_NOT_QRIS',
        'Pesanan ini tidak menggunakan metode pembayaran QRIS.',
        {
          orderId: order.id,
          paymentMethod:
            order.paymentMethod,
        },
      );
    }

    const now = new Date();

    const expiryTime =
      order.expiryTime
        ? new Date(order.expiryTime)
        : null;

    const isExpired =
      expiryTime !== null &&
      expiryTime.getTime() <
        now.getTime() &&
      order.paymentStatus === '1';

    /*
     * Untuk sementara endpoint ini membaca
     * status yang tersimpan di database.
     *
     * Sinkronisasi real ke Midtrans dapat
     * ditambahkan kemudian.
     */
    const normalizedStatus = isExpired
      ? 'expired'
      : mapPaymentStatus(
          order.paymentStatus,
        );

    console.log('[QRIS_STATUS_SUCCESS]', {
      orderId: order.id,
      orderCode: order.orderCode,
      paymentStatus:
        order.paymentStatus,
      normalizedStatus,
    });

    return NextResponse.json(
      {
        success: true,
        message:
          'Status pembayaran QRIS berhasil diambil.',
        data: {
          orderId: order.id,
          orderCode: order.orderCode,

          orderStatus:
            order.status,

          paymentMethod:
            order.paymentMethod,

          paymentStatus:
            order.paymentStatus,

          paymentStatusLabel:
            normalizedStatus,

          transactionId:
            order.transactionId,

          paymentType:
            order.paymentType,

          issuer:
            order.issuer,

          qrUrl:
            order.qrUrl,

          qrString:
            order.qrString,

          expiryTime:
            order.expiryTime,

          isExpired,

          total: Number(
            order.totalAfterDiscount ??
              order.totalPrice ??
              0,
          ),

          tax: Number(
            order.tax ?? 0,
          ),

          service: Number(
            order.service ?? 0,
          ),

          createdAt:
            order.createdAt,

          updatedAt:
            order.updatedAt,
        },
        meta: null,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      '[QRIS_STATUS_FATAL_ERROR]',
      error,
    );

    return errorResponse(
      500,
      'INTERNAL_SERVER_ERROR',
      'Terjadi kesalahan saat mengambil status QRIS.',
      process.env.NODE_ENV ===
        'development'
        ? {
            name:
              error instanceof Error
                ? error.name
                : 'UnknownError',

            message:
              error instanceof Error
                ? error.message
                : String(error),

            stack:
              error instanceof Error
                ? error.stack
                : null,
          }
        : null,
    );
  }
}