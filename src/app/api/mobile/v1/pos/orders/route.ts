import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { db } from '@/db';
import { orderItems, orders, settings, tableList } from '@/db/schema';
import {
  requireMobileAuth,
  resolveMobileBranch,
} from '@/lib/mobile-api/auth';
import { mobileError, mobileSuccess } from '@/lib/mobile-api/response';

const ALLOWED_PAYMENT_METHODS = ['cash', 'qris'] as const;

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

const QRIS_EXPIRY_MINUTES = Math.max(
  1,
  Number(
    process.env.MIDTRANS_QRIS_EXPIRY_MINUTES ??
      15,
  ),
);

type MidtransAction = {
  name?: string;
  method?: string;
  url?: string;
};

type MidtransQrisResponse = {
  status_code?: string;
  status_message?: string;
  transaction_id?: string;
  order_id?: string;
  gross_amount?: string;
  payment_type?: string;
  transaction_status?: string;
  transaction_time?: string;
  expiry_time?: string;
  fraud_status?: string;
  acquirer?: string;
  issuer?: string;
  qr_string?: string;
  actions?: MidtransAction[];
  validation_messages?: string[];
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

function findQrisUrl(
  actions: MidtransAction[] | undefined,
) {
  if (!Array.isArray(actions)) {
    return null;
  }

  const preferred =
    actions.find(
      (action) =>
        action.name ===
          'generate-qr-code-v2' &&
        action.url,
    ) ??
    actions.find(
      (action) =>
        action.name ===
          'generate-qr-code' &&
        action.url,
    );

  return preferred?.url ?? null;
}

function parseMidtransDate(
  value: string | undefined,
  fallback: Date,
) {
  if (!value) {
    return fallback;
  }

  /*
   * Format Midtrans biasanya:
   * YYYY-MM-DD HH:mm:ss
   * Waktu diperlakukan sebagai Asia/Jakarta.
   */
  const normalized =
    value.includes('T')
      ? value
      : `${value.replace(
          ' ',
          'T',
        )}+07:00`;

  const parsed =
    new Date(normalized);

  return Number.isNaN(
    parsed.getTime(),
  )
    ? fallback
    : parsed;
}

async function createMidtransQris({
  orderCode,
  grossAmount,
  customer,
}: {
  orderCode: string;
  grossAmount: number;
  customer: {
    name: string;
    email: string | null;
    phone: string | null;
  };
}) {
  const response =
    await fetch(
      `${MIDTRANS_BASE_URL}/v2/charge`,
      {
        method: 'POST',
        headers: {
          Accept:
            'application/json',
          'Content-Type':
            'application/json',
          Authorization:
            getMidtransAuthorization(),
        },
        body: JSON.stringify({
          payment_type:
            'qris',

          transaction_details: {
            order_id:
              orderCode,
            gross_amount:
              grossAmount,
          },

          qris: {
            acquirer:
              'gopay',
          },

          customer_details: {
            first_name:
              customer.name ||
              'Customer',
            email:
              customer.email ||
              undefined,
            phone:
              customer.phone ||
              undefined,
          },

          item_details: [
            {
              id:
                orderCode,
              price:
                grossAmount,
              quantity:
                1,
              name:
                `Pembayaran ${orderCode}`,
            },
          ],

          custom_expiry: {
            expiry_duration:
              QRIS_EXPIRY_MINUTES,
            unit:
              'minute',
          },
        }),
        cache:
          'no-store',
      },
    );

  const data =
    await response.json() as
      MidtransQrisResponse;

  if (!response.ok) {
    const validationMessage =
      Array.isArray(
        data.validation_messages,
      )
        ? data.validation_messages.join(
            ', ',
          )
        : null;

    throw new Error(
      validationMessage ||
        data.status_message ||
        `Midtrans HTTP ${response.status}`,
    );
  }

  const qrUrl =
    findQrisUrl(
      data.actions,
    );

  if (
    !data.transaction_id ||
    !qrUrl
  ) {
    throw new Error(
      'Response Midtrans tidak memiliki transaction_id atau URL QR.',
    );
  }

  const fallbackExpiry =
    new Date(
      Date.now() +
        QRIS_EXPIRY_MINUTES *
          60 *
          1000,
    );

  return {
    raw:
      data,
    transactionId:
      data.transaction_id,
    paymentType:
      data.payment_type ??
      'qris',
    transactionStatus:
      data.transaction_status ??
      'pending',
    acquirer:
      data.acquirer ??
      null,
    issuer:
      data.issuer ??
      data.acquirer ??
      null,
    qrUrl,
    qrString:
      data.qr_string ??
      null,
    expiryTime:
      parseMidtransDate(
        data.expiry_time,
        fallbackExpiry,
      ),
  };
}

type CartItemInput = {
  menuItemId: number;
  name?: string;
  quantity: number;
  priceAtOrder: number;
  selectedAddOnsDetails?: unknown[];
};

function generateOrderCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function GET(request: Request) {
  try {
    const auth = await requireMobileAuth(request);
    const { searchParams } = new URL(request.url);
    const branchId = resolveMobileBranch(auth, searchParams.get('branch_id'));
    const page = Math.max(Number(searchParams.get('page') ?? 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 20), 1), 100);
    const offset = (page - 1) * limit;
    const status = searchParams.get('status');

    const conditions = [
      eq(orders.mitra_id, auth.mitraId),
      branchId ? eq(orders.branch_id, branchId) : isNull(orders.branch_id),
      isNull(orders.deletedAt),
    ];
    if (status) conditions.push(eq(orders.status, status as typeof orders.status.enumValues[number]));

    const [rows, countRows] = await Promise.all([
      db
        .select()
        .from(orders)
        .where(and(...conditions))
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(and(...conditions)),
    ]);

    return mobileSuccess(rows, {
      meta: {
        page,
        limit,
        total: Number(countRows[0]?.count ?? 0),
        totalPages: Math.ceil(Number(countRows[0]?.count ?? 0) / limit),
      },
    });
  } catch (error) {
    console.error('GET mobile orders error:', error);
    return mobileError('ORDERS_FETCH_FAILED', 'Gagal mengambil pesanan.', 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireMobileAuth(request);
    const idempotencyKey = request.headers.get('x-idempotency-key');
    if (!idempotencyKey) {
      return mobileError(
        'IDEMPOTENCY_KEY_REQUIRED',
        'Header X-Idempotency-Key wajib dikirim untuk mencegah order ganda.',
        422,
      );
    }

    const body = await request.json();
    const branchId = resolveMobileBranch(auth, body.branchId);
    const cartItems = Array.isArray(body.items) ? body.items as CartItemInput[] : [];
    const paymentMethod = String(body.paymentMethod ?? '').toLowerCase();

    if (cartItems.length === 0) {
      return mobileError('CART_EMPTY', 'Keranjang tidak boleh kosong.', 422);
    }
    if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod as typeof ALLOWED_PAYMENT_METHODS[number])) {
      return mobileError('PAYMENT_METHOD_INVALID', 'Metode pembayaran tidak didukung.', 422);
    }

    const subtotal = cartItems.reduce(
      (sum, item) => sum + Math.floor(Number(item.priceAtOrder) || 0) * Math.max(Number(item.quantity) || 1, 1),
      0,
    );
    const discount = Math.max(Math.floor(Number(body.discount) || 0), 0);
    const discountedSubtotal = Math.max(subtotal - discount, 0);

    const settingRows = await db
      .select()
      .from(settings)
      .where(
        and(
          eq(settings.mitraId, auth.mitraId),
          branchId ? eq(settings.branch_id, branchId) : isNull(settings.branch_id),
        ),
      )
      .limit(1);
    const currentSettings = settingRows[0] ?? {
      taxRate: 0,
      serviceRate: 0,
      isTaxIncluded: 0,
    };

    let service = 0;
    let tax = 0;
    let grandTotal = discountedSubtotal;
    if (currentSettings.isTaxIncluded === 1) {
      const serviceRate = Number(currentSettings.serviceRate) / 100;
      const taxRate = Number(currentSettings.taxRate) / 100;
      const base = Math.floor(discountedSubtotal / ((1 + serviceRate) * (1 + taxRate)));
      service = Math.floor(base * serviceRate);
      tax = discountedSubtotal - base - service;
    } else {
      service = Math.floor(discountedSubtotal * (Number(currentSettings.serviceRate) / 100));
      tax = Math.floor((discountedSubtotal + service) * (Number(currentSettings.taxRate) / 100));
      grandTotal = discountedSubtotal + service + tax;
    }

    const now = new Date();
    const orderCode = generateOrderCode();

    const created = await db.transaction(async (tx) => {
      let tableId: number | null = null;
      let manualTableInfo: string | null = null;
      const tableCode = String(body.tableCode ?? '').trim();

      if (tableCode && tableCode.toLowerCase() !== 'walk-in') {
        const tableRows = await tx
          .select({ id: tableList.id })
          .from(tableList)
          .where(
            and(
              eq(tableList.mitra_id, auth.mitraId),
              eq(tableList.table_code, tableCode),
              branchId ? eq(tableList.branch_id, branchId) : isNull(tableList.branch_id),
              isNull(tableList.deletedAt),
            ),
          )
          .limit(1);

        if (tableRows[0]) tableId = tableRows[0].id;
        else manualTableInfo = tableCode;
      }

      const result = await tx.insert(orders).values({
        order_code: orderCode,
        mitra_id: auth.mitraId,
        branch_id: branchId,
        cashier_id: auth.userId,
        user_id: body.customer?.userId ? Number(body.customer.userId) : null,
        name: String(body.customer?.name ?? 'Walk-in'),
        email: body.customer?.email ? String(body.customer.email) : null,
        phone_number: body.customer?.phone ? String(body.customer.phone) : null,
        table_number: tableId,
        manual_table_info: manualTableInfo,
        total_price: String(subtotal),
        discount: String(discount),
        service: String(service),
        tax: String(tax),
        totalAfterDiscount: String(grandTotal),
        payment_method: paymentMethod as 'cash' | 'qris',
        discountId: body.discountId ? Number(body.discountId) : null,
        status: 'pending',
        payment_status: '1',
        admin_notes: `mobile-idempotency:${idempotencyKey}`,
        createdAt: now,
        updatedAt: now,
      });

      const orderId = result[0].insertId;
      await tx.insert(orderItems).values(
        cartItems.map((item) => ({
          order_id: orderId,
          product_id: Number(item.menuItemId),
          mitra_id: auth.mitraId,
          branch_id: branchId,
          quantity: Math.max(Number(item.quantity) || 1, 1),
          notes: JSON.stringify(item.selectedAddOnsDetails ?? []),
          price: String(Math.floor(Number(item.priceAtOrder) || 0)),
          createdAt: now,
        })),
      );

      return { orderId, orderCode };
    });

    if (
      paymentMethod ===
      'qris'
    ) {
      try {
        const qris =
          await createMidtransQris({
            orderCode:
              created.orderCode,
            grossAmount:
              grandTotal,
            customer: {
              name:
                String(
                  body.customer?.name ??
                    'Walk-in',
                ),
              email:
                body.customer?.email
                  ? String(
                      body.customer.email,
                    )
                  : null,
              phone:
                body.customer?.phone
                  ? String(
                      body.customer.phone,
                    )
                  : null,
            },
          });

        await db
          .update(orders)
          .set({
            payment_method:
              'qris',
            payment_status:
              '1',
            transaction_id:
              qris.transactionId,
            payment_type:
              qris.paymentType,
            issuer:
              qris.issuer,
            qr_url:
              qris.qrUrl,
            qr_string:
              qris.qrString,
            expiry_time:
              qris.expiryTime,
            updatedAt:
              new Date(),
          })
          .where(
            and(
              eq(
                orders.id,
                created.orderId,
              ),
              eq(
                orders.mitra_id,
                auth.mitraId,
              ),
            ),
          );

        return mobileSuccess(
          {
            ...created,
            subtotal,
            discount,
            service,
            tax,
            grandTotal,
            paymentMethod:
              'qris',
            paymentStatus:
              '1',
            paymentStatusLabel:
              qris.transactionStatus,
            qris: {
              transactionId:
                qris.transactionId,
              qrUrl:
                qris.qrUrl,
              qrString:
                qris.qrString,
              expiryTime:
                qris.expiryTime,
              acquirer:
                qris.acquirer,
              issuer:
                qris.issuer,
            },
          },
          {
            message:
              'Pesanan dan QRIS berhasil dibuat.',
            status:
              201,
          },
        );
      } catch (midtransError) {
        console.error(
          '[MOBILE_ORDER_QRIS_CREATE_ERROR]',
          midtransError,
        );

        await db
          .update(orders)
          .set({
            payment_method:
              'qris',
            payment_status:
              '4',
            updatedAt:
              new Date(),
          })
          .where(
            and(
              eq(
                orders.id,
                created.orderId,
              ),
              eq(
                orders.mitra_id,
                auth.mitraId,
              ),
            ),
          );

        return mobileError(
          'QRIS_CREATE_FAILED',
          midtransError instanceof Error
            ? midtransError.message
            : 'Gagal membuat transaksi QRIS.',
          502,
          {
            orderId:
              created.orderId,
            orderCode:
              created.orderCode,
          },
        );
      }
    }

    return mobileSuccess(
      {
        ...created,
        subtotal,
        discount,
        service,
        tax,
        grandTotal,
        paymentMethod:
          'cash',
        paymentStatus:
          '1',
        qris:
          null,
      },
      {
        message:
          'Pesanan berhasil dibuat.',
        status:
          201,
      },
    );
  } catch (error) {
    console.error('POST mobile orders error:', error);
    return mobileError('ORDER_CREATE_FAILED', 'Gagal membuat pesanan.', 500);
  }
}