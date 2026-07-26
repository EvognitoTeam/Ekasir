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

  /*
   * Cabang tempat website pelanggan dibuka.
   * Frontend boleh mengirim branchId atau branch_id.
   */
  branchId?: unknown;
  branch_id?: unknown;

  /*
   * Bisa dikirim dari header atau body.
   */
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
  const method =
    normalizeString(value).toLowerCase();

  if (
    method === 'cash' ||
    method === 'tunai'
  ) {
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
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
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

function generateOrderCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  let result = '';

  for (let index = 0; index < 6; index += 1) {
    result += chars.charAt(
      Math.floor(Math.random() * chars.length),
    );
  }

  return result;
}

function getIdempotencyKey(
  request: Request,
  body: CheckoutBody,
): string {
  return (
    request.headers
      .get('X-Idempotency-Key')
      ?.trim() ||
    request.headers
      .get('Idempotency-Key')
      ?.trim() ||
    normalizeString(
      body.idempotencyKey ??
        body.idempotency_key,
    )
  );
}

function calculatePlatformFee(
  grossAmount: number,
  rate: number,
): number {
  return Math.floor(
    grossAmount * (rate / 100),
  );
}

function getMidtransUrl(
  production: boolean,
): string {
  return production
    ? 'https://api.midtrans.com/v2/charge'
    : 'https://api.sandbox.midtrans.com/v2/charge';
}

/**
 * Mencari kasir aktif berdasarkan:
 * - mitra_id sama dengan mitra order
 * - branch_id sama dengan cabang order
 * - is_login = true
 * - role Cashier atau Owner
 * - belum dihapus
 *
 * Jika lebih dari satu akun sedang login, akun dengan login_at terbaru dipilih.
 */
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
    conditions.push(
      eq(users.branch_id, branchId),
    );
  } else {
    conditions.push(
      isNull(users.branch_id),
    );
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
    .orderBy(
      desc(users.login_at),
      desc(users.id),
    )
    .limit(1);

  return cashier ?? null;
}

