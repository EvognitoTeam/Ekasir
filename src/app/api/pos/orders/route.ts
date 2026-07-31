import {
  NextResponse,
} from 'next/server';

import {
  cookies,
} from 'next/headers';

import {
  jwtVerify,
  type JWTPayload,
} from 'jose';

import {
  and,
  eq,
  inArray,
  isNull,
} from 'drizzle-orm';

import {
  db,
} from '@/db';

import {
  orderItems,
  orders,
  products,
  settings,
  tableList,
} from '@/db/schema';

export const dynamic =
  'force-dynamic';

export const runtime =
  'nodejs';

const SECRET_KEY =
  new TextEncoder().encode(
    process.env.JWT_SECRET ||
      'rahasia-super-aman-evokasir-2026',
  );

type AuthPayload =
  JWTPayload & {
    userId?: number;
    mitraId?: number;
    branchId?: number | null;
    role?: string;
    slug?: string;
  };

type PaymentMethod =
  | 'cash'
  | 'qris';

type CustomerPayload = {
  userId?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  tableNumber?: unknown;
  serviceType?: unknown;
  manualTableInfo?: unknown;
  method?: unknown;
};

type CartItemPayload = {
  menuItemId?: unknown;
  product_id?: unknown;
  quantity?: unknown;
  selectedAddOnsDetails?: unknown;
  priceAtOrder?: unknown;
  price?: unknown;
  name?: unknown;
  title?: unknown;
};

type CheckoutBody = {
  total?: unknown;
  subtotal?: unknown;
  discount?: unknown;
  totalAfterDiscount?: unknown;
  totalPrice?: unknown;

  customer?: CustomerPayload;
  cartItems?: CartItemPayload[];

  discountId?: unknown;
  cashierId?: unknown;
  branchId?: unknown;
  branch_id?: unknown;

  idempotencyKey?: unknown;
  idempotency_key?: unknown;

  getPayment?: unknown;
  cashChange?: unknown;

  /*
   * Kompatibilitas payload POS lama.
   */
  userId?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  tableNumber?: unknown;
  table_number?: unknown;
  manualTableInfo?: unknown;
  manual_table_info?: unknown;
  serviceType?: unknown;
  orderType?: unknown;
  method?: unknown;
  paymentMethod?: unknown;
  items?: CartItemPayload[];
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
  code =
    'REQUEST_FAILED',
  details:
    unknown =
      null,
) {
  return NextResponse.json(
    {
      success:
        false,
      message,
      error: {
        code,
        details,
      },
    },
    {
      status,
    },
  );
}

function normalizeString(
  value:
    unknown,
): string {
  return String(
    value ??
      '',
  ).trim();
}

function toInteger(
  value:
    unknown,
): number {
  const parsed =
    Number(
      value ??
        0,
    );

  return Number.isFinite(
    parsed,
  )
    ? Math.floor(
        parsed,
      )
    : 0;
}

function toPositiveInteger(
  value:
    unknown,
): number | null {
  if (
    value ===
      null ||
    value ===
      undefined ||
    value ===
      ''
  ) {
    return null;
  }

  const parsed =
    Number(
      value,
    );

  return Number.isInteger(
    parsed,
  ) &&
    parsed >
      0
    ? parsed
    : null;
}

function normalizeRate(
  value:
    unknown,
): number {
  const parsed =
    Number(
      value ??
        0,
    );

  return Number.isFinite(
    parsed,
  ) &&
    parsed >=
      0
    ? parsed
    : 0;
}

function normalizePaymentMethod(
  value:
    unknown,
): PaymentMethod | null {
  const method =
    normalizeString(
      value,
    ).toLowerCase();

  if (
    method ===
      'cash' ||
    method ===
      'tunai'
  ) {
    return 'cash';
  }

  if (
    method ===
    'qris'
  ) {
    return 'qris';
  }

  return null;
}

function generateOrderCode():
string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  let result =
    '';

  for (
    let index = 0;
    index <
      6;
    index +=
      1
  ) {
    result +=
      chars.charAt(
        Math.floor(
          Math.random() *
            chars.length,
        ),
      );
  }

  return result;
}

