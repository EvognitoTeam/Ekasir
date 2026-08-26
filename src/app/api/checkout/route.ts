import { NextResponse } from 'next/server';
import { db } from '@/db';
import {
  orders,
  orderItems,
  mitra,
  tableList,
  settings,
  products,
  users,
  coupon,
  couponUsages,
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

type CheckoutBody = {
  total?: unknown;
  discount?: unknown;
  totalAfterDiscount?: unknown;

  customer?: {
    userId?: unknown;
    name?: unknown;
    email?: unknown;
    phone?: unknown;
    tableNumber?: unknown;
    serviceType?: unknown;
    manualTableInfo?: unknown;
    method?: unknown;
  };

  cartItems?: Array<{
    menuItemId?: unknown;
    quantity?: unknown;
    selectedAddOnsDetails?: unknown;
    priceAtOrder?: unknown;
    name?: unknown;
    title?: unknown;
  }>;

  discountId?: unknown;
  slug?: unknown;

  serviceType?: unknown;
  manualTableInfo?: unknown;
  branchId?: unknown;
  branch_id?: unknown;
  idempotencyKey?: unknown;
  idempotency_key?: unknown;
};

type MidtransItem = {
  id: string;
  price: number;
  quantity: number;
  name: string;
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

function normalizeString(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  return String(value ?? '').trim();
}

type PaymentMethod = 'cash' | 'qris';

function normalizePaymentMethod(
  value: unknown,
): PaymentMethod | null {
  const method = normalizeString(value).toLowerCase();

  if (method === 'cash' || method === 'tunai') {
    return 'cash';
  }

  if (method === 'qris') {
    return 'qris';
  }

  return null;
}

function toInteger(value: unknown): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.floor(parsed);
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

function normalizeRate(value: unknown): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  const phoneRegex = /^[+]?[\d\s\-()]{8,20}$/;
  return phoneRegex.test(phone) && cleaned.length >= 8 && cleaned.length <= 15;
}

function generateOrderCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let index = 0; index < 6; index += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getIdempotencyKey(
  request: Request,
  body: CheckoutBody,
): string {
  return (
    request.headers.get('X-Idempotency-Key')?.trim() ||
    request.headers.get('Idempotency-Key')?.trim() ||
    normalizeString(body.idempotencyKey ?? body.idempotency_key)
  );
}

function calculatePlatformFee(
  grossAmount: number,
  rate: number,
): number {
  return Math.floor(grossAmount * (rate / 100));
}

function getMidtransUrl(production: boolean): string {
  return production
    ? 'https://api.midtrans.com/v2/charge'
    : 'https://api.sandbox.midtrans.com/v2/charge';
}

async function findActiveCashier(
  mitraId: number,
  branchId: number | null,
) {
  const conditions = [
    eq(users.mitra_id, mitraId),
    eq(users.is_login, true),
    inArray(users.role, ['Cashier', 'Owner']),
    isNull(users.deletedAt),
  ];

  if (branchId !== null) {
    conditions.push(eq(users.branch_id, branchId));
  } else {
    conditions.push(isNull(users.branch_id));
  }

  const [cashier] = await db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
      mitraId: users.mitra_id,
      branchId: users.branch_id,
      loginAt: users.login_at,
    })
    .from(users)
    .where(and(...conditions))
    .orderBy(desc(users.login_at), desc(users.id))
    .limit(1);

  return cashier ?? null;
}

