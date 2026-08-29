import { NextResponse } from 'next/server';
import crypto from 'crypto';

import { db } from '@/db';
import {
  orders,
  tableList,
} from '@/db/schema';

import {
  reverseOrder,
} from '@/lib/orders/reverseOrder';

import {
  and,
  eq,
  isNull,
  sql,
} from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type PaymentStatus = '1' | '2' | '3' | '4';

type MidtransNotification = {
  order_id?: unknown;
  transaction_id?: unknown;
  status_code?: unknown;
  gross_amount?: unknown;
  signature_key?: unknown;
  transaction_status?: unknown;
  fraud_status?: unknown;
  payment_type?: unknown;
  issuer?: unknown;
};

type ParsedMidtransOrderId = {
  mitraId: number;
  orderCode: string;
};

type TargetOrder = {
  id: number;
  orderCode: string;
  mitraId: number;
  branchId: number | null;
  tableId: number | null;
  customerName: string | null;
  paymentMethod: string | null;
  paymentStatus: string;
  status: string;
  totalAfterDiscount: string | number | null;
  transactionId: string | null;
  paymentPaidAt: Date | null;
};

function jsonError(
  status: number,
  message: string,
  code = 'MIDTRANS_WEBHOOK_ERROR',
  details: unknown = null,
) {
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

function normalizeString(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  return String(value ?? '').trim();
}

function toPositiveInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseMidtransOrderId(value: unknown): ParsedMidtransOrderId | null {
  const orderId = normalizeString(value);

  if (!orderId) {
    return null;
  }

  const match = /^KALOOPOS-(\d+)-(.+)$/i.exec(orderId);

  if (!match) {
    return null;
  }

  const mitraId = toPositiveInteger(match[1]);
  const orderCode = normalizeString(match[2]).toUpperCase();

  if (!mitraId || !orderCode) {
    return null;
  }

  return {
    mitraId,
    orderCode,
  };
}

function createExpectedSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string,
): string {
  return crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');
}

function safeSignatureEqual(
  expected: string,
  received: string,
): boolean {
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const receivedBuffer = Buffer.from(received, 'utf8');

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    receivedBuffer,
  );
}

function translateMidtransStatus(
  transactionStatus: string,
  fraudStatus: string,
): PaymentStatus | null {
  switch (transactionStatus) {
    case 'settlement':
      return '2';

    case 'capture':
      if (fraudStatus === 'challenge') {
        return '4';
      }

      if (fraudStatus === 'accept' || !fraudStatus) {
        return '2';
      }

      return null;

    case 'pending':
      return '1';

    case 'cancel':
    case 'deny':
    case 'expire':
      return '3';

    default:
      return null;
  }
}

function expectedMidtransOrderId(order: TargetOrder): string {
  return `KALOOPOS-${order.mitraId}-${order.orderCode}`;
}

function amountMatches(
  submittedGrossAmount: string,
  databaseAmount: string | number | null,
): boolean {
  const submitted = Number(submittedGrossAmount);
  const expected = Number(databaseAmount ?? 0);

  if (!Number.isFinite(submitted) || !Number.isFinite(expected)) {
    return false;
  }

  return Math.abs(submitted - expected) < 0.001;
}

async function findTargetOrder(
  transactionId: string,
  parsedOrderId: ParsedMidtransOrderId | null,
): Promise<TargetOrder | null> {
  const selection = {
    id: orders.id,
    orderCode: orders.order_code,
    mitraId: orders.mitra_id,
    branchId: orders.branch_id,
    tableId: orders.table_number,
    customerName: orders.name,
    paymentMethod: orders.payment_method,
    paymentStatus: orders.payment_status,
    status: orders.status,
    totalAfterDiscount: orders.totalAfterDiscount,
    transactionId: orders.transaction_id,
    paymentPaidAt: orders.paymentPaidAt,
  };

  if (transactionId) {
    const [byTransactionId] = await db
      .select(selection)
      .from(orders)
      .where(
        and(
          eq(orders.transaction_id, transactionId),
          isNull(orders.deletedAt),
        ),
      )
      .limit(1);

    if (byTransactionId) {
      return byTransactionId as TargetOrder;
    }
  }

  if (!parsedOrderId) {
    return null;
  }

  const [byMidtransOrderId] = await db
    .select(selection)
    .from(orders)
    .where(
      and(
        eq(orders.mitra_id, parsedOrderId.mitraId),
        eq(orders.order_code, parsedOrderId.orderCode),
        isNull(orders.deletedAt),
      ),
    )
    .limit(1);

  return (byMidtransOrderId as TargetOrder | undefined) ?? null;
}

