import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull, type SQL } from 'drizzle-orm';

import { db } from '@/db';
import { orders } from '@/db/schema';
import { requireMobileAuth } from '@/lib/mobile-api/auth';

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

type PaymentRequestBody = {
  paymentMethod?: 'cash' | 'qris';
  amountReceived?: number;
};

function errorResponse(
  status: number,
  code: string,
  message: string,
  details: unknown = null,
) {
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

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  try {
    console.log('[PAYMENT_PATCH_START]', {
      method: request.method,
      url: request.url,
    });

    /*
     * 1. AUTENTIKASI
     */
    const payload = await requireMobileAuth(request);

    console.log('[PAYMENT_AUTH_RESULT]', payload);

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

    /*
     * 2. ORDER ID
     */
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
          receivedOrderId: params.orderId,
        },
      );
    }

    /*
     * 3. REQUEST BODY
     */
    let body: PaymentRequestBody;

    try {
      body =
        (await request.json()) as PaymentRequestBody;
    } catch (error) {
      return errorResponse(
        400,
        'INVALID_JSON',
        'Request body harus berupa JSON yang valid.',
        {
          message:
            error instanceof Error
              ? error.message
              : String(error),
        },
      );
    }

    const paymentMethod =
      body.paymentMethod;

    const amountReceived = Number(
      body.amountReceived ?? 0,
    );

    if (
      paymentMethod !== 'cash' &&
      paymentMethod !== 'qris'
    ) {
      return errorResponse(
        422,
        'INVALID_PAYMENT_METHOD',
        'Metode pembayaran harus cash atau qris.',
        {
          paymentMethod,
        },
      );
    }

    if (
      paymentMethod === 'cash' &&
      (!Number.isFinite(amountReceived) ||
        amountReceived < 0)
    ) {
      return errorResponse(
        422,
        'INVALID_AMOUNT_RECEIVED',
        'Nominal pembayaran tunai tidak valid.',
        {
          amountReceived:
            body.amountReceived,
        },
      );
    }

    /*
     * 4. SCOPE ORDER
     */
    const conditions: SQL[] = [
      eq(orders.id, orderId),
      eq(orders.mitra_id, mitraId),
      isNull(orders.deletedAt),
    ];

    if (role !== 'owner') {
      if (branchId === null) {
        conditions.push(
          isNull(orders.branch_id),
        );
      } else {
        conditions.push(
          eq(orders.branch_id, branchId),
        );
      }
    }

    const whereCondition =
      and(...conditions);

    if (!whereCondition) {
      return errorResponse(
        500,
        'EMPTY_QUERY_CONDITION',
        'Kondisi pencarian order tidak berhasil dibuat.',
      );
    }

    /*
     * 5. AMBIL ORDER
     */
    const result = await db
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

        totalPrice:
          orders.total_price,

        totalAfterDiscount:
          orders.totalAfterDiscount,

        service: orders.service,
        tax: orders.tax,
      })
      .from(orders)
      .where(whereCondition)
      .limit(1);

    const order = result[0];

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

    if (order.status === 'cancelled') {
      return errorResponse(
        409,
        'ORDER_CANCELLED',
        'Pembayaran tidak dapat dicatat karena pesanan telah dibatalkan.',
        {
          orderId: order.id,
          orderCode: order.orderCode,
        },
      );
    }

    /*
     * 6. HITUNG TOTAL
     */
    const baseTotal = Number(
      order.totalAfterDiscount ??
        order.totalPrice ??
        0,
    );

    const service = Number(
      order.service ?? 0,
    );

    const tax = Number(
      order.tax ?? 0,
    );

    if (
      !Number.isFinite(baseTotal) ||
      !Number.isFinite(service) ||
      !Number.isFinite(tax)
    ) {
      return errorResponse(
        500,
        'INVALID_ORDER_TOTAL',
        'Data nominal pesanan tidak valid.',
        {
          totalPrice: order.totalPrice,
          totalAfterDiscount:
            order.totalAfterDiscount,
          service: order.service,
          tax: order.tax,
        },
      );
    }

    /*
     * Sesuaikan bila totalAfterDiscount Anda
     * ternyata sudah termasuk service dan tax.
     */
    const grandTotal =
      baseTotal + service + tax;

    if (
      paymentMethod === 'cash' &&
      amountReceived < grandTotal
    ) {
      return errorResponse(
        422,
        'INSUFFICIENT_CASH',
        'Uang yang diterima kurang dari total pembayaran.',
        {
          grandTotal,
          amountReceived,
          shortage:
            grandTotal - amountReceived,
        },
      );
    }

    const change =
      paymentMethod === 'cash'
        ? amountReceived - grandTotal
        : 0;

    /*
     * 7. UPDATE ORDER
     */
    await db
      .update(orders)
      .set({
        payment_method: paymentMethod,
        payment_status: '2',

        getPayment:
          paymentMethod === 'cash'
            ? String(amountReceived)
            : null,

        cashChange:
          paymentMethod === 'cash'
            ? String(change)
            : null,

        updatedAt: new Date(),
      })
      .where(whereCondition);

    console.log('[PAYMENT_PATCH_SUCCESS]', {
      orderId,
      orderCode: order.orderCode,
      paymentMethod,
      baseTotal,
      service,
      tax,
      grandTotal,
      amountReceived,
      change,
    });

    /*
     * Jalur sukses juga wajib RETURN.
     */
    return NextResponse.json(
      {
        success: true,
        message:
          'Pembayaran berhasil dicatat.',
        data: {
          orderId: order.id,
          orderCode: order.orderCode,
          status: order.status,
          paymentMethod,
          paymentStatus: '2',
          baseTotal,
          service,
          tax,
          grandTotal,

          amountReceived:
            paymentMethod === 'cash'
              ? amountReceived
              : null,

          change:
            paymentMethod === 'cash'
              ? change
              : null,
        },
        meta: null,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      '[PAYMENT_PATCH_FATAL_ERROR]',
      error,
    );

    /*
     * Catch juga wajib RETURN.
     */
    return errorResponse(
      500,
      'INTERNAL_SERVER_ERROR',
      'Terjadi kesalahan saat mencatat pembayaran.',
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