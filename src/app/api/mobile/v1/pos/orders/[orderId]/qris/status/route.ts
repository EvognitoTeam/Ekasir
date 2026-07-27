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

const MIDTRANS_SERVER_KEY =
  process.env.MIDTRANS_SERVER_KEY ?? '';

const MIDTRANS_IS_PRODUCTION =
  String(
    process.env.MIDTRANS_IS_PRODUCTION ??
      'false',
  ).toLowerCase() === 'true';

const MIDTRANS_BASE_URL =
  MIDTRANS_IS_PRODUCTION
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com';

type MidtransStatusResponse = {
  status_code?: string;
  status_message?: string;
  transaction_id?: string;
  order_id?: string;
  gross_amount?: string;
  payment_type?: string;
  transaction_status?: string;
  fraud_status?: string;
  transaction_time?: string;
  settlement_time?: string;
  expiry_time?: string;
  issuer?: string;
  acquirer?: string;
};

function getMidtransAuthorization() {
  if (!MIDTRANS_SERVER_KEY) {
    throw new Error(
      'MIDTRANS_SERVER_KEY belum dikonfigurasi.',
    );
  }

  return `Basic ${Buffer.from(
    `${MIDTRANS_SERVER_KEY}:`,
  ).toString('base64')}`;
}

function mapMidtransStatus(
  transactionStatus:
    string | undefined,
  fraudStatus:
    string | undefined,
) {
  if (
    transactionStatus ===
      'settlement' ||
    (
      transactionStatus ===
        'capture' &&
      fraudStatus ===
        'accept'
    )
  ) {
    return {
      databaseStatus:
        '2' as const,
      label:
        'paid',
    };
  }

  if (
    transactionStatus ===
      'expire'
  ) {
    return {
      databaseStatus:
        '3' as const,
      label:
        'expired',
    };
  }

  if (
    [
      'deny',
      'cancel',
      'failure',
    ].includes(
      transactionStatus ?? '',
    )
  ) {
    return {
      databaseStatus:
        '4' as const,
      label:
        'failed',
    };
  }

  return {
    databaseStatus:
      '1' as const,
    label:
      'pending',
  };
}

async function fetchMidtransStatus(
  identifier: string,
) {
  const response =
    await fetch(
      `${MIDTRANS_BASE_URL}/v2/${encodeURIComponent(
        identifier,
      )}/status`,
      {
        method:
          'GET',
        headers: {
          Accept:
            'application/json',
          Authorization:
            getMidtransAuthorization(),
        },
        cache:
          'no-store',
      },
    );

  const data =
    await response.json() as
      MidtransStatusResponse;

  if (!response.ok) {
    throw new Error(
      data.status_message ||
        `Midtrans HTTP ${response.status}`,
    );
  }

  return data;
}

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

    const identifier =
      order.transactionId ||
      order.orderCode;

    const midtransStatus =
      await fetchMidtransStatus(
        identifier,
      );

    const mappedStatus =
      mapMidtransStatus(
        midtransStatus
          .transaction_status,
        midtransStatus
          .fraud_status,
      );

    const now =
      new Date();

    const shouldMarkPaid =
      mappedStatus.databaseStatus ===
        '2';

    await db
      .update(orders)
      .set({
        payment_status:
          mappedStatus.databaseStatus,
        transaction_id:
          midtransStatus
            .transaction_id ??
          order.transactionId,
        payment_type:
          midtransStatus
            .payment_type ??
          order.paymentType,
        issuer:
          midtransStatus.issuer ??
          midtransStatus.acquirer ??
          order.issuer,
        paymentPaidAt:
          shouldMarkPaid
            ? now
            : undefined,
        updatedAt:
          now,
      })
      .where(
        whereCondition,
      );

    const expiryTime =
      midtransStatus.expiry_time
        ? new Date(
            midtransStatus
              .expiry_time.replace(
                ' ',
                'T',
              ) +
              (
                midtransStatus
                  .expiry_time.includes(
                    'T',
                  )
                  ? ''
                  : '+07:00'
              ),
          )
        : order.expiryTime
          ? new Date(
              order.expiryTime,
            )
          : null;

    const isExpired =
      mappedStatus.databaseStatus ===
        '3';

    const normalizedStatus =
      mappedStatus.label;

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
            mappedStatus.databaseStatus,

          paymentStatusLabel:
            normalizedStatus,

          transactionId:
            midtransStatus.transaction_id ??
            order.transactionId,

          paymentType:
            midtransStatus.payment_type ??
            order.paymentType,

          issuer:
            midtransStatus.issuer ??
            midtransStatus.acquirer ??
            order.issuer,

          qrUrl:
            order.qrUrl,

          qrString:
            order.qrString,

          expiryTime,

          isExpired,

          midtrans: {
            transactionStatus:
              midtransStatus.transaction_status ??
              null,
            fraudStatus:
              midtransStatus.fraud_status ??
              null,
            statusCode:
              midtransStatus.status_code ??
              null,
            statusMessage:
              midtransStatus.status_message ??
              null,
            settlementTime:
              midtransStatus.settlement_time ??
              null,
          },

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