async function ensureTableOccupied(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  order: TargetOrder,
  now: Date,
) {
  if (order.tableId === null) {
    return;
  }

  const conditions = [
    eq(tableList.id, order.tableId),
    eq(tableList.mitra_id, order.mitraId),
    isNull(tableList.deletedAt),
  ];

  if (order.branchId !== null) {
    conditions.push(eq(tableList.branch_id, order.branchId));
  } else {
    conditions.push(isNull(tableList.branch_id));
  }

  await tx
    .update(tableList)
    .set({
      status: 2,
      updatedAt: now,
    })
    .where(and(...conditions));
}

async function pushTableToIot(
  tableId: number,
  status: 'occupied' | 'available',
  orderCode: string,
  customerName: string | null,
) {
  const iotUrl =
    process.env.IOT_INTERNAL_URL ??
    'http://localhost:3009/api/internal/push-iot';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (process.env.IOT_INTERNAL_SECRET) {
    headers['X-Internal-Secret'] = process.env.IOT_INTERNAL_SECRET;
  }

  try {
    await fetch(iotUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tableId,
        status,
        order_code: orderCode,
        customer_name: customerName,
      }),
    });
  } catch (error) {
    console.error('[MIDTRANS_IOT_PUSH_ERROR]', {
      tableId,
      status,
      orderCode,
      error,
    });
  }
}

