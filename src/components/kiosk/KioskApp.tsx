'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  KioskCartModal,
  KioskCatalog,
  KioskIdleGuard,
  KioskMemberModal,
  KioskOrderSuccess,
  KioskPaymentMethod,
  KioskProductModal,
  KioskPromoModal,
  KioskQrisPayment,
  KioskServiceType,
  KioskWelcome,
} from '@/components/kiosk';

import type {
  KioskCartItem,
  KioskCategory,
  KioskCustomer,
  KioskPaymentMethod as PaymentMethod,
  KioskProduct,
  KioskPromo,
  KioskQrisData,
  KioskServiceType as ServiceType,
  KioskStep,
} from '@/components/kiosk/types';

type BootstrapResponse = {
  success: boolean;
  message?: string;
  data?: {
    store: {
      name: string;
      logoUrl?: string | null;
      tagline?: string | null;
      mitraId: number;
      branchId: number | null;
    };
    categories: KioskCategory[];
    products: KioskProduct[];
    promos: KioskPromo[];
  };
};

type CheckoutResponse = {
  success: boolean;
  message?: string;
  orderId?: number;
  orderCode?: string;
  paymentMethod?: PaymentMethod;
  paymentStatus?: string;
  status?: string;
  transactionId?: string | null;
  qrUrl?: string | null;
  qrString?: string | null;
  expiryTime?: string | null;
  totals?: {
    subtotal?: number;
    discount?: number;
    tax?: number;
    service?: number;
    grandTotal?: number;
  };
  error?: {
    code?: string;
    details?: unknown;
  };
};

type CheckoutStatusResponse = {
  success: boolean;
  message?: string;
  paymentStatus?: string;
};

type CouponValidationResponse = {
  success: boolean;
  message?: string;
  code?: string;
  data?: {
    id: number;
    code: string;
    discountRate: number;
    discountPrice: number;
    isMemberOnly: boolean;
  };
};

type KioskAppProps = {
  mitraSlug: string;
  branchSlug?: string;
};

type PaymentState =
  | 'pending'
  | 'paid'
  | 'expired'
  | 'failed';

const DEFAULT_STORE_NAME =
  'EKASIR';

function buildScopeQuery(
  mitraSlug: string,
  branchSlug?: string,
) {
  const query =
    new URLSearchParams({
      slug:
        mitraSlug,
    });

  if (branchSlug) {
    query.set(
      'branch_slug',
      branchSlug,
    );
  }

  return query;
}

function createLineId(
  productId:
    number | string,
) {
  return [
    String(productId),
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 8),
  ].join('-');
}

function normalizePaymentState(
  label?: string,
): PaymentState {
  const normalized =
    String(
      label ?? '',
    )
      .trim()
      .toLowerCase();

  if (
    [
      'paid',
      'settlement',
      'capture',
    ].includes(
      normalized,
    )
  ) {
    return 'paid';
  }

  if (
    [
      'expired',
      'expire',
    ].includes(
      normalized,
    )
  ) {
    return 'expired';
  }

  if (
    [
      'failed',
      'deny',
      'cancel',
      'failure',
    ].includes(
      normalized,
    )
  ) {
    return 'failed';
  }

  return 'pending';
}