export async function POST(
  request: Request,
): Promise<Response> {
  try {
    let body: CheckoutBody;

    try {
      body = (await request.json()) as CheckoutBody;
    } catch {
      return jsonError(
        400,
        'Request body harus berupa JSON yang valid.',
        'INVALID_JSON',
      );
    }

    const {
      total,
      discount,
      totalAfterDiscount,
      customer,
      cartItems,
      discountId,
      slug: rawSlug,
    } = body;

    const slug = normalizeString(rawSlug);

    const branchId = toPositiveInteger(
      body.branchId ??
        body.branch_id,
    );

    const idempotencyKey =
      getIdempotencyKey(
        request,
        body,
      );

    if (!slug) {
      return jsonError(
        400,
        'Slug toko wajib diisi.',
        'SLUG_REQUIRED',
      );
    }

    if (!idempotencyKey) {
      return jsonError(
        400,
        'Idempotency key wajib dikirim.',
        'IDEMPOTENCY_KEY_REQUIRED',
      );
    }

    if (idempotencyKey.length > 100) {
      return jsonError(
        400,
        'Idempotency key maksimal 100 karakter.',
        'IDEMPOTENCY_KEY_TOO_LONG',
      );
    }

    if (
      !customer ||
      !Array.isArray(cartItems) ||
      cartItems.length === 0
    ) {
      return jsonError(
        400,
        'Data pelanggan dan keranjang wajib diisi.',
        'INVALID_CHECKOUT_DATA',
      );
    }

    const customerName =
      normalizeString(customer.name);

    const customerEmail =
      normalizeString(
        customer.email,
      ).toLowerCase();

    const customerPhone =
      normalizeString(customer.phone);

    const paymentMethod =
      normalizePaymentMethod(
        customer.method,
      );

    if (!customerName) {
      return jsonError(
        400,
        'Nama pelanggan wajib diisi.',
        'CUSTOMER_NAME_REQUIRED',
      );
    }

    if (!paymentMethod) {
      return jsonError(
        400,
        'Metode pembayaran tidak valid.',
        'INVALID_PAYMENT_METHOD',
        {
          submittedMethod:
            normalizeString(
              customer.method,
            ),

          allowedPaymentMethods: [
            'cash',
            'qris',
          ],
        },
      );
    }

    const serverKey =
      process.env.MIDTRANS_SERVER_KEY;

    const isProduction =
      process.env.MIDTRANS_IS_PRODUCTION ===
      'true';

    const [foundMitra] = await db
      .select()
      .from(mitra)
      .where(
        eq(
          mitra.mitra_slug,
          slug,
        ),
      )
      .limit(1);

    if (!foundMitra) {
      return jsonError(
        404,
        'Mitra tidak ditemukan.',
        'MITRA_NOT_FOUND',
      );
    }

    const mitraId = foundMitra.id;

    /*
     * Cegah order ganda untuk request checkout yang sama.
     */
    const [existingOrder] = await db
      .select({
        id: orders.id,
        orderCode: orders.order_code,
        paymentMethod:
          orders.payment_method,
        paymentStatus:
          orders.payment_status,
        status: orders.status,
        qrUrl: orders.qr_url,
        qrString: orders.qr_string,
        expiryTime:
          orders.expiry_time,
        transactionId:
          orders.transaction_id,
      })
      .from(orders)
      .where(
        and(
          eq(
            orders.mitra_id,
            mitraId,
          ),
          eq(
            orders.idempotencyKey,
            idempotencyKey,
          ),
          isNull(
            orders.deletedAt,
          ),
        ),
      )
      .limit(1);

    if (existingOrder) {
      return NextResponse.json({
        success: true,
        reused: true,
        idempotentReplay: true,
        message:
          'Request checkout ini sudah pernah diproses.',

        orderId:
          existingOrder.id,

        orderCode:
          existingOrder.orderCode,

        paymentMethod:
          existingOrder.paymentMethod,

        paymentStatus:
          existingOrder.paymentStatus,

        status:
          existingOrder.status,

        qrUrl:
          existingOrder.qrUrl ??
          null,

        qrString:
          existingOrder.qrString ??
          null,

        expiryTime:
          existingOrder.expiryTime ??
          null,

        transactionId:
          existingOrder.transactionId ??
          null,
      });
    }

    const [foundSetting] = await db
      .select()
      .from(settings)
      .where(
        eq(
          settings.mitraId,
          mitraId,
        ),
      )
      .limit(1);

    const taxRate =
      normalizeRate(
        foundSetting?.taxRate ??
          0,
      );

    const serviceRate =
      normalizeRate(
        foundSetting?.serviceRate ??
          0,
      );

    const isTaxIncluded =
      Number(
        foundSetting?.isTaxIncluded ??
          0,
      ) === 1;

    /*
     * Snapshot rate platform pada saat checkout.
     * Payout nantinya membaca nilai yang sudah tersimpan di orders.
     */
    const platformFeeRate =
      normalizeRate(
        foundMitra.cashout ??
          0,
      );

    /*
     * Checkout website tetap mengisi cashier_id.
     * Kasir dipilih dari users yang sedang login pada mitra dan cabang sama.
     */
    const activeCashier =
      await findActiveCashier(
        mitraId,
        branchId,
      );

    if (!activeCashier) {
      return jsonError(
        409,
        branchId !== null
          ? 'Tidak ada kasir aktif yang sedang login pada cabang ini.'
          : 'Tidak ada kasir pusat yang sedang login.',
        'ACTIVE_CASHIER_NOT_FOUND',
        {
          mitraId,
          branchId,
        },
      );
    }

    const basePrice =
      toInteger(total);

    const discountValue =
      Math.max(
        0,
        toInteger(discount),
      );

    if (
      basePrice <= 0 ||
      discountValue > basePrice
    ) {
      return jsonError(
        400,
        'Subtotal atau diskon tidak valid.',
        'INVALID_ORDER_AMOUNT',
        {
          subtotal:
            basePrice,

          discount:
            discountValue,
        },
      );
    }

    const subtotalAfterDiscount =
      basePrice -
      discountValue;

    let tax = 0;
    let service = 0;
    let finalGrandTotal = 0;

    if (isTaxIncluded) {
      const serviceDecimal =
        serviceRate / 100;

      const taxDecimal =
        taxRate / 100;

      const divisor =
        (
          1 +
          serviceDecimal
        ) *
        (
          1 +
          taxDecimal
        );

      const trueBase =
        Math.floor(
          subtotalAfterDiscount /
            divisor,
        );

      service =
        Math.floor(
          trueBase *
            serviceDecimal,
        );

      tax =
        subtotalAfterDiscount -
        trueBase -
        service;

      finalGrandTotal =
        subtotalAfterDiscount;
    } else {
      service =
        Math.floor(
          subtotalAfterDiscount *
            (
              serviceRate /
              100
            ),
        );

      tax =
        Math.floor(
          (
            subtotalAfterDiscount +
            service
          ) *
            (
              taxRate /
              100
            ),
        );

      finalGrandTotal =
        subtotalAfterDiscount +
        service +
        tax;
    }

    const frontendTotal =
      toInteger(
        totalAfterDiscount,
      );

    if (
      finalGrandTotal !==
      frontendTotal
    ) {
      console.error(
        '[CHECKOUT_TOTAL_MISMATCH]',
        {
          backend:
            finalGrandTotal,

          frontend:
            frontendTotal,

          subtotal:
            basePrice,

          discount:
            discountValue,

          tax,
          service,
        },
      );

      return jsonError(
        400,
        'Terjadi ketidaksesuaian harga. Silakan muat ulang halaman.',
        'TOTAL_MISMATCH',
        {
          backendTotal:
            finalGrandTotal,

          frontendTotal,
        },
      );
    }

    /*
     * Platform fee berlaku untuk semua metode pembayaran.
     */
    const platformFee =
      calculatePlatformFee(
        finalGrandTotal,
        platformFeeRate,
      );

    const customerUserId =
      toPositiveInteger(
        customer.userId,
      );

    if (customerUserId !== null) {
      const [foundCustomer] = await db
        .select({
          id: users.id,
        })
        .from(users)
        .where(
          and(
            eq(
              users.id,
              customerUserId,
            ),
            eq(
              users.mitra_id,
              mitraId,
            ),
            isNull(
              users.deletedAt,
            ),
          ),
        )
        .limit(1);

      if (!foundCustomer) {
        return jsonError(
          400,
          'Member tidak ditemukan pada mitra ini.',
          'CUSTOMER_NOT_FOUND',
        );
      }
    }

    const normalizedItems =
      cartItems.map(
        (
          item,
          index,
        ) => {
          const productId =
            toPositiveInteger(
              item.menuItemId,
            );

          const quantity =
            toInteger(
              item.quantity,
            );

          const price =
            toInteger(
              item.priceAtOrder,
            );

          if (
            productId === null ||
            quantity <= 0 ||
            price < 0
          ) {
            throw new Error(
              `Item keranjang ke-${index + 1} tidak valid.`,
            );
          }

          return {
            productId,
            quantity,
            price,

            selectedAddOnsDetails:
              item.selectedAddOnsDetails ??
              [],

            fallbackName:
              normalizeString(
                item.name ??
                  item.title,
              ),
          };
        },
      );

    const productIds =
      normalizedItems.map(
        (item) =>
          item.productId,
      );

    const databaseProducts =
      await db
        .select({
          id:
            products.id,

          name:
            products.name,

          mitraId:
            products.mitra_id,
        })
        .from(products)
        .where(
          and(
            inArray(
              products.id,
              productIds,
            ),
            eq(
              products.mitra_id,
              mitraId,
            ),
          ),
        );

    const productMap =
      new Map(
        databaseProducts.map(
          (product) => [
            product.id,
            product,
          ],
        ),
      );

    for (
      const item of normalizedItems
    ) {
      if (
        !productMap.has(
          item.productId,
        )
      ) {
        return jsonError(
          400,
          `Produk ID ${item.productId} tidak ditemukan pada mitra ini.`,
          'PRODUCT_NOT_FOUND',
        );
      }
    }

    /*
     * priceAtOrder diasumsikan sudah termasuk add-on terpilih.
     */
    const calculatedItemSubtotal =
      normalizedItems.reduce(
        (
          sum,
          item,
        ) =>
          sum +
          item.price *
            item.quantity,
        0,
      );

    if (
      calculatedItemSubtotal !==
      basePrice
    ) {
      return jsonError(
        400,
        'Subtotal item tidak sesuai dengan nilai checkout.',
        'ITEM_SUBTOTAL_MISMATCH',
        {
          calculated:
            calculatedItemSubtotal,

          submitted:
            basePrice,
        },
      );
    }

    const generatedCode =
      generateOrderCode();

    const now = new Date();

    const paymentReference =
      paymentMethod === 'qris'
        ? `EKASIR-${mitraId}-${generatedCode}`
        : null;

    const transactionResult =
      await db.transaction(
        async (tx) => {
          let finalTableId:
            | number
            | null = null;

          let manualTableInfo:
            | string
            | null = null;

          const tableNumber =
            normalizeString(
              customer.tableNumber,
            );

          if (
            tableNumber &&
            tableNumber.toLowerCase() !==
              'walk-in'
          ) {
            const [foundTable] =
              await tx
                .select({
                  id:
                    tableList.id,
                })
                .from(tableList)
                .where(
                  and(
                    eq(
                      tableList.mitra_id,
                      mitraId,
                    ),
                    eq(
                      tableList.table_code,
                      tableNumber,
                    ),
                  ),
                )
                .limit(1);

            if (foundTable) {
              finalTableId =
                foundTable.id;
            } else {
              manualTableInfo =
                tableNumber;
            }
          }

          const [insertResult] =
            await tx
              .insert(orders)
              .values({
                order_code:
                  generatedCode,

                mitra_id:
                  mitraId,

                branch_id:
                  branchId,

                user_id:
                  customerUserId,

                /*
                 * Kasir aktif yang login pada mitra dan cabang terkait.
                 */
                cashier_id:
                  activeCashier.id,

                name:
                  customerName,

                email:
                  customerEmail ||
                  null,

                phone_number:
                  customerPhone ||
                  null,

                table_number:
                  finalTableId,

                manual_table_info:
                  manualTableInfo,

                total_price:
                  String(
                    basePrice,
                  ),

                discount:
                  String(
                    discountValue,
                  ),

                tax:
                  String(tax),

                service:
                  String(service),

                totalAfterDiscount:
                  String(
                    finalGrandTotal,
                  ),

                payment_method:
                  paymentMethod,

                discountId:
                  toPositiveInteger(
                    discountId,
                  ),

                idempotencyKey,

                platformFee:
                  String(
                    platformFee,
                  ),

                platformFeeRate:
                  String(
                    platformFeeRate,
                  ),

                paymentPaidAt:
                  null,

                completedAt:
                  null,

                cancelledAt:
                  null,

                cancelReason:
                  null,

                status:
                  'pending',

                payment_status:
                  '1',

                is_cashouted:
                  false,

                createdAt:
                  now,

                updatedAt:
                  now,
              });

          const newOrderId =
            insertResult.insertId;

          const itemsToInsert =
            normalizedItems.map(
              (item) => ({
                order_id:
                  newOrderId,

                product_id:
                  item.productId,

                mitra_id:
                  mitraId,

                quantity:
                  item.quantity,

                notes:
                  JSON.stringify(
                    item.selectedAddOnsDetails,
                  ),

                price:
                  String(
                    item.price,
                  ),

                createdAt:
                  now,
              }),
            );

          await tx
            .insert(orderItems)
            .values(
              itemsToInsert,
            );

          return {
            id:
              newOrderId,

            code:
              generatedCode,

            paymentReference,
          };
        },
      );

    if (paymentMethod === 'cash') {
      return NextResponse.json(
        {
          success: true,
          message:
            'Pesanan cash berhasil dibuat.',

          orderId:
            transactionResult.id,

          orderCode:
            transactionResult.code,

          cashier: {
            id:
              activeCashier.id,

            name:
              activeCashier.name,

            role:
              activeCashier.role,

            branchId:
              activeCashier.branchId,
          },

          paymentMethod,
          paymentStatus:
            '1',

          status:
            'pending',

          idempotencyKey,

          totals: {
            subtotal:
              basePrice,

            discount:
              discountValue,

            tax,
            service,

            grandTotal:
              finalGrandTotal,

            platformFeeRate,
            platformFee,
          },
        },
        {
          status: 201,
        },
      );
    }

    if (paymentMethod !== 'qris') {
      return NextResponse.json(
        {
          success: true,
          message:
            'Pesanan berhasil dibuat.',

          orderId:
            transactionResult.id,

          orderCode:
            transactionResult.code,

          cashier: {
            id:
              activeCashier.id,

            name:
              activeCashier.name,

            role:
              activeCashier.role,

            branchId:
              activeCashier.branchId,
          },

          paymentMethod,
          paymentStatus:
            '1',

          status:
            'pending',

          idempotencyKey,

          totals: {
            subtotal:
              basePrice,

            discount:
              discountValue,

            tax,
            service,

            grandTotal:
              finalGrandTotal,

            platformFeeRate,
            platformFee,
          },
        },
        {
          status: 201,
        },
      );
    }

    if (!serverKey) {
      return jsonError(
        500,
        'MIDTRANS_SERVER_KEY belum dikonfigurasi.',
        'MIDTRANS_NOT_CONFIGURED',
      );
    }

    const productNameMap =
      new Map(
        databaseProducts.map(
          (product) => [
            String(
              product.id,
            ),
            product.name,
          ],
        ),
      );

    const midtransItems:
      MidtransItem[] =
      normalizedItems.map(
        (item) => ({
          id:
            String(
              item.productId,
            ).substring(
              0,
              50,
            ),

          price:
            item.price,

          quantity:
            item.quantity,

          name:
            String(
              productNameMap.get(
                String(
                  item.productId,
                ),
              ) ||
                item.fallbackName ||
                `Item ${item.productId}`,
            ).substring(
              0,
              50,
            ),
        }),
      );

    if (discountValue > 0) {
      midtransItems.push({
        id: 'DISC',
        price:
          -discountValue,
        quantity: 1,
        name:
          'Discount/Promo',
      });
    }

    if (!isTaxIncluded) {
      if (service > 0) {
        midtransItems.push({
          id: 'SRV',
          price: service,
          quantity: 1,
          name:
            'Service Charge',
        });
      }

      if (tax > 0) {
        midtransItems.push({
          id: 'TAX',
          price: tax,
          quantity: 1,
          name:
            'Tax / PB1',
        });
      }
    }

    const calculatedMidtransTotal =
      midtransItems.reduce(
        (
          sum,
          item,
        ) =>
          sum +
          item.price *
            item.quantity,
        0,
      );

    if (
      calculatedMidtransTotal !==
      finalGrandTotal
    ) {
      midtransItems.push({
        id: 'ADJ',
        price:
          finalGrandTotal -
          calculatedMidtransTotal,
        quantity: 1,
        name:
          'Rounding Adjustment',
      });
    }

    const authString =
      Buffer.from(
        `${serverKey}:`,
      ).toString(
        'base64',
      );

    const midtransResponse =
      await fetch(
        getMidtransUrl(
          isProduction,
        ),
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            Authorization:
              `Basic ${authString}`,
          },

          body:
            JSON.stringify({
              payment_type:
                'qris',

              transaction_details: {
                order_id:
                  transactionResult.paymentReference,

                gross_amount:
                  finalGrandTotal,
              },

              item_details:
                midtransItems,

              customer_details: {
                first_name:
                  customerName,

                email:
                  customerEmail ||
                  undefined,

                phone:
                  customerPhone ||
                  undefined,
              },
            }),
        },
      );

    const midtransData =
      await midtransResponse.json();

    if (
      !midtransResponse.ok ||
      midtransData.status_code !==
        '201'
    ) {
      console.error(
        '[MIDTRANS_CHARGE_FAILED]',
        midtransData,
      );

      return jsonError(
        502,
        midtransData.status_message ??
          'Midtrans gagal membuat transaksi QRIS.',
        'MIDTRANS_CHARGE_FAILED',
        {
          orderId:
            transactionResult.id,

          orderCode:
            transactionResult.code,

          paymentReference:
            transactionResult.paymentReference,

          providerResponse:
            process.env.NODE_ENV ===
              'development'
              ? midtransData
              : undefined,
        },
      );
    }

    const qrAction =
      Array.isArray(
        midtransData.actions,
      )
        ? midtransData.actions.find(
            (
              action: {
                name?: string;
                url?: string;
              },
            ) =>
              action.name ===
              'generate-qr-code-v2',
          )
        : null;

    await db
      .update(orders)
      .set({
        transaction_id:
          midtransData.transaction_id ??
          null,

        payment_type:
          midtransData.payment_type ??
          'qris',

        issuer:
          midtransData.issuer ??
          null,

        qr_url:
          qrAction?.url ??
          null,

        qr_string:
          midtransData.qr_string ??
          null,

        expiry_time:
          midtransData.expiry_time
            ? new Date(
                midtransData.expiry_time,
              )
            : null,

        payment_status:
          '1',

        updatedAt:
          new Date(),
      })
      .where(
        and(
          eq(
            orders.id,
            transactionResult.id,
          ),
          eq(
            orders.mitra_id,
            mitraId,
          ),
        ),
      );

    return NextResponse.json(
      {
        success: true,
        message:
          'QRIS berhasil dibuat.',

        orderId:
          transactionResult.id,

        orderCode:
          transactionResult.code,

        cashier: {
          id:
            activeCashier.id,

          name:
            activeCashier.name,

          role:
            activeCashier.role,

          branchId:
            activeCashier.branchId,
        },

        idempotencyKey,

        paymentMethod:
          'qris',

        paymentProvider:
          'midtrans',

        paymentReference:
          transactionResult.paymentReference,

        transactionId:
          midtransData.transaction_id ??
          null,

        qrUrl:
          qrAction?.url ??
          null,

        qrString:
          midtransData.qr_string ??
          null,

        expiryTime:
          midtransData.expiry_time ??
          null,

        totals: {
          subtotal:
            basePrice,

          discount:
            discountValue,

          tax,
          service,

          grandTotal:
            finalGrandTotal,

          platformFeeRate,
          platformFee,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      '[WEBSITE_CHECKOUT_ERROR]',
      error,
    );

    if (
      errorMessage
        .toLowerCase()
        .includes('duplicate') &&
      errorMessage
        .toLowerCase()
        .includes('idempotency')
    ) {
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
      process.env.NODE_ENV ===
        'development'
        ? {
            message:
              errorMessage,

            stack:
              error instanceof Error
                ? error.stack
                : null,
          }
        : null,
    );
  }
}