export async function POST(request: Request): Promise<Response> {
  let checkoutStep = 'START';

  try {
    checkoutStep = 'PARSE_REQUEST';
    let body: CheckoutBody;

    try {
      body = (await request.json()) as CheckoutBody;
      checkoutStep = 'REQUEST_PARSED';
    } catch {
      return jsonError(
        400,
        'Request body harus berupa JSON yang valid.',
        'INVALID_JSON',
      );
    }

    const {
      totalAfterDiscount,
      customer,
      cartItems,
      discountId,
      slug: rawSlug,
    } = body;

    const slug = normalizeString(rawSlug);
    const branchId = toPositiveInteger(body.branchId ?? body.branch_id);
    const idempotencyKey = getIdempotencyKey(request, body);

    if (!slug) {
      return jsonError(400, 'Slug toko wajib diisi.', 'SLUG_REQUIRED');
    }

    if (!idempotencyKey) {
      return jsonError(400, 'Idempotency key wajib dikirim.', 'IDEMPOTENCY_KEY_REQUIRED');
    }

    if (idempotencyKey.length > 100) {
      return jsonError(400, 'Idempotency key maksimal 100 karakter.', 'IDEMPOTENCY_KEY_TOO_LONG');
    }

    if (!customer || !Array.isArray(cartItems) || cartItems.length === 0) {
      return jsonError(400, 'Data pelanggan dan keranjang wajib diisi.', 'INVALID_CHECKOUT_DATA');
    }

    const customerName = normalizeString(customer.name);
    const customerEmail = normalizeString(customer.email).toLowerCase();
    const customerPhone = normalizeString(customer.phone);
    const paymentMethod = normalizePaymentMethod(customer.method);

    if (!customerName) {
      return jsonError(400, 'Nama pelanggan wajib diisi.', 'CUSTOMER_NAME_REQUIRED');
    }

    // Validasi Format Email
    if (customerEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerEmail)) {
        return jsonError(
          400,
          'Format email tidak valid.',
          'INVALID_EMAIL_FORMAT',
        );
      }
    }

    // Validasi Format Telepon
    if (customerPhone && !isValidPhoneNumber(customerPhone)) {
      return jsonError(
        400,
        'Format nomor telepon tidak valid. Gunakan 8 hingga 15 digit angka.',
        'INVALID_PHONE_FORMAT',
      );
    }

    if (!paymentMethod) {
      return jsonError(400, 'Metode pembayaran tidak valid.', 'INVALID_PAYMENT_METHOD', {
        submittedMethod: normalizeString(customer.method),
        allowedPaymentMethods: ['cash', 'qris'],
      });
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

    checkoutStep = 'FIND_MITRA';

    const [foundMitra] = await db
      .select()
      .from(mitra)
      .where(eq(mitra.mitra_slug, slug))
      .limit(1);

    if (!foundMitra) {
      return jsonError(404, 'Mitra tidak ditemukan.', 'MITRA_NOT_FOUND');
    }

    const mitraId = foundMitra.id;

    checkoutStep = 'CHECK_IDEMPOTENCY';

    const [existingOrder] = await db
      .select({
        id: orders.id,
        orderCode: orders.order_code,
        paymentMethod: orders.payment_method,
        paymentStatus: orders.payment_status,
        status: orders.status,
        qrUrl: orders.qr_url,
        qrString: orders.qr_string,
        expiryTime: orders.expiry_time,
        transactionId: orders.transaction_id,
      })
      .from(orders)
      .where(
        and(
          eq(orders.mitra_id, mitraId),
          eq(orders.idempotencyKey, idempotencyKey),
          isNull(orders.deletedAt),
        ),
      )
      .limit(1);

    if (existingOrder) {
      return NextResponse.json({
        success: true,
        reused: true,
        idempotentReplay: true,
        message: 'Request checkout ini sudah pernah diproses.',
        orderCode: existingOrder.orderCode,
        paymentMethod: existingOrder.paymentMethod,
        transactionId: existingOrder.transactionId ?? null,
        qrUrl: existingOrder.qrUrl ?? null,
      });
    }

    checkoutStep = 'FIND_SETTINGS';

    const [foundSetting] = await db
      .select()
      .from(settings)
      .where(eq(settings.mitraId, mitraId))
      .limit(1);

    const taxRate = normalizeRate(foundSetting?.taxRate ?? 0);
    const serviceRate = normalizeRate(foundSetting?.serviceRate ?? 0);
    const isTaxIncluded = Number(foundSetting?.isTaxIncluded ?? 0) === 1;
    const platformFeeRate = normalizeRate(foundMitra.cashout ?? 0);

    checkoutStep = 'FIND_ACTIVE_CASHIER';

    const activeCashier = await findActiveCashier(mitraId, branchId);

    if (!activeCashier) {
      return jsonError(
        409,
        branchId !== null
          ? 'Tidak ada kasir aktif yang sedang login pada cabang ini.'
          : 'Tidak ada kasir pusat yang sedang login.',
        'ACTIVE_CASHIER_NOT_FOUND',
        { mitraId, branchId },
      );
    }

    const normalizedItemsRaw = cartItems.map((item, index) => {
      const productId = toPositiveInteger(item.menuItemId);
      const quantity = toInteger(item.quantity);

      if (productId === null || quantity <= 0) {
        throw new Error(`Item keranjang ke-${index + 1} tidak valid.`);
      }

      return {
        productId,
        quantity,
        selectedAddOnsDetails: Array.isArray(item.selectedAddOnsDetails)
          ? item.selectedAddOnsDetails
          : [],
        fallbackName: normalizeString(item.name ?? item.title),
      };
    });

    const productIds = normalizedItemsRaw.map((item) => item.productId);

    checkoutStep = 'FIND_PRODUCTS';

    const databaseProducts = await db
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
        mitraId: products.mitra_id,
      })
      .from(products)
      .where(
        and(
          inArray(products.id, productIds),
          eq(products.mitra_id, mitraId),
        ),
      );

    const productMap = new Map(
      databaseProducts.map((product) => [product.id, product]),
    );

    // ==========================================
    // PERBAIKAN: PERHITUNGAN HARGA ADD-ONS
    // ==========================================
    const normalizedItems = normalizedItemsRaw.map((item) => {
      const dbProduct = productMap.get(item.productId);
      if (!dbProduct) {
        throw new Error(`Produk ID ${item.productId} tidak ditemukan pada mitra ini.`);
      }

      let itemPrice = toInteger(dbProduct.price);
      let resolvedAddOnsDetails: Array<any> = [];

      try {
        const rawDetails = typeof item.selectedAddOnsDetails === 'string'
          ? JSON.parse(item.selectedAddOnsDetails)
          : item.selectedAddOnsDetails;

        if (Array.isArray(rawDetails)) {
          resolvedAddOnsDetails = rawDetails;
          rawDetails.forEach((addon: any) => {
            const addOnPrice = Number(addon?.price || 0);
            if (Number.isFinite(addOnPrice) && addOnPrice > 0) {
              itemPrice += Math.floor(addOnPrice); // Tambahkan harga add-on ke harga item
            }
          });
        }
      } catch (err) {
        console.error('Gagal memproses add-ons backend:', err);
      }

      return {
        ...item,
        price: itemPrice, // Harga akhir per item sudah akurat termasuk add-on
        selectedAddOnsDetails: resolvedAddOnsDetails,
      };
    });

    const basePrice = normalizedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    // ==========================================
    // PROTEKSI: SERVER-SIDE DISCOUNT CALCULATION
    // ==========================================
    const submittedDiscountId = toPositiveInteger(discountId);
    let discountValue = 0;
    let validDiscountId: number | null = null;

    if (submittedDiscountId !== null) {
      const [foundCoupon] = await db
        .select()
        .from(coupon)
        .where(
          and(
            eq(coupon.id, submittedDiscountId),
            eq(coupon.mitra_id, mitraId),
            isNull(coupon.deletedAt),
          ),
        )
        .limit(1);

      if (!foundCoupon) {
        return jsonError(
          400,
          'Voucher atau kupon diskon tidak ditemukan atau sudah kedaluwarsa.',
          'INVALID_DISCOUNT',
        );
      }

      const discountRate = Number(foundCoupon.discount_rate || 0);
      const discountPrice = Number(foundCoupon.discount_price || 0);

      if (discountRate > 0) {
        discountValue = Math.floor(basePrice * (discountRate / 100));
      } else if (discountPrice > 0) {
        discountValue = toInteger(discountPrice);
      }

      validDiscountId = foundCoupon.id;
    }

    discountValue = Math.max(0, Math.min(discountValue, basePrice));

    if (basePrice <= 0) {
      return jsonError(400, 'Subtotal tidak valid.', 'INVALID_ORDER_AMOUNT', {
        subtotal: basePrice,
      });
    }

    const subtotalAfterDiscount = basePrice - discountValue;

    let tax = 0;
    let service = 0;
    let finalGrandTotal = 0;

    if (isTaxIncluded) {
      const serviceDecimal = serviceRate / 100;
      const taxDecimal = taxRate / 100;
      const divisor = (1 + serviceDecimal) * (1 + taxDecimal);
      const trueBase = Math.floor(subtotalAfterDiscount / divisor);

      service = Math.floor(trueBase * serviceDecimal);
      tax = subtotalAfterDiscount - trueBase - service;
      finalGrandTotal = subtotalAfterDiscount;
    } else {
      service = Math.floor(subtotalAfterDiscount * (serviceRate / 100));
      tax = Math.floor((subtotalAfterDiscount + service) * (taxRate / 100));
      finalGrandTotal = subtotalAfterDiscount + service + tax;
    }

    const frontendTotal = toInteger(totalAfterDiscount);

    if (finalGrandTotal !== frontendTotal) {
      return jsonError(
        400,
        'Terjadi ketidaksesuaian harga. Silakan muat ulang halaman.',
        'TOTAL_MISMATCH',
        { backendTotal: finalGrandTotal, frontendTotal },
      );
    }

    const platformFee = calculatePlatformFee(finalGrandTotal, platformFeeRate);

    const customerUserId = toPositiveInteger(customer.userId);

    if (customerUserId !== null) {
      const [foundCustomer] = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.id, customerUserId),
            eq(users.mitra_id, mitraId),
            isNull(users.deletedAt),
          ),
        )
        .limit(1);

      if (!foundCustomer) {
        return jsonError(400, 'Member tidak ditemukan pada mitra ini.', 'CUSTOMER_NOT_FOUND');
      }
    }

    const generatedCode = generateOrderCode();
    const now = new Date();
    const midtransOrderId =
      paymentMethod === 'qris' ? `KALOOPOS-${mitraId}-${generatedCode}` : null;

    checkoutStep = 'START_TRANSACTION';

    const transactionResult = await db.transaction(async (tx) => {
      let finalTableId: number | null = null;
      let manualTableInfo: string | null = null;

      const tableNumber = normalizeString(customer.tableNumber);
      const serviceType = normalizeString(
        customer.serviceType ?? body.serviceType,
      ).toLowerCase();
      const submittedManualTableInfo = normalizeString(
        customer.manualTableInfo ?? body.manualTableInfo,
      );

      const isTakeaway =
        serviceType === 'takeaway' ||
        submittedManualTableInfo.toLowerCase() === 'takeaway';

      if (tableNumber && tableNumber.toLowerCase() !== 'walk-in') {
        const tableConditions = [
          eq(tableList.mitra_id, mitraId),
          eq(tableList.table_code, tableNumber),
        ];

        if (branchId !== null) {
          tableConditions.push(eq(tableList.branch_id, branchId));
        } else {
          tableConditions.push(isNull(tableList.branch_id));
        }

        const [foundTable] = await tx
          .select({ id: tableList.id })
          .from(tableList)
          .where(and(...tableConditions))
          .limit(1);

        if (foundTable) {
          finalTableId = foundTable.id;
          await tx
            .update(tableList)
            .set({ 
              status: 2, // 2 artinya Occupied / Terisi
              updatedAt: now 
            })
            .where(eq(tableList.id, finalTableId));
        }
      }

      if (isTakeaway) {
        manualTableInfo = 'Takeaway';
      } else if (!finalTableId && tableNumber && tableNumber.toLowerCase() !== 'walk-in') {
        manualTableInfo = tableNumber;
      }

      checkoutStep = 'PREPARE_ORDER_INSERT';

      const orderValues: typeof orders.$inferInsert = {
        order_code: generatedCode,
        mitra_id: mitraId,
        branch_id: branchId,
        user_id: customerUserId,
        cashier_id: activeCashier.id,
        name: customerName,
        email: customerEmail || null,
        phone_number: customerPhone || null,
        table_number: finalTableId,
        manual_table_info: manualTableInfo,
        total_price: String(basePrice),
        tax: String(tax),
        service: String(service),
        discount: String(discountValue),
        discountId: validDiscountId,
        totalAfterDiscount: String(finalGrandTotal),
        payment_method: paymentMethod,
        idempotencyKey: String(idempotencyKey),
        platformFee: String(platformFee),
        platformFeeRate: String(platformFeeRate),
        paymentPaidAt: null,
        completedAt: null,
        cancelledAt: null,
        cancelReason: null,
        status: 'pending' as const,
        payment_status: '1' as const,
        is_cashouted: false,
        createdAt: now,
        updatedAt: now,
      };

      checkoutStep = 'INSERT_ORDER';

      const insertResults = await tx.insert(orders).values(orderValues);
      const insertResult = insertResults[0];

      if (!insertResult || !insertResult.insertId) {
        throw new Error('Order berhasil diproses tetapi insertId tidak dikembalikan database.');
      }

      const newOrderId = Number(insertResult.insertId);

      checkoutStep = 'PREPARE_ORDER_ITEMS';

      const itemsToInsert = normalizedItems.map((item) => {
        // Ambil data yang sudah diparsing
        const safeNotes = Array.isArray(item.selectedAddOnsDetails)
          ? item.selectedAddOnsDetails
          : [];

        return {
          order_id: newOrderId,
          product_id: item.productId,
          mitra_id: mitraId,
          quantity: item.quantity,
          notes: JSON.stringify(safeNotes),
          price: String(item.price),
          createdAt: now,
        };
      });

      if (itemsToInsert.length === 0) {
        throw new Error('Item order kosong.');
      }

      checkoutStep = 'INSERT_ORDER_ITEMS';

      await tx.insert(orderItems).values(itemsToInsert);

      // ==========================================
      // PENCATATAN & INCREMENT RIWAYAT KUPON
      // ==========================================
      if (validDiscountId !== null && discountValue > 0) {
        const [targetCoupon] = await tx
          .select({ alreadyUsed: coupon.already_used })
          .from(coupon)
          .where(eq(coupon.id, validDiscountId))
          .limit(1);

        if (targetCoupon) {
          await tx
            .update(coupon)
            .set({
              already_used: (targetCoupon.alreadyUsed || 0) + 1,
              updatedAt: new Date(),
            })
            .where(eq(coupon.id, validDiscountId));
        }

        await tx.insert(couponUsages).values({
          coupon_id: validDiscountId,
          order_id: newOrderId,
          mitra_id: mitraId,
          user_id: customerUserId,
          discount_amount: String(discountValue),
          createdAt: now,
        });
      }

      return {
        id: newOrderId,
        code: generatedCode,
        midtransOrderId,
        finalTableId
      };
    });

    if (paymentMethod === 'cash') {
      const tableIdToNotify = transactionResult.finalTableId;
      // console.log(tableIdToNotify);
      if (tableIdToNotify && global.iotClients && global.iotClients.has(tableIdToNotify)) {
        fetch('http://localhost:3009/api/internal/push-iot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableId: tableIdToNotify,
            status: 'occupied',
            order_code: transactionResult.code,
            customer_name: customerName
          })
        }).catch(err => console.error('Gagal memicu IoT push:', err));
      }
      // ==========================================
      return NextResponse.json(
        {
          success: true,
          message: 'Pesanan cash berhasil dibuat.',
          orderCode: transactionResult.code,
          paymentMethod,
          totals: {
            grandTotal: finalGrandTotal,
          },
        },
        { status: 201 },
      );
    }

    if (!serverKey) {
      return jsonError(500, 'MIDTRANS_SERVER_KEY belum dikonfigurasi.', 'MIDTRANS_NOT_CONFIGURED');
    }

    const productNameMap = new Map(
      databaseProducts.map((product) => [String(product.id), product.name]),
    );

    const midtransItems: MidtransItem[] = normalizedItems.map((item) => ({
      id: String(item.productId).substring(0, 50),
      price: item.price, // Harga per item di sini sudah divalidasi ke atas dan ditambah addon
      quantity: item.quantity,
      name: String(
        productNameMap.get(String(item.productId)) ||
          item.fallbackName ||
          `Item ${item.productId}`,
      ).substring(0, 50),
    }));

    if (discountValue > 0) {
      midtransItems.push({
        id: 'DISC',
        price: -discountValue,
        quantity: 1,
        name: 'Discount/Promo',
      });
    }

    if (!isTaxIncluded) {
      if (service > 0) {
        midtransItems.push({
          id: 'SRV',
          price: service,
          quantity: 1,
          name: 'Service Charge',
        });
      }

      if (tax > 0) {
        midtransItems.push({
          id: 'TAX',
          price: tax,
          quantity: 1,
          name: 'Tax / PB1',
        });
      }
    }

    const calculatedMidtransTotal = midtransItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    if (calculatedMidtransTotal !== finalGrandTotal) {
      midtransItems.push({
        id: 'ADJ',
        price: finalGrandTotal - calculatedMidtransTotal,
        quantity: 1,
        name: 'Rounding Adjustment',
      });
    }

    const authString = Buffer.from(`${serverKey}:`).toString('base64');

    checkoutStep = 'MIDTRANS_CHARGE';

    const midtransResponse = await fetch(getMidtransUrl(isProduction), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify({
        payment_type: 'qris',
        transaction_details: {
          order_id: transactionResult.midtransOrderId,
          gross_amount: finalGrandTotal,
        },
        item_details: midtransItems,
        customer_details: {
          first_name: customerName,
          email: customerEmail || undefined,
          phone: customerPhone || undefined,
        },
      }),
    });

    const midtransData = await midtransResponse.json();

    if (!midtransResponse.ok || midtransData.status_code !== '201') {
      return jsonError(
        502,
        midtransData.status_message ?? 'Midtrans gagal membuat transaksi QRIS.',
        'MIDTRANS_CHARGE_FAILED',
        {
          orderCode: transactionResult.code,
        },
      );
    }

    const qrAction = Array.isArray(midtransData.actions)
      ? midtransData.actions.find(
          (action: { name?: string; url?: string }) =>
            action.name === 'generate-qr-code',
        )
      : null;

    checkoutStep = 'UPDATE_QRIS_ORDER';

    await db
      .update(orders)
      .set({
        transaction_id: midtransData.transaction_id ?? null,
        payment_type: midtransData.payment_type ?? 'qris',
        issuer: midtransData.issuer ?? null,
        qr_url: qrAction?.url ?? null,
        qr_string: midtransData.qr_string ?? null,
        expiry_time: midtransData.expiry_time ? new Date(midtransData.expiry_time) : null,
        payment_status: '1',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orders.id, transactionResult.id),
          eq(orders.mitra_id, mitraId),
        ),
      );

    return NextResponse.json(
      {
        success: true,
        message: 'QRIS berhasil dibuat.',
        orderCode: transactionResult.code,
        paymentMethod: 'qris',
        transactionId: midtransData.transaction_id ?? null,
        qrUrl: qrAction?.url ?? null,
        totals: {
          grandTotal: finalGrandTotal,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error('[WEBSITE_CHECKOUT_ERROR]', {
      checkoutStep,
      error,
    });

    if (errorMessage.toLowerCase().includes('duplicate') && errorMessage.toLowerCase().includes('idempotency')) {
      return jsonError(
        409,
        'Request checkout yang sama sedang atau sudah diproses.',
        'IDEMPOTENCY_CONFLICT',
      );
    }

    return jsonError(
      500,
      'Internal Server Error',
      'INTERNAL_SERVER_ERROR',
      process.env.NODE_ENV === 'development'
        ? {
            checkoutStep,
            message: errorMessage,
            stack: error instanceof Error ? error.stack : null,
          }
        : null,
    );
  }
}