export default function KioskApp({
  mitraSlug,
  branchSlug,
}: KioskAppProps) {
  const [step, setStep] =
    useState<KioskStep>(
      'welcome',
    );

  const [store, setStore] =
    useState({
      name:
        DEFAULT_STORE_NAME,
      logoUrl:
        null as string | null,
      tagline:
        null as string | null,
      mitraId:
        0,
      branchId:
        null as number | null,
    });

  const [
    categories,
    setCategories,
  ] =
    useState<KioskCategory[]>(
      [],
    );

  const [
    products,
    setProducts,
  ] =
    useState<KioskProduct[]>(
      [],
    );

  const [
    promos,
    setPromos,
  ] =
    useState<KioskPromo[]>(
      [],
    );

  const [
    promoModalOpen,
    setPromoModalOpen,
  ] =
    useState(false);

  const [
    appliedPromo,
    setAppliedPromo,
  ] =
    useState<KioskPromo | null>(
      null,
    );

  const [
    applyingPromoId,
    setApplyingPromoId,
  ] =
    useState<number | null>(
      null,
    );

  const [
    promoError,
    setPromoError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    activeCategoryId,
    setActiveCategoryId,
  ] =
    useState<
      string | null
    >(null);

  const [
    serviceType,
    setServiceType,
  ] =
    useState<ServiceType | null>(
      null,
    );

  const [
    customer,
    setCustomer,
  ] =
    useState<KioskCustomer | null>(
      null,
    );

  const [
    cartModalOpen,
    setCartModalOpen,
  ] =
    useState(false);

  const [
    memberModalOpen,
    setMemberModalOpen,
  ] =
    useState(false);

  const [cart, setCart] =
    useState<KioskCartItem[]>(
      [],
    );

  const [
    selectedProduct,
    setSelectedProduct,
  ] =
    useState<KioskProduct | null>(
      null,
    );

  const [
    recentlyAdded,
    setRecentlyAdded,
  ] =
    useState<{
      lineId: string;
      productName: string;
    } | null>(null);

  const [
    paymentMethod,
    setPaymentMethod,
  ] =
    useState<PaymentMethod | null>(
      null,
    );

  const [
    paymentStatus,
    setPaymentStatus,
  ] =
    useState<PaymentState>(
      'pending',
    );

  const [qris, setQris] =
    useState<KioskQrisData | null>(
      null,
    );

  const [
    createdOrder,
    setCreatedOrder,
  ] =
    useState<{
      id: number;
      code: string;
    } | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const scopeQuery =
    useMemo(
      () =>
        buildScopeQuery(
          mitraSlug,
          branchSlug,
        ),
      [
        mitraSlug,
        branchSlug,
      ],
    );

  const loadBootstrap =
    useCallback(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response =
          await fetch(
            `/api/kiosk/bootstrap?${scopeQuery.toString()}`,
            {
              credentials:
                'include',
              cache:
                'no-store',
              headers: {
                Accept:
                  'application/json',
              },
            },
          );

        const result =
          await response.json() as
            BootstrapResponse;

        if (
          !response.ok ||
          !result.success ||
          !result.data
        ) {
          throw new Error(
            result.message ||
              'Gagal memuat data kiosk.',
          );
        }

        setStore({
          name:
            result.data.store
              .name,
          logoUrl:
            result.data.store
              .logoUrl ??
            null,
          tagline:
            result.data.store
              .tagline ??
            null,
          mitraId:
            Number(
              result.data.store
                .mitraId,
            ),
          branchId:
            result.data.store
              .branchId ??
            null,
        });

        setCategories(
          result.data.categories ??
            [],
        );

        setProducts(
          result.data.products ??
            [],
        );

        setPromos(
          result.data.promos ??
            [],
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Gagal memuat kiosk.',
        );
      } finally {
        setIsLoading(false);
      }
    }, [scopeQuery]);

  useEffect(() => {
    /*
     * Menjadwalkan bootstrap di callback timer agar update state
     * tidak dijalankan secara sinkron di body effect.
     */
    const timer =
      window.setTimeout(
        () => {
          void loadBootstrap();
        },
        0,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [loadBootstrap]);

  const filteredProducts =
    useMemo(
      () =>
        activeCategoryId ===
        null
          ? products
          : products.filter(
              (product) =>
                product.categoryId ===
                activeCategoryId,
            ),
      [
        activeCategoryId,
        products,
      ],
    );

  const memberOnlyPromos =
    useMemo(
      () =>
        promos.filter(
          (promo) =>
            promo.isMemberOnly,
        ),
      [promos],
    );

  const cartQuantity =
    useMemo(
      () =>
        cart.reduce(
          (
            total,
            item,
          ) =>
            total +
            item.quantity,
          0,
        ),
      [cart],
    );

  const subtotal =
    useMemo(
      () =>
        cart.reduce(
          (
            total,
            item,
          ) => {
            const addOnTotal =
              item.addOns.reduce(
                (
                  sum,
                  addOn,
                ) =>
                  sum +
                  addOn.price,
                0,
              );

            return (
              total +
              (
                item.basePrice +
                addOnTotal
              ) *
                item.quantity
            );
          },
          0,
        ),
      [cart],
    );

  const discountAmount =
    useMemo(() => {
      if (
        !appliedPromo ||
        subtotal <= 0
      ) {
        return 0;
      }

      if (
        appliedPromo.discountRate >
        0
      ) {
        return Math.min(
          subtotal,
          Math.floor(
            subtotal *
            (
              appliedPromo.discountRate /
              100
            ),
          ),
        );
      }

      return Math.min(
        subtotal,
        Math.max(
          0,
          appliedPromo.discountPrice,
        ),
      );
    }, [
      appliedPromo,
      subtotal,
    ]);

  const grandTotal =
    Math.max(
      0,
      subtotal -
      discountAmount,
    );

  const applyPromo =
    async (
      promo:
        KioskPromo,
    ) => {
      setApplyingPromoId(
        promo.id,
      );
      setPromoError(null);

      try {
        const query =
          new URLSearchParams({
            slug:
              mitraSlug,
            code:
              promo.couponCode,
          });

        if (branchSlug) {
          query.set(
            'branch_slug',
            branchSlug,
          );
        }

        if (
          customer?.type ===
            'member' &&
          customer.userId
        ) {
          query.set(
            'user_id',
            String(
              customer.userId,
            ),
          );
        }

        const response =
          await fetch(
            `/api/coupons/validate?${query.toString()}`,
            {
              cache:
                'no-store',
              credentials:
                'include',
              headers: {
                Accept:
                  'application/json',
              },
            },
          );

        const result =
          await response.json() as
            CouponValidationResponse;

        if (
          !response.ok ||
          !result.success ||
          !result.data
        ) {
          throw new Error(
            result.message ||
            'Voucher tidak dapat digunakan.',
          );
        }

        setAppliedPromo({
          ...promo,
          id:
            result.data.id,
          couponCode:
            result.data.code,
          discountRate:
            Number(
              result.data.discountRate ??
              promo.discountRate,
            ),
          discountPrice:
            Number(
              result.data.discountPrice ??
              promo.discountPrice,
            ),
          isMemberOnly:
            Boolean(
              result.data.isMemberOnly,
            ),
        });

        setPromoModalOpen(false);
      } catch (applyError) {
        setPromoError(
          applyError instanceof Error
            ? applyError.message
            : 'Voucher tidak dapat digunakan.',
        );
      } finally {
        setApplyingPromoId(null);
      }
    };

  const removePromo =
    () => {
      setAppliedPromo(null);
      setPromoError(null);
    };

  const resetKiosk =
    useCallback(() => {
      setStep('welcome');
      setServiceType(null);
      setCustomer(null);
      setCartModalOpen(false);
      setMemberModalOpen(false);
      setCart([]);
      setSelectedProduct(null);
      setRecentlyAdded(null);
      setPromoModalOpen(false);
      setAppliedPromo(null);
      setApplyingPromoId(null);
      setPromoError(null);
      setPaymentMethod(null);
      setPaymentStatus(
        'pending',
      );
      setQris(null);
      setCreatedOrder(null);
      setError(null);
      setIsSubmitting(false);
      setActiveCategoryId(null);
    }, []);

  const handleSelectService =
    (
      selected:
        ServiceType,
    ) => {
      setServiceType(
        selected,
      );
      setStep('catalog');
    };

  const handleProductClick =
    (
      product:
        KioskProduct,
    ) => {
      setSelectedProduct(
        product,
      );
    };

  const handleAddProduct =
    (
      item:
        KioskCartItem,
    ) => {
      setCart(
        (current) => [
          ...current,
          item,
        ],
      );

      setSelectedProduct(
        null,
      );

      setRecentlyAdded({
        lineId:
          item.lineId,
        productName:
          item.name,
      });

      window.setTimeout(
        () => {
          setRecentlyAdded(
            (current) =>
              current?.lineId ===
              item.lineId
                ? null
                : current,
          );
        },
        3000,
      );
    };

  const handleUndoRecentlyAdded =
    () => {
      if (!recentlyAdded) {
        return;
      }

      setCart(
        (current) =>
          current.filter(
            (item) =>
              item.lineId !==
              recentlyAdded.lineId,
          ),
      );

      setRecentlyAdded(null);
    };

  const increaseCartItem =
    (
      lineId:
        string,
    ) => {
      setCart(
        (current) =>
          current.map(
            (item) =>
              item.lineId ===
              lineId
                ? {
                    ...item,
                    quantity:
                      item.quantity +
                      1,
                  }
                : item,
          ),
      );
    };

  const decreaseCartItem =
    (
      lineId:
        string,
    ) => {
      setCart(
        (current) =>
          current.flatMap(
            (item) => {
              if (
                item.lineId !==
                lineId
              ) {
                return [
                  item,
                ];
              }

              if (
                item.quantity <=
                1
              ) {
                return [];
              }

              return [
                {
                  ...item,
                  quantity:
                    item.quantity -
                    1,
                },
              ];
            },
          ),
      );
    };

  const removeCartItem =
    (
      lineId:
        string,
    ) => {
      setCart(
        (current) =>
          current.filter(
            (item) =>
              item.lineId !==
              lineId,
          ),
      );
    };

  const continueFromCart =
    () => {
      if (
        cart.length ===
        0
      ) {
        return;
      }

      setCartModalOpen(
        false,
      );

      if (customer) {
        setStep(
          'payment',
        );
        return;
      }

      setMemberModalOpen(
        true,
      );
    };

  const buildOrderPayload =
    (
      method:
        PaymentMethod,
      idempotencyKey:
        string,
    ) => ({
      slug:
        mitraSlug,

      branchId:
        store.branchId,

      idempotencyKey,

      total:
        subtotal,

      discount:
        discountAmount,

      totalAfterDiscount:
        grandTotal,

      discountId:
        appliedPromo?.id ??
        null,

      serviceType:
        serviceType,

      manualTableInfo:
        serviceType ===
        'takeaway'
          ? 'Takeaway'
          : null,

      customer: {
        userId:
          customer?.userId ??
          null,

        name:
          customer?.name ??
          'Kiosk Customer',

        email:
          customer?.email ??
          null,

        phone:
          customer?.phone ??
          null,

        tableNumber:
          serviceType ===
          'takeaway'
            ? 'walk-in'
            : 'walk-in',

        serviceType,

        manualTableInfo:
          serviceType ===
          'takeaway'
            ? 'Takeaway'
            : null,

        method,
      },

      cartItems:
        cart.map(
          (item) => ({
            menuItemId:
              item.productId,

            name:
              item.name,

            quantity:
              item.quantity,

            priceAtOrder:
              item.basePrice +
              item.addOns.reduce(
                (
                  total,
                  addOn,
                ) =>
                  total +
                  addOn.price,
                0,
              ),

            selectedAddOnsDetails:
              item.addOns.map(
                (addOn) => ({
                  id:
                    addOn.id,

                  name:
                    addOn.name,

                  price:
                    addOn.price,
                }),
              ),
          }),
        ),
    });

  const createOrder =
    async (
      method:
        PaymentMethod,
    ) => {
      if (
        cart.length ===
        0 ||
        !serviceType ||
        !customer
      ) {
        setError(
          'Keranjang, tipe layanan, atau data pelanggan belum lengkap.',
        );
        return;
      }

      setPaymentMethod(
        method,
      );
      setIsSubmitting(true);
      setError(null);

      try {
        const idempotencyKey =
          crypto.randomUUID();

        const response =
          await fetch(
            '/api/checkout',
            {
              method:
                'POST',

              credentials:
                'include',

              headers: {
                Accept:
                  'application/json',

                'Content-Type':
                  'application/json',

                'X-Idempotency-Key':
                  idempotencyKey,
              },

              body:
                JSON.stringify(
                  buildOrderPayload(
                    method,
                    idempotencyKey,
                  ),
                ),
            },
          );

        const result =
          await response.json() as
            CheckoutResponse;

        if (
          !response.ok ||
          !result.success ||
          !result.orderId ||
          !result.orderCode
        ) {
          throw new Error(
            result.message ||
              'Gagal membuat pesanan.',
          );
        }

        setCreatedOrder({
          id:
            result.orderId,

          code:
            result.orderCode,
        });

        if (
          method ===
          'qris'
        ) {
          if (!result.qrUrl) {
            throw new Error(
              'URL QRIS tidak ditemukan pada response checkout.',
            );
          }

          setQris({
            transactionId:
              result.transactionId ??
              '',

            qrUrl:
              result.qrUrl,

            qrString:
              result.qrString ??
              null,

            expiryTime:
              result.expiryTime ??
              null,
          });

          setPaymentStatus(
            normalizePaymentState(
              result.paymentStatus ===
              '2'
                ? 'paid'
                : result.paymentStatus ===
                  '3'
                  ? 'expired'
                  : result.paymentStatus ===
                    '4'
                    ? 'failed'
                    : result.status ??
                      'pending',
            ),
          );

          setStep('qris');
          return;
        }

        setStep('success');
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : 'Gagal membuat pesanan.',
        );
      } finally {
        setIsSubmitting(false);
      }
    };

  const pollQrisStatus =
    useCallback(async () => {
      if (
        !createdOrder
      ) {
        return;
      }

      try {
        const query =
          new URLSearchParams({
            orderCode:
              createdOrder.code,
          });

        const response =
          await fetch(
            `/api/checkout/status?${query.toString()}`,
            {
              credentials:
                'include',

              cache:
                'no-store',

              headers: {
                Accept:
                  'application/json',
              },
            },
          );

        const result =
          await response.json() as
            CheckoutStatusResponse;

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              'Gagal mengecek pembayaran.',
          );
        }

        const nextStatus =
          result.paymentStatus ===
          '2'
            ? 'paid'
            : result.paymentStatus ===
              '3'
              ? 'expired'
              : result.paymentStatus ===
                '4'
                ? 'failed'
                : 'pending';

        setPaymentStatus(
          nextStatus,
        );

        if (
          nextStatus ===
          'paid'
        ) {
          setStep(
            'success',
          );
        }
      } catch (
        pollError
      ) {
        console.error(
          '[KIOSK_QRIS_POLL_ERROR]',
          pollError,
        );
      }
    }, [
      createdOrder,
    ]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950 text-white">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-white/20 border-t-amber-300" />
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.28em] text-stone-400">
            Memuat kiosk
          </p>
        </div>
      </div>
    );
  }

  if (error && step === 'welcome') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 p-8">
        <div className="w-full max-w-2xl rounded-[2rem] bg-white p-10 text-center shadow-xl">
          <h1 className="text-4xl font-black text-stone-950">
            Kiosk belum siap
          </h1>
          <p className="mt-4 text-lg text-red-600">
            {error}
          </p>
          <button
            type="button"
            onClick={() =>
              void loadBootstrap()
            }
            className="mt-8 min-h-16 w-full rounded-2xl bg-stone-950 text-xl font-black text-white"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <KioskIdleGuard
      disabled={
        step === 'qris'
      }
      onReset={resetKiosk}
    >
      {step === 'welcome' && (
        <KioskWelcome
          storeName={
            store.name
          }
          logoUrl={
            store.logoUrl
          }
          tagline={
            store.tagline ??
            undefined
          }
          onStart={() =>
            setStep(
              'service-type',
            )
          }
        />
      )}

      {step ===
        'service-type' && (
        <KioskServiceType
          onBack={() =>
            setStep(
              'welcome',
            )
          }
          onSelect={
            handleSelectService
          }
        />
      )}

      {step === 'catalog' && (
        <KioskCatalog
          categories={
            categories
          }
          products={
            filteredProducts
          }
          promos={
            promos
          }
          appliedPromo={
            appliedPromo
          }
          discountAmount={
            discountAmount
          }
          activeCategoryId={
            activeCategoryId
          }
          cartQuantity={
            cartQuantity
          }
          cartTotal={
            subtotal
          }
          finalTotal={
            grandTotal
          }
          onCategoryChange={
            setActiveCategoryId
          }
          onProductClick={
            handleProductClick
          }
          onOpenPromos={() =>
            setPromoModalOpen(
              true,
            )
          }
          onBack={() =>
            setStep(
              'service-type',
            )
          }
          onOpenCart={() =>
            setCartModalOpen(
              true,
            )
          }
        />
      )}

      {step === 'payment' && (
        <div className="relative">
          <KioskPaymentMethod
            subtotal={
              subtotal
            }
            grandTotal={
              grandTotal
            }
            discountAmount={
              discountAmount
            }
            appliedPromo={
              appliedPromo
            }
            memberPromoCount={
              customer?.type ===
              'member'
                ? memberOnlyPromos.length
                : 0
            }
            showMemberVoucher={
              customer?.type ===
              'member'
            }
            onOpenMemberVouchers={() => {
              setPromoError(
                null,
              );
              setPromoModalOpen(
                true,
              );
            }}
            onBack={() => {
              setStep(
                'catalog',
              );
              setCartModalOpen(
                true,
              );
            }}
            onSelect={
              createOrder
            }
          />

          {isSubmitting && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-stone-950/80 backdrop-blur-sm">
              <div className="rounded-[2rem] bg-white p-10 text-center">
                <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-stone-200 border-t-amber-400" />
                <p className="mt-5 text-lg font-black text-stone-900">
                  Membuat pesanan...
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="fixed bottom-8 left-1/2 z-[160] w-[calc(100%-4rem)] max-w-2xl -translate-x-1/2 rounded-2xl bg-red-600 px-6 py-4 text-center font-bold text-white shadow-xl">
              {error}
            </div>
          )}
        </div>
      )}

      {step === 'qris' && (
        <KioskQrisPayment
          qris={qris}
          grandTotal={
            grandTotal
          }
          paymentStatus={
            paymentStatus
          }
          onCancel={
            resetKiosk
          }
          onRetry={() =>
            void createOrder(
              'qris',
            )
          }
          onPoll={
            pollQrisStatus
          }
        />
      )}

      {step === 'success' && (
        <KioskOrderSuccess
          orderCode={
            createdOrder
              ?.code ??
            '-'
          }
          paymentMethod={
            paymentMethod ??
            'cash'
          }
          onFinish={
            resetKiosk
          }
        />
      )}

      <KioskCartModal
        open={
          cartModalOpen
        }
        items={cart}
        subtotal={
          subtotal
        }
        discountAmount={
          discountAmount
        }
        grandTotal={
          grandTotal
        }
        onIncrease={
          increaseCartItem
        }
        onDecrease={
          decreaseCartItem
        }
        onRemove={
          removeCartItem
        }
        onClear={() => {
          setCart([]);
          setAppliedPromo(
            null,
          );
        }}
        onCheckout={
          continueFromCart
        }
        onClose={() =>
          setCartModalOpen(
            false,
          )
        }
      />

      <KioskMemberModal
        open={
          memberModalOpen
        }
        mitraSlug={
          mitraSlug
        }
        branchSlug={
          branchSlug
        }
        onClose={() => {
          setMemberModalOpen(
            false,
          );
          setCartModalOpen(
            true,
          );
        }}
        onContinue={(
          selectedCustomer,
        ) => {
          setCustomer(
            selectedCustomer,
          );
          setMemberModalOpen(
            false,
          );
          setAppliedPromo(
            (current) =>
              current?.isMemberOnly &&
              selectedCustomer.type !==
                'member'
                ? null
                : current,
          );
          setStep(
            'payment',
          );
        }}
      />

      <KioskPromoModal
        open={
          promoModalOpen
        }
        promos={
          step ===
            'payment' &&
          customer?.type ===
            'member'
            ? memberOnlyPromos
            : promos
        }
        appliedPromoId={
          appliedPromo?.id ??
          null
        }
        applyingPromoId={
          applyingPromoId
        }
        errorMessage={
          promoError
        }
        onApply={
          applyPromo
        }
        onRemove={
          removePromo
        }
        onClose={() => {
          setPromoModalOpen(
            false,
          );
          setPromoError(
            null,
          );
        }}
      />

      <KioskProductModal
        open={
          selectedProduct !==
          null
        }
        product={
          selectedProduct
        }
        onClose={() =>
          setSelectedProduct(
            null,
          )
        }
        onAdd={
          handleAddProduct
        }
      />

      {recentlyAdded && (
        <div className="fixed bottom-28 left-1/2 z-[140] flex w-[calc(100%-4rem)] max-w-2xl -translate-x-1/2 items-center justify-between gap-4 rounded-2xl bg-stone-950 px-5 py-4 text-white shadow-2xl">
          <div className="min-w-0">
            <p className="truncate font-black">
              {recentlyAdded.productName} ditambahkan
            </p>
            <p className="mt-1 text-xs text-stone-400">
              Item masuk ke keranjang.
            </p>
          </div>

          <button
            type="button"
            onClick={
              handleUndoRecentlyAdded
            }
            className="shrink-0 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold"
          >
            Batalkan
          </button>
        </div>
      )}
    </KioskIdleGuard>
  );
}
