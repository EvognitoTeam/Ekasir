import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { db } from '@/db';
import { orderItems, orders, settings, tableList } from '@/db/schema';
import {
  requireMobileAuth,
  resolveMobileBranch,
} from '@/lib/mobile-api/auth';
import { mobileError, mobileSuccess } from '@/lib/mobile-api/response';

const ALLOWED_PAYMENT_METHODS = ['cash', 'qris'] as const;

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

    return mobileSuccess(
      {
        ...created,
        subtotal,
        discount,
        service,
        tax,
        grandTotal,
        paymentMethod,
        paymentStatus: '1',
      },
      { message: 'Pesanan berhasil dibuat.', status: 201 },
    );
  } catch (error) {
    console.error('POST mobile orders error:', error);
    return mobileError('ORDER_CREATE_FAILED', 'Gagal membuat pesanan.', 500);
  }
}