function createIdempotencyKey(
  body:
    CheckoutBody,
  mitraId:
    number,
): string {
  const submitted =
    normalizeString(
      body.idempotencyKey ??
        body.idempotency_key,
    );

  if (
    submitted
  ) {
    return submitted.slice(
      0,
      100,
    );
  }

  return [
    'POS',
    mitraId,
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 10),
  ].join(
    '-',
  );
}

function calculatePlatformFee(
  grossAmount:
    number,
  rate:
    number,
): number {
  return Math.floor(
    grossAmount *
      (
        rate /
        100
      ),
  );
}

function getMidtransUrl(
  production:
    boolean,
): string {
  return production
    ? 'https://api.midtrans.com/v2/charge'
    : 'https://api.sandbox.midtrans.com/v2/charge';
}

async function getAuthPayload():
Promise<AuthPayload | null> {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      'ekasir_session',
    )?.value;

  if (!token) {
    return null;
  }

  try {
    const verified =
      await jwtVerify(
        token,
        SECRET_KEY,
      );

    return verified.payload as
      AuthPayload;
  } catch {
    return null;
  }
}

export async function POST(
  request:
    Request,
) {
  let checkoutStep =
    'START';

  try {
    checkoutStep =
      'AUTH';

    const auth =
      await getAuthPayload();

    if (!auth) {
      return jsonError(
        401,
        'Unauthorized',
        'UNAUTHORIZED',
      );
    }

    checkoutStep =
      'PARSE_REQUEST';

    const body =
      await request.json() as
        CheckoutBody;

    const mitraId =
      Number(
        auth.mitraId,
      );

    if (
      !Number.isInteger(
        mitraId,
      ) ||
      mitraId <=
        0
    ) {
      return jsonError(
        403,
        'Scope mitra tidak valid.',
        'INVALID_MITRA_SCOPE',
      );
    }

    const normalizedRole =
      normalizeString(
        auth.role,
      ).toLowerCase();

    const isBranchStaff =
      normalizedRole ===
        'cashier' ||
      normalizedRole ===
        'kitchen';

    const requestedBranchId =
      toPositiveInteger(
        body.branchId ??
        body.branch_id,
      );

    const branchId =
      isBranchStaff
        ? toPositiveInteger(
            auth.branchId,
          )
        : requestedBranchId;

    const customer = {
      userId:
        toPositiveInteger(
          body.customer
            ?.userId ??
          body.userId,
        ),

      name:
        normalizeString(
          body.customer
            ?.name ??
          body.name ??
          'Tamu Kasir',
        ) ||
        'Tamu Kasir',

      email:
        normalizeString(
          body.customer
            ?.email ??
          body.email,
        ).toLowerCase(),

      phone:
        normalizeString(
          body.customer
            ?.phone ??
          body.phone,
        ),

      tableNumber:
        normalizeString(
          body.customer
            ?.tableNumber ??
          body.tableNumber ??
          body.table_number,
        ),

      serviceType:
        normalizeString(
          body.customer
            ?.serviceType ??
          body.serviceType ??
          body.orderType ??
          'takeaway',
        ).toLowerCase(),

      manualTableInfo:
        normalizeString(
          body.customer
            ?.manualTableInfo ??
          body.manualTableInfo ??
          body.manual_table_info,
        ),

      method:
        normalizePaymentMethod(
          body.customer
            ?.method ??
          body.method ??
          body.paymentMethod,
        ),
    };

    if (
      !customer.method
    ) {
      return jsonError(
        400,
        'Metode pembayaran tidak valid.',
        'INVALID_PAYMENT_METHOD',
        {
          allowed:
            [
              'cash',
              'qris',
            ],
        },
      );
    }

    const cartItems =
      Array.isArray(
        body.cartItems,
      )
        ? body.cartItems
        : Array.isArray(
            body.items,
          )
          ? body.items
          : [];

    if (
      cartItems.length ===
      0
    ) {
      return jsonError(
        400,
        'Keranjang pesanan kosong.',
        'EMPTY_CART',
      );
    }

    /*
     * Rumus nominal dibuat sama dengan self-checkout:
     * subtotal = total,
     * subtotal setelah diskon = subtotal - diskon,
     * pajak dan service dihitung server.
     */
    const basePrice =
      toInteger(
        body.total ??
        body.subtotal,
      );

    const discountValue =
      Math.max(
        0,
        toInteger(
          body.discount,
        ),
      );

    if (
      basePrice <=
        0 ||
      discountValue >
        basePrice
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

    checkoutStep =
      'NORMALIZE_ITEMS';

    const normalizedItems =
      cartItems.map(
        (
          item,
          index,
        ) => {
          const productId =
            toPositiveInteger(
              item.menuItemId ??
              item.product_id,
            );

          const quantity =
            toInteger(
              item.quantity,
            );

          const price =
            toInteger(
              item.priceAtOrder ??
              item.price,
            );

          if (
            productId ===
              null ||
            quantity <=
              0 ||
            price <
              0
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
              Array.isArray(
                item.selectedAddOnsDetails,
              )
                ? item.selectedAddOnsDetails
                : [],

            fallbackName:
              normalizeString(
                item.name ??
                item.title,
              ),
          };
        },
      );

    const calculatedItemSubtotal =
      normalizedItems.reduce(
        (
          sum,
          item,
        ) =>
          sum +
          (
            item.price *
            item.quantity
          ),
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

    checkoutStep =
      'FIND_PRODUCTS';

    const productIds =
      [
        ...new Set(
          normalizedItems.map(
            (
              item,
            ) =>
              item.productId,
          ),
        ),
      ];

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
        .from(
          products,
        )
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
          (
            product,
          ) => [
            Number(
              product.id,
            ),
            product,
          ],
        ),
      );

    for (
      const item of
      normalizedItems
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

    checkoutStep =
      'FIND_SETTINGS';

    let foundSettings:
      Array<
        typeof settings.$inferSelect
      > =
        [];

    if (
      branchId !==
      null
    ) {
      foundSettings =
        await db
          .select()
          .from(
            settings,
          )
          .where(
            and(
              eq(
                settings.mitraId,
                mitraId,
              ),
              eq(
                settings.branch_id,
                branchId,
              ),
            ),
          )
          .limit(
            1,
          );
    }

    if (
      foundSettings.length ===
      0
    ) {
      foundSettings =
        await db
          .select()
          .from(
            settings,
          )
          .where(
            and(
              eq(
                settings.mitraId,
                mitraId,
              ),
              isNull(
                settings.branch_id,
              ),
            ),
          )
          .limit(
            1,
          );
    }

    const storeSettings =
      foundSettings[0];

    const taxRate =
      normalizeRate(
        storeSettings
          ?.taxRate ??
        0,
      );

    const serviceRate =
      normalizeRate(
        storeSettings
          ?.serviceRate ??
        0,
      );

    const isTaxIncluded =
      Number(
        storeSettings
          ?.isTaxIncluded ??
        0,
      ) ===
      1;

    const subtotalAfterDiscount =
      basePrice -
      discountValue;

    let tax =
      0;

    let service =
      0;

    let finalGrandTotal =
      0;

    if (
      isTaxIncluded
    ) {
      const serviceDecimal =
        serviceRate /
        100;

      const taxDecimal =
        taxRate /
        100;

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
        divisor >
          0
          ? Math.floor(
              subtotalAfterDiscount /
                divisor,
            )
          : subtotalAfterDiscount;

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

    const submittedGrandTotal =
      toInteger(
        body.totalAfterDiscount ??
        body.totalPrice,
      );

    if (
      submittedGrandTotal >
        0 &&
      submittedGrandTotal !==
        finalGrandTotal
    ) {
      return jsonError(
        400,
        'Terjadi ketidaksesuaian harga. Silakan muat ulang halaman.',
        'TOTAL_MISMATCH',
        {
          backendTotal:
            finalGrandTotal,
          frontendTotal:
            submittedGrandTotal,
          subtotal:
            basePrice,
          discount:
            discountValue,
          tax,
          service,
        },
      );
    }

    const platformFeeRate =
      normalizeRate(
        /*
         * POS memakai snapshot rate yang sama seperti self-checkout.
         * Bila field cashout tersedia di payload auth, gunakan itu.
         * Selain itu tetap 0 dan tidak memengaruhi total customer.
         */
        (
          auth as
            AuthPayload & {
              cashout?:
                unknown;
            }
        ).cashout ??
        0,
      );

    const platformFee =
      calculatePlatformFee(
        finalGrandTotal,
        platformFeeRate,
      );

    const idempotencyKey =
      createIdempotencyKey(
        body,
        mitraId,
      );

    const cashierId =
      normalizedRole ===
        'cashier'
        ? toPositiveInteger(
            auth.userId,
          )
        : (
            toPositiveInteger(
              body.cashierId,
            ) ??
            toPositiveInteger(
              auth.userId,
            )
          );

    const generatedCode =
      generateOrderCode();

    const now =
      new Date();

    checkoutStep =
      'START_TRANSACTION';

    const transactionResult =
      await db.transaction(
        async (
          tx,
        ) => {
          let finalTableId:
            number |
            null =
              null;

          let manualTableInfo:
            string |
            null =
              null;

          const normalizedTable =
            customer.tableNumber
              .toLowerCase();

          const isWalkIn =
            [
              '',
              'walk-in',
              'walk in',
              'walk_in',
            ].includes(
              normalizedTable,
            );

          const isTakeaway =
            customer.serviceType ===
              'takeaway' ||
            customer.manualTableInfo
              .toLowerCase() ===
              'takeaway';

          if (
            !isWalkIn
          ) {
            const tableConditions =
              [
                eq(
                  tableList.mitra_id,
                  mitraId,
                ),
                eq(
                  tableList.table_code,
                  customer.tableNumber,
                ),
              ];

            if (
              branchId !==
              null
            ) {
              tableConditions.push(
                eq(
                  tableList.branch_id,
                  branchId,
                ),
              );
            } else {
              tableConditions.push(
                isNull(
                  tableList.branch_id,
                ),
              );
            }

            const [
              foundTable,
            ] =
              await tx
                .select({
                  id:
                    tableList.id,
                })
                .from(
                  tableList,
                )
                .where(
                  and(
                    ...tableConditions,
                  ),
                )
                .limit(
                  1,
                );

            if (
              foundTable
            ) {
              finalTableId =
                foundTable.id;
            }
          }

          if (
            isTakeaway
          ) {
            manualTableInfo =
              'Takeaway';
          } else if (
            customer.manualTableInfo
          ) {
            manualTableInfo =
              customer.manualTableInfo;
          } else if (
            !finalTableId &&
            !isWalkIn
          ) {
            manualTableInfo =
              customer.tableNumber;
          }

          const getPayment =
            customer.method ===
              'cash'
              ? Math.max(
                  finalGrandTotal,
                  toInteger(
                    body.getPayment,
                  ),
                )
              : finalGrandTotal;

          const cashChange =
            customer.method ===
              'cash'
              ? Math.max(
                  0,
                  toInteger(
                    body.cashChange,
                  ) ||
                  (
                    getPayment -
                    finalGrandTotal
                  ),
                )
              : 0;

          const orderValues:
            typeof orders.$inferInsert = {
            order_code:
              generatedCode,

            mitra_id:
              mitraId,

            branch_id:
              branchId,

            cashier_id:
              cashierId,

            user_id:
              customer.userId,

            name:
              customer.name,

            email:
              customer.email ||
              null,

            phone_number:
              customer.phone ||
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
              String(
                tax,
              ),

            service:
              String(
                service,
              ),

            totalAfterDiscount:
              String(
                finalGrandTotal,
              ),

            payment_method:
              customer.method,

            discountId:
              toPositiveInteger(
                body.discountId,
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

            getPayment:
              String(
                getPayment,
              ),

            cashChange:
              String(
                cashChange,
              ),

            status:
              'confirmed',

            payment_status:
              '2',

            createdAt:
              now,

            updatedAt:
              now,
          };

          checkoutStep =
            'INSERT_ORDER';

          const [
            insertResult,
          ] =
            await tx
              .insert(
                orders,
              )
              .values(
                orderValues,
              );

          const newOrderId =
            Number(
              insertResult.insertId,
            );

          if (
            !newOrderId
          ) {
            throw new Error(
              'Database tidak mengembalikan insertId order.',
            );
          }

          const itemsToInsert =
            normalizedItems.map(
              (
                item,
              ) => ({
                order_id:
                  newOrderId,

                product_id:
                  item.productId,

                mitra_id:
                  mitraId,

                branch_id:
                  branchId,

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

          checkoutStep =
            'INSERT_ORDER_ITEMS';

          await tx
            .insert(
              orderItems,
            )
            .values(
              itemsToInsert,
            );

          return {
            id:
              newOrderId,
            code:
              generatedCode,
            getPayment,
            cashChange,
            tableId:
              finalTableId,
            manualTableInfo,
          };
        },
      );

    let qrisResult: {
      qrUrl:
        string | null;
      qrString:
        string | null;
      expiryTime:
        string | null;
      transactionId:
        string | null;
    } | null =
      null;

    if (
      customer.method ===
      'qris'
    ) {
      const serverKey =
        process.env
          .MIDTRANS_SERVER_KEY;

      if (!serverKey) {
        return jsonError(
          500,
          'MIDTRANS_SERVER_KEY belum dikonfigurasi.',
          'MIDTRANS_NOT_CONFIGURED',
        );
      }

      const isProduction =
        process.env
          .MIDTRANS_IS_PRODUCTION ===
        'true';

      const productNameMap =
        new Map(
          databaseProducts.map(
            (
              product,
            ) => [
              Number(
                product.id,
              ),
              product.name,
            ],
          ),
        );

      const midtransItems:
        MidtransItem[] =
          normalizedItems.map(
            (
              item,
            ) => ({
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
                    item.productId,
                  ) ||
                  item.fallbackName ||
                  `Item ${item.productId}`,
                ).substring(
                  0,
                  50,
                ),
            }),
          );

      if (
        discountValue >
        0
      ) {
        midtransItems.push({
          id:
            'DISC',
          price:
            -discountValue,
          quantity:
            1,
          name:
            'Discount/Promo',
        });
      }

      if (
        !isTaxIncluded
      ) {
        if (
          service >
          0
        ) {
          midtransItems.push({
            id:
              'SRV',
            price:
              service,
            quantity:
              1,
            name:
              'Service Charge',
          });
        }

        if (
          tax >
          0
        ) {
          midtransItems.push({
            id:
              'TAX',
            price:
              tax,
            quantity:
              1,
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
            (
              item.price *
              item.quantity
            ),
          0,
        );

      if (
        calculatedMidtransTotal !==
        finalGrandTotal
      ) {
        midtransItems.push({
          id:
            'ADJ',
          price:
            finalGrandTotal -
            calculatedMidtransTotal,
          quantity:
            1,
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

      checkoutStep =
        'MIDTRANS_CHARGE';

      const midtransResponse =
        await fetch(
          getMidtransUrl(
            isProduction,
          ),
          {
            method:
              'POST',

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
                    `EKASIR-POS-${mitraId}-${generatedCode}`,

                  gross_amount:
                    finalGrandTotal,
                },

                item_details:
                  midtransItems,

                customer_details: {
                  first_name:
                    customer.name,

                  email:
                    customer.email ||
                    undefined,

                  phone:
                    customer.phone ||
                    undefined,
                },
              }),
          },
        );

      const midtransData =
        await midtransResponse.json();

      if (
        !midtransResponse.ok ||
        String(
          midtransData.status_code,
        ) !==
          '201'
      ) {
        return jsonError(
          502,
          midtransData.status_message ??
            'Midtrans gagal membuat transaksi QRIS.',
          'MIDTRANS_CHARGE_FAILED',
          {
            orderId:
              transactionResult.id,
          },
        );
      }

      const qrAction =
        Array.isArray(
          midtransData.actions,
        )
          ? midtransData.actions.find(
              (
                action:
                  {
                    name?:
                      string;
                    url?:
                      string;
                  },
              ) =>
                action.name ===
                'generate-qr-code-v2',
            )
          : null;

      await db
        .update(
          orders,
        )
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

      qrisResult = {
        qrUrl:
          qrAction?.url ??
          null,

        qrString:
          midtransData.qr_string ??
          null,

        expiryTime:
          midtransData.expiry_time ??
          null,

        transactionId:
          midtransData.transaction_id ??
          null,
      };
    }

    /*
     * Object printOrder dikembalikan lengkap agar frontend dapat langsung
     * mencetak struk customer tanpa fetch riwayat order lagi.
     */
    const printOrder = {
      id:
        transactionResult.id,

      order_code:
        transactionResult.code,

      branch_id:
        branchId,

      customerName:
        customer.name,

      name:
        customer.name,

      email:
        customer.email ||
        null,

      phone_number:
        customer.phone ||
        null,

      table_number:
        transactionResult.tableId,

      manual_table_info:
        transactionResult.manualTableInfo,

      orderType:
        customer.serviceType ===
          'takeaway'
          ? 'takeaway'
          : 'dine-in',

      order_type:
        customer.serviceType ===
          'takeaway'
          ? 'takeaway'
          : 'dine-in',

      serviceType:
        customer.serviceType ===
          'takeaway'
          ? 'takeaway'
          : 'dine_in',

      service_type:
        customer.serviceType ===
          'takeaway'
          ? 'takeaway'
          : 'dine_in',

      paymentMethod:
        customer.method,

      payment_method:
        customer.method,

      paymentStatus:
        '1',

      payment_status:
        '1',

      status:
        'pending',

      subtotal:
        basePrice,

      total_price:
        String(
          basePrice,
        ),

      discount:
        String(
          discountValue,
        ),

      tax:
        String(
          tax,
        ),

      service:
        String(
          service,
        ),

      serviceCharge:
        service,

      totalAfterDiscount:
        String(
          finalGrandTotal,
        ),

      total_after_discount:
        String(
          finalGrandTotal,
        ),

      totalPrice:
        finalGrandTotal,

      getPayment:
        transactionResult.getPayment,

      get_payment:
        transactionResult.getPayment,

      cashChange:
        transactionResult.cashChange,

      cash_change:
        transactionResult.cashChange,

      is_tax_included:
        isTaxIncluded
          ? 1
          : 0,

      isTaxIncluded:
        isTaxIncluded
          ? 1
          : 0,

      createdAt:
        now.toISOString(),

      created_at:
        now.toISOString(),

      items:
        normalizedItems.map(
          (
            item,
          ) => ({
            product_id:
              item.productId,

            menuItemId:
              String(
                item.productId,
              ),

            name:
              productMap.get(
                item.productId,
              )?.name ??
              item.fallbackName ??
              'Produk',

            quantity:
              item.quantity,

            price:
              String(
                item.price,
              ),

            priceAtOrder:
              item.price,

            selectedAddOnsDetails:
              item.selectedAddOnsDetails,

            notes:
              JSON.stringify(
                item.selectedAddOnsDetails,
              ),
          }),
        ),
    };

    return NextResponse.json(
      {
        success:
          true,

        message:
          customer.method ===
            'qris'
            ? 'QRIS berhasil dibuat.'
            : 'Pesanan berhasil dibuat.',

        orderId:
          transactionResult.id,

        orderCode:
          transactionResult.code,

        paymentMethod:
          customer.method,

        paymentStatus:
          '1',

        status:
          'pending',

        idempotencyKey,

        qrUrl:
          qrisResult?.qrUrl ??
          null,

        qrString:
          qrisResult?.qrString ??
          null,

        expiryTime:
          qrisResult?.expiryTime ??
          null,

        transactionId:
          qrisResult?.transactionId ??
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

        /*
         * Digunakan langsung oleh frontend untuk cetak customer.
         */
        printOrder,
        data:
          printOrder,
      },
      {
        status:
          201,
      },
    );
  } catch (
    error
  ) {
    const message =
      error instanceof
      Error
        ? error.message
        : String(
            error,
          );

    console.error(
      '[POS_CHECKOUT_ERROR]',
      {
        checkoutStep,
        error,
      },
    );

    return jsonError(
      500,
      message ||
        'Internal Server Error',
      'INTERNAL_SERVER_ERROR',
      process.env.NODE_ENV ===
        'development'
        ? {
            checkoutStep,
            message,
          }
        : null,
    );
  }
}
