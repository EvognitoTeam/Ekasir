import {
  NextResponse,
} from 'next/server';

import {
  db,
} from '@/db';

import {
  orders,
  orderItems,
  mitra,
  tableList,
  settings,
} from '@/db/schema';

import {
  and,
  eq,
  isNull,
} from 'drizzle-orm';

import {
  cookies,
} from 'next/headers';

import {
  jwtVerify,
  type JWTPayload,
} from 'jose';

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
    slug?: string;
    role?: string;
  };

type CustomerPayload = {
  userId?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  tableNumber?: unknown;
  manualTableInfo?: unknown;
  serviceType?: unknown;
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

type PosOrderPayload = {
  total?: unknown;
  discount?: unknown;
  totalAfterDiscount?: unknown;

  customer?: CustomerPayload;
  cartItems?: CartItemPayload[];

  discountId?: unknown;
  cashierId?: unknown;
  branch_id?: unknown;

  /*
   * Kompatibilitas payload POS lama.
   */
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  userId?: unknown;
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

function normalizeString(
  value:
    unknown,
): string {
  return String(
    value ??
    '',
  ).trim();
}

function normalizeNumber(
  value:
    unknown,
): number {
  const number =
    Number(
      value ??
      0,
    );

  return Number.isFinite(
    number,
  )
    ? number
    : 0;
}

function normalizePaymentMethod(
  value:
    unknown,
): 'cash' | 'qris' {
  const normalized =
    normalizeString(
      value,
    ).toLowerCase();

  return normalized ===
    'qris'
      ? 'qris'
      : 'cash';
}

function normalizeNullableInteger(
  value:
    unknown,
): number | null {
  if (
    value ===
      undefined ||
    value ===
      null ||
    value ===
      ''
  ) {
    return null;
  }

  const number =
    Number(
      value,
    );

  return Number.isInteger(
    number,
  )
    ? number
    : null;
}

function generateOrderCode() {
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

function jsonError(
  status:
    number,
  message:
    string,
) {
  return NextResponse.json(
    {
      success:
        false,
      message,
    },
    {
      status,
    },
  );
}

export async function POST(
  request:
    Request,
) {
  try {
    const auth =
      await getAuthPayload();

    if (!auth) {
      return jsonError(
        401,
        'Unauthorized',
      );
    }

    const rawBody =
      await request.json() as
        PosOrderPayload;

    /*
     * customer tidak boleh langsung di-destructure dari body.
     * Payload POS lama tidak selalu mengirim object customer.
     */
    const customer = {
      userId:
        normalizeNullableInteger(
          rawBody.customer
            ?.userId ??
          rawBody.userId,
        ),

      name:
        normalizeString(
          rawBody.customer
            ?.name ??
          rawBody.name ??
          'Tamu Kasir',
        ) ||
        'Tamu Kasir',

      email:
        normalizeString(
          rawBody.customer
            ?.email ??
          rawBody.email,
        ) ||
        null,

      phone:
        normalizeString(
          rawBody.customer
            ?.phone ??
          rawBody.phone,
        ) ||
        null,

      tableNumber:
        normalizeString(
          rawBody.customer
            ?.tableNumber ??
          rawBody.tableNumber ??
          rawBody.table_number,
        ),

      manualTableInfo:
        normalizeString(
          rawBody.customer
            ?.manualTableInfo ??
          rawBody.manualTableInfo ??
          rawBody.manual_table_info,
        ),

      serviceType:
        normalizeString(
          rawBody.customer
            ?.serviceType ??
          rawBody.serviceType ??
          rawBody.orderType ??
          'takeaway',
        ).toLowerCase(),

      method:
        normalizePaymentMethod(
          rawBody.customer
            ?.method ??
          rawBody.method ??
          rawBody.paymentMethod ??
          'cash',
        ),
    };

    const cartItems =
      Array.isArray(
        rawBody.cartItems,
      )
        ? rawBody.cartItems
        : Array.isArray(
            rawBody.items,
          )
          ? rawBody.items
          : [];

    if (
      cartItems.length ===
      0
    ) {
      return jsonError(
        400,
        'Keranjang pesanan kosong.',
      );
    }

    const total =
      normalizeNumber(
        rawBody.total,
      );

    const discount =
      Math.max(
        0,
        normalizeNumber(
          rawBody.discount,
        ),
      );

    const totalAfterDiscount =
      normalizeNumber(
        rawBody.totalAfterDiscount,
      );

    const discountId =
      normalizeNullableInteger(
        rawBody.discountId,
      );

    const requestedCashierId =
      normalizeNullableInteger(
        rawBody.cashierId,
      );

    const serverKey =
      process.env
        .MIDTRANS_SERVER_KEY;

    const isProd =
      process.env
        .MIDTRANS_IS_PRODUCTION ===
      'true';

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
      );
    }

    const normalizedRole =
      normalizeString(
        auth.role,
      ).toLowerCase();

    const isBranchScopedStaff =
      normalizedRole ===
        'cashier' ||
      normalizedRole ===
        'kitchen';

    const requestedBranchId =
      normalizeNullableInteger(
        rawBody.branch_id,
      );

    const finalBranchId =
      isBranchScopedStaff
        ? normalizeNullableInteger(
            auth.branchId,
          )
        : requestedBranchId;

    /*
     * Kasir sebaiknya memakai userId sesi sebagai cashier_id.
     * cashierId dari request hanya menjadi fallback untuk owner.
     */
    const finalCashierId =
      normalizedRole ===
        'cashier'
        ? normalizeNullableInteger(
            auth.userId,
          )
        : (
            requestedCashierId ??
            normalizeNullableInteger(
              auth.userId,
            )
          );

    /*
     * Prioritas settings:
     * 1. setting cabang;
     * 2. setting global mitra.
     */
    let foundSettings:
      Array<
        typeof settings.$inferSelect
      > =
        [];

    if (
      finalBranchId !==
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
                finalBranchId,
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
      foundSettings[0] || {
        taxRate:
          0,
        serviceRate:
          0,
        isTaxIncluded:
          0,
      };

    const subTotal =
      Math.floor(
        totalAfterDiscount ||
        Math.max(
          0,
          total -
            discount,
        ),
      );

    let tax =
      0;

    let service =
      0;

    let finalGrandTotal =
      0;

    if (
      Number(
        storeSettings.isTaxIncluded,
      ) ===
      1
    ) {
      const serviceRate =
        normalizeNumber(
          storeSettings.serviceRate,
        ) /
        100;

      const taxRate =
        normalizeNumber(
          storeSettings.taxRate,
        ) /
        100;

      const divisor =
        (
          1 +
          serviceRate
        ) *
        (
          1 +
          taxRate
        );

      const trueBase =
        divisor >
        0
          ? Math.floor(
              subTotal /
                divisor,
            )
          : subTotal;

      service =
        Math.floor(
          trueBase *
            serviceRate,
        );

      tax =
        subTotal -
        trueBase -
        service;

      finalGrandTotal =
        subTotal;
    } else {
      service =
        Math.floor(
          subTotal *
            (
              normalizeNumber(
                storeSettings.serviceRate,
              ) /
              100
            ),
        );

      tax =
        Math.floor(
          (
            subTotal +
            service
          ) *
            (
              normalizeNumber(
                storeSettings.taxRate,
              ) /
              100
            ),
        );

      finalGrandTotal =
        subTotal +
        service +
        tax;
    }

    const generatedCode =
      generateOrderCode();

    const now =
      new Date();

    const result =
      await db.transaction(
        async (
          tx,
        ) => {
          let finalTableId:
            number |
            null =
              null;

          let manualInfo:
            string |
            null =
              null;

          const tableValue =
            customer.tableNumber;

          const normalizedTableValue =
            tableValue.toLowerCase();

          const isWalkIn =
            [
              '',
              'walk-in',
              'walk in',
              'walk_in',
            ].includes(
              normalizedTableValue,
            );

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
                  tableValue,
                ),
              ];

            if (
              finalBranchId !==
              null
            ) {
              tableConditions.push(
                eq(
                  tableList.branch_id,
                  finalBranchId,
                ),
              );
            } else {
              tableConditions.push(
                isNull(
                  tableList.branch_id,
                ),
              );
            }

            const foundTable =
              await tx
                .select()
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
              foundTable.length >
              0
            ) {
              finalTableId =
                foundTable[0].id;
            } else {
              manualInfo =
                tableValue;
            }
          }

          /*
           * manualTableInfo dari frontend dipakai bila:
           * - meja tidak ditemukan;
           * - tipe order takeaway;
           * - frontend memang mengirim lokasi/meja manual.
           */
          if (
            customer.manualTableInfo
          ) {
            manualInfo =
              customer.manualTableInfo;
          } else if (
            customer.serviceType ===
              'takeaway' &&
            !manualInfo
          ) {
            manualInfo =
              'Takeaway';
          }

          const orderValues:
            typeof orders.$inferInsert = {
                order_code:
                  generatedCode,

                mitra_id:
                  mitraId,

                branch_id:
                  finalBranchId,

                cashier_id:
                  finalCashierId,

                user_id:
                  customer.userId,

                name:
                  customer.name,

                email:
                  customer.email,

                phone_number:
                  customer.phone,

                table_number:
                  finalTableId,

                manual_table_info:
                  manualInfo,

                total_price:
                  String(
                    Math.floor(
                      total,
                    ),
                  ),

                discount:
                  String(
                    Math.floor(
                      discount,
                    ),
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

                discountId,

                status:
                  'pending',

                payment_status:
                  '1',

                createdAt:
                  now,

                updatedAt:
                  now,
              };

          const [
            orderResult,
          ] =
            await tx
              .insert(
                orders,
              )
              .values(
                orderValues
              );


          const newOrderId =
            Number(
              orderResult.insertId,
            );

          const itemsToInsert =
            cartItems.map(
              (
                item,
              ) => {
                const productId =
                  normalizeNullableInteger(
                    item.menuItemId ??
                    item.product_id,
                  );

                if (!productId) {
                  throw new Error(
                    'Produk pada keranjang tidak valid.',
                  );
                }

                const quantity =
                  Math.max(
                    1,
                    Math.floor(
                      normalizeNumber(
                        item.quantity,
                      ) ||
                      1,
                    ),
                  );

                const itemPrice =
                  Math.max(
                    0,
                    Math.floor(
                      normalizeNumber(
                        item.priceAtOrder ??
                        item.price,
                      ),
                    ),
                  );

                return {
                  order_id:
                    newOrderId,

                  product_id:
                    productId,

                  mitra_id:
                    mitraId,

                  branch_id:
                    finalBranchId,

                  quantity,

                  notes:
                    JSON.stringify(
                      Array.isArray(
                        item.selectedAddOnsDetails,
                      )
                        ? item.selectedAddOnsDetails
                        : [],
                    ),

                  price:
                    String(
                      itemPrice,
                    ),

                  createdAt:
                    now,
                };
              },
            );

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
          };
        },
      );

    if (
      customer.method ===
      'qris'
    ) {
      if (!serverKey) {
        return jsonError(
          500,
          'MIDTRANS_SERVER_KEY belum dikonfigurasi.',
        );
      }

      const apiUrl =
        isProd
          ? 'https://api.midtrans.com/v2/charge'
          : 'https://api.sandbox.midtrans.com/v2/charge';

      const authString =
        Buffer.from(
          `${serverKey}:`,
        ).toString(
          'base64',
        );

      const midtransItems =
        cartItems.map(
          (
            item,
          ) => ({
            id:
              String(
                item.menuItemId ??
                item.product_id,
              ).substring(
                0,
                50,
              ),

            price:
              Math.floor(
                normalizeNumber(
                  item.priceAtOrder ??
                  item.price,
                ),
              ),

            quantity:
              Math.max(
                1,
                Math.floor(
                  normalizeNumber(
                    item.quantity,
                  ) ||
                  1,
                ),
              ),

            name:
              String(
                item.name ||
                item.title ||
                `Menu Item ${
                  item.menuItemId ??
                  item.product_id
                }`,
              ).substring(
                0,
                50,
              ),
          }),
        );

      if (
        discount >
        0
      ) {
        midtransItems.push({
          id:
            'DISC',
          price:
            -Math.floor(
              discount,
            ),
          quantity:
            1,
          name:
            'Discount/Promo',
        });
      }

      if (
        Number(
          storeSettings.isTaxIncluded,
        ) ===
        0
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

      const calculatedSum =
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
        calculatedSum !==
        finalGrandTotal
      ) {
        midtransItems.push({
          id:
            'ADJ',
          price:
            finalGrandTotal -
            calculatedSum,
          quantity:
            1,
          name:
            'Rounding Adjustment',
        });
      }

      const midtransRes =
        await fetch(
          apiUrl,
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
                    `${result.code}-${Date.now()}`,

                  gross_amount:
                    finalGrandTotal,
                },

                item_details:
                  midtransItems,

                customer_details: {
                  first_name:
                    customer.name,

                  email:
                    customer.email,

                  phone:
                    customer.phone,
                },
              }),
          },
        );

      const data =
        await midtransRes.json();

      if (
        String(
          data.status_code,
        ) ===
        '201'
      ) {
        const qrAction =
          data.actions?.find(
            (
              action:
                any,
            ) =>
              action.name ===
              'generate-qr-code-v2',
          );

        await db
          .update(
            orders,
          )
          .set({
            transaction_id:
              data.transaction_id,

            qr_url:
              qrAction?.url,

            qr_string:
              data.qr_string,

            expiry_time:
              data.expiry_time
                ? new Date(
                    data.expiry_time,
                  )
                : null,

            updatedAt:
              new Date(),
          })
          .where(
            eq(
              orders.id,
              result.id,
            ),
          );

        return NextResponse.json({
          success:
            true,
          qrUrl:
            qrAction?.url,
          orderId:
            result.id,
          orderCode:
            result.code,
          expiryTime:
            data.expiry_time,
        });
      }

      return jsonError(
        400,
        data.status_message ||
        'Midtrans gagal memproses QRIS',
      );
    }

    return NextResponse.json({
      success:
        true,
      message:
        'Pesanan berhasil dibuat',
      orderId:
        result.id,
      orderCode:
        result.code,
    });
  } catch (error) {
    console.error(
      'Checkout Error:',
      error,
    );

    return NextResponse.json(
      {
        success:
          false,
        message:
          error instanceof
          Error
            ? error.message
            : 'Internal Server Error',
      },
      {
        status:
          500,
      },
    );
  }
}