export async function POST(request: Request): Promise<Response> {
  let webhookStep = 'START';

  try {
    webhookStep = 'CHECK_CONFIG';

    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    if (!serverKey) {
      console.error('[MIDTRANS_WEBHOOK_CONFIG_ERROR] MIDTRANS_SERVER_KEY missing');

      return jsonError(
        500,
        'Konfigurasi Midtrans belum lengkap.',
        'MIDTRANS_NOT_CONFIGURED',
      );
    }

    webhookStep = 'PARSE_BODY';

    let body: MidtransNotification;

    try {
      body = (await request.json()) as MidtransNotification;
    } catch {
      return jsonError(
        400,
        'Payload Midtrans bukan JSON yang valid.',
        'INVALID_JSON',
      );
    }

    const orderId = normalizeString(body.order_id);
    const transactionId = normalizeString(body.transaction_id);
    const statusCode = normalizeString(body.status_code);
    const grossAmount = normalizeString(body.gross_amount);
    const signatureKey = normalizeString(body.signature_key).toLowerCase();
    const transactionStatus = normalizeString(
      body.transaction_status,
    ).toLowerCase();
    const fraudStatus = normalizeString(body.fraud_status).toLowerCase();

    if (
      !orderId ||
      !statusCode ||
      !grossAmount ||
      !signatureKey ||
      !transactionStatus
    ) {
      return jsonError(
        400,
        'Payload Midtrans tidak lengkap.',
        'MIDTRANS_PAYLOAD_INCOMPLETE',
      );
    }

    webhookStep = 'VERIFY_SIGNATURE';

    const expectedSignature = createExpectedSignature(
      orderId,
      statusCode,
      grossAmount,
      serverKey,
    );

    if (!safeSignatureEqual(expectedSignature, signatureKey)) {
      console.error('[MIDTRANS_INVALID_SIGNATURE]', {
        orderId,
        transactionId: transactionId || null,
      });

      return jsonError(
        403,
        'Invalid Midtrans signature.',
        'MIDTRANS_INVALID_SIGNATURE',
      );
    }

    webhookStep = 'TRANSLATE_STATUS';

    const incomingPaymentStatus = translateMidtransStatus(
      transactionStatus,
      fraudStatus,
    );

    if (incomingPaymentStatus === null) {
      console.warn('[MIDTRANS_STATUS_IGNORED]', {
        orderId,
        transactionId: transactionId || null,
        transactionStatus,
        fraudStatus,
      });

      return NextResponse.json({
        success: true,
        ignored: true,
        message: 'Status Midtrans belum ditangani dan diabaikan.',
      });
    }

    webhookStep = 'FIND_ORDER';

    const parsedOrderId = parseMidtransOrderId(orderId);
    const targetOrder = await findTargetOrder(
      transactionId,
      parsedOrderId,
    );

    if (!targetOrder) {
      console.error('[MIDTRANS_ORDER_NOT_FOUND]', {
        orderId,
        transactionId: transactionId || null,
        parsedOrderId,
      });

      // Signature valid tetapi order tidak dikenal oleh KALOO POS.
      // Balas 200 supaya Midtrans tidak mengulang payload yang secara
      // deterministik memang tidak dapat diproses oleh aplikasi ini.
      return NextResponse.json({
        success: true,
        ignored: true,
        message: 'Order tidak ditemukan pada KALOO POS.',
      });
    }

    if (targetOrder.paymentMethod !== 'qris') {
      console.error('[MIDTRANS_NON_QRIS_ORDER]', {
        orderId,
        localOrderId: targetOrder.id,
        paymentMethod: targetOrder.paymentMethod,
      });

      return NextResponse.json({
        success: true,
        ignored: true,
        message: 'Notification bukan untuk order QRIS.',
      });
    }

    webhookStep = 'VERIFY_ORDER_CORRELATION';

    const expectedOrderId = expectedMidtransOrderId(targetOrder);

    if (expectedOrderId !== orderId) {
      console.error('[MIDTRANS_ORDER_ID_MISMATCH]', {
        incomingOrderId: orderId,
        expectedOrderId,
        localOrderId: targetOrder.id,
      });

      return NextResponse.json({
        success: true,
        ignored: true,
        message: 'Midtrans order ID tidak cocok dengan order lokal.',
      });
    }

    webhookStep = 'VERIFY_AMOUNT';

    if (!amountMatches(grossAmount, targetOrder.totalAfterDiscount)) {
      console.error('[MIDTRANS_AMOUNT_MISMATCH]', {
        orderId,
        localOrderId: targetOrder.id,
        grossAmount,
        databaseAmount: targetOrder.totalAfterDiscount,
      });

      return NextResponse.json({
        success: true,
        ignored: true,
        message: 'Gross amount Midtrans tidak cocok dengan order lokal.',
      });
    }

    webhookStep = 'PROCESS_TRANSACTION';

    const now = new Date();

    const processingResult = await db.transaction(async (tx) => {
      // Lock order supaya dua webhook yang masuk bersamaan tidak
      // melakukan reversal / update status dua kali.
      await tx.execute(
        sql`SELECT id FROM orders WHERE id = ${targetOrder.id} FOR UPDATE`,
      );

      const [currentOrderRaw] = await tx
        .select({
          id: orders.id,
          orderCode: orders.order_code,
          mitraId: orders.mitra_id,
          branchId: orders.branch_id,
          tableId: orders.table_number,
          customerName: orders.name,
          paymentMethod: orders.payment_method,
          paymentStatus: orders.payment_status,
          status: orders.status,
          totalAfterDiscount: orders.totalAfterDiscount,
          transactionId: orders.transaction_id,
          paymentPaidAt: orders.paymentPaidAt,
        })
        .from(orders)
        .where(
          and(
            eq(orders.id, targetOrder.id),
            eq(orders.mitra_id, targetOrder.mitraId),
            isNull(orders.deletedAt),
          ),
        )
        .limit(1);

      if (!currentOrderRaw) {
        return {
          action: 'ignored' as const,
          reason: 'ORDER_DISAPPEARED',
          tableId: null as number | null,
          tableStatus: null as 'occupied' | 'available' | null,
        };
      }

      const currentOrder = currentOrderRaw as TargetOrder;
      const currentPaymentStatus = currentOrder.paymentStatus as PaymentStatus;

      // Paid adalah terminal. Jangan biarkan pending/expire yang datang
      // terlambat menurunkan transaksi yang sudah lunas.
      if (currentPaymentStatus === '2') {
        if (incomingPaymentStatus !== '2') {
          console.warn('[MIDTRANS_STALE_STATUS_AFTER_PAID]', {
            orderId,
            localOrderId: currentOrder.id,
            currentPaymentStatus,
            incomingPaymentStatus,
            transactionStatus,
          });
        }

        if (!currentOrder.transactionId && transactionId) {
          await tx
            .update(orders)
            .set({
              transaction_id: transactionId,
              updatedAt: now,
            })
            .where(eq(orders.id, currentOrder.id));
        }

        return {
          action: 'idempotent' as const,
          reason: 'ALREADY_PAID',
          tableId: currentOrder.tableId,
          tableStatus: null as 'occupied' | 'available' | null,
        };
      }

      // Failed/cancelled juga terminal karena inventory/coupon mungkin
      // sudah direstore. Jangan otomatis "menghidupkan" order kembali.
      if (
        currentPaymentStatus === '3' ||
        currentOrder.status === 'cancelled'
      ) {
        if (incomingPaymentStatus === '2') {
          console.error('[MIDTRANS_PAID_AFTER_LOCAL_CANCELLATION]', {
            orderId,
            localOrderId: currentOrder.id,
            transactionId: transactionId || null,
          });
        }

        if (!currentOrder.transactionId && transactionId) {
          await tx
            .update(orders)
            .set({
              transaction_id: transactionId,
              updatedAt: now,
            })
            .where(eq(orders.id, currentOrder.id));
        }

        return {
          action: 'idempotent' as const,
          reason: 'ALREADY_FAILED_OR_CANCELLED',
          tableId: currentOrder.tableId,
          tableStatus: null as 'occupied' | 'available' | null,
        };
      }

      // Challenge jangan diturunkan kembali menjadi pending jika webhook
      // pending lama masuk belakangan.
      if (
        currentPaymentStatus === '4' &&
        incomingPaymentStatus === '1'
      ) {
        return {
          action: 'ignored' as const,
          reason: 'STALE_PENDING_AFTER_CHALLENGE',
          tableId: currentOrder.tableId,
          tableStatus: null as 'occupied' | 'available' | null,
        };
      }

      if (incomingPaymentStatus === '2') {
        await tx
          .update(orders)
          .set({
            transaction_id: transactionId || currentOrder.transactionId,
            payment_status: '2',
            paymentPaidAt: currentOrder.paymentPaidAt ?? now,
            updatedAt: now,
          })
          .where(
            and(
              eq(orders.id, currentOrder.id),
              eq(orders.mitra_id, currentOrder.mitraId),
            ),
          );

        await ensureTableOccupied(
          tx,
          currentOrder,
          now,
        );

        return {
          action: 'paid' as const,
          reason: transactionStatus,
          tableId: currentOrder.tableId,
          tableStatus: currentOrder.tableId !== null
            ? ('occupied' as const)
            : null,
        };
      }

      if (incomingPaymentStatus === '3') {
        // Jika order sudah bergerak ke dapur, jangan otomatis mengembalikan
        // stok/coupon. Tandai payment failed dan biarkan staff melakukan
        // resolusi manual agar tidak merusak order yang sudah diproses.
        if (currentOrder.status !== 'pending') {
          await tx
            .update(orders)
            .set({
              transaction_id: transactionId || currentOrder.transactionId,
              payment_status: '3',
              cancelReason: `Midtrans ${transactionStatus}: payment gagal setelah order diproses`.slice(0, 255),
              updatedAt: now,
            })
            .where(
              and(
                eq(orders.id, currentOrder.id),
                eq(orders.mitra_id, currentOrder.mitraId),
              ),
            );

          console.error('[MIDTRANS_FAILED_AFTER_ORDER_PROGRESS]', {
            orderId,
            localOrderId: currentOrder.id,
            orderStatus: currentOrder.status,
            transactionStatus,
          });

          return {
            action: 'payment_failed_manual_resolution' as const,
            reason: transactionStatus,
            tableId: currentOrder.tableId,
            tableStatus: null as 'occupied' | 'available' | null,
          };
        }

        const reversal =
          await reverseOrder({
            tx,
            order: {
              id:
                currentOrder.id,
              orderCode:
                currentOrder.orderCode,
              mitraId:
                currentOrder.mitraId,
              branchId:
                currentOrder.branchId,
              tableId:
                currentOrder.tableId,
              status:
                'pending',
            },
            reason:
              `Midtrans ${transactionStatus}`,
            source:
              'midtrans',
            now,
            paymentStatus:
              '3',
            transactionId:
              transactionId ||
              currentOrder.transactionId,
          });

        return {
          action: 'cancelled' as const,
          reason: transactionStatus,
          tableId:
            currentOrder.tableId,
          tableStatus:
            reversal.tableReleased &&
            reversal.tableId !== null
              ? ('available' as const)
              : null,
        };
      }

      // pending / challenge
      await tx
        .update(orders)
        .set({
          transaction_id: transactionId || currentOrder.transactionId,
          payment_status: incomingPaymentStatus,
          updatedAt: now,
        })
        .where(
          and(
            eq(orders.id, currentOrder.id),
            eq(orders.mitra_id, currentOrder.mitraId),
          ),
        );

      return {
        action: incomingPaymentStatus === '4'
          ? ('challenge' as const)
          : ('pending' as const),
        reason: transactionStatus,
        tableId: currentOrder.tableId,
        tableStatus: null as 'occupied' | 'available' | null,
      };
    });

    webhookStep = 'IOT_NOTIFY';

    if (
      processingResult.tableId !== null &&
      processingResult.tableStatus !== null
    ) {
      await pushTableToIot(
        processingResult.tableId,
        processingResult.tableStatus,
        targetOrder.orderCode,
        targetOrder.customerName,
      );
    }

    console.log('[MIDTRANS_WEBHOOK_PROCESSED]', {
      orderId,
      localOrderId: targetOrder.id,
      transactionId: transactionId || null,
      transactionStatus,
      paymentStatus: incomingPaymentStatus,
      action: processingResult.action,
      reason: processingResult.reason,
    });

    return NextResponse.json({
      success: true,
      message: 'Midtrans notification processed.',
      action: processingResult.action,
    });
  } catch (error) {
    console.error('[MIDTRANS_WEBHOOK_ERROR]', {
      webhookStep,
      error,
    });

    return jsonError(
      500,
      'Terjadi kesalahan saat memproses notifikasi Midtrans.',
      'MIDTRANS_WEBHOOK_INTERNAL_ERROR',
      process.env.NODE_ENV === 'development'
        ? {
            webhookStep,
            message:
              error instanceof Error
                ? error.message
                : String(error),
          }
        : null,
    );
  }
}
