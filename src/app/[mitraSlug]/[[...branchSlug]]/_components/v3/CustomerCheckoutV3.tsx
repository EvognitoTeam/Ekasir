"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  Loader2,
  Minus,
  Plus,
  QrCode,
  Tag,
  Ticket,
  Trash2,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import { useMenuStore } from "@/store/menu.store";
import { useOrderStore } from "@/store/order.store";
import { useTableStore } from "@/store/table.store";
import {
  applyFallbackImage,
  normalizeImageSrc,
} from "@/utils/image";
import { Toast } from "@/utils/toast";

type Props = {
  onBack: () => void;
  onSuccess: () => void;
};

type CheckoutStep =
  | "review"
  | "payment"
  | "qris";

type SettingsState = {
  taxRate: number;
  serviceRate: number;
  isTaxIncluded: boolean;
};

type PublicVoucher = {
  id: number | string;
  coupon_code?: string;
  code?: string;
  title?: string;
  description?: string;

  discount_rate?: number | string | null;
  discount_price?: number | string | null;

  min_purchase?: number | string | null;
  max_discount?: number | string | null;

  max_use?: number | string | null;
  already_used?: number | string | null;

  expired_date?: string | null;

  is_auto_apply?: boolean | number;
  is_member_only?: boolean | number;
  is_claimable?: boolean | number;

  applicable_items?: unknown[];
};

const RESERVED_VIEWS = new Set([
  "menu",
  "checkout",
  "tracking",
  "history",
  "help",
  "profile",
  "coupons",
  "roasts",
  "reservation",
]);

const money = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  })
    .format(Number(value || 0))
    .replace(/\s/g, "");

function getItemPrice(
  cartItem: any,
  product: any,
): number {
  if (!product) {
    return 0;
  }

  let result = Number(
    product.basePrice || 0,
  );

  const selectedSize =
    product.meta?.sizes?.find(
      (size: any) =>
        size.label ===
        cartItem.options?.size,
    );

  if (selectedSize) {
    result = Number(
      selectedSize.price || 0,
    );
  }

  for (const addonId of
    cartItem.selectedAddOns || []) {
    for (const group of
      product.categorizedAddons || []) {
      const addon =
        group.addons?.find(
          (candidate: any) =>
            Number(candidate.id) ===
            Number(addonId),
        );

      if (addon) {
        result += Number(
          addon.price || 0,
        );
      }
    }
  }

  return result;
}

function getItemOptions(
  cartItem: any,
  product: any,
): string[] {
  const labels: string[] = [];

  if (cartItem.options?.size) {
    labels.push(
      String(cartItem.options.size),
    );
  }

  for (const addonId of
    cartItem.selectedAddOns || []) {
    for (const group of
      product?.categorizedAddons || []) {
      const addon =
        group.addons?.find(
          (candidate: any) =>
            Number(candidate.id) ===
            Number(addonId),
        );

      if (addon?.name) {
        labels.push(
          String(addon.name),
        );
      }
    }
  }

  return labels;
}

function isTrue(value: unknown) {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true"
  );
}

function isVoucherPublic(
  voucher: PublicVoucher,
) {
  /*
   * Voucher "publik" untuk list checkout:
   * - tidak member-only
   * - tidak perlu claim dulu
   *
   * Eligibility final tetap divalidasi endpoint /api/coupons/validate.
   */
  return (
    !isTrue(voucher.is_member_only) &&
    !isTrue(voucher.is_claimable)
  );
}

function isVoucherActive(
  voucher: PublicVoucher,
) {
  const maxUse = Number(
    voucher.max_use || 0,
  );

  const used = Number(
    voucher.already_used || 0,
  );

  if (
    maxUse > 0 &&
    used >= maxUse
  ) {
    return false;
  }

  if (
    voucher.expired_date &&
    new Date(
      voucher.expired_date,
    ).getTime() <= Date.now()
  ) {
    return false;
  }

  return true;
}

function voucherValueLabel(
  voucher: PublicVoucher,
) {
  const rate = Number(
    voucher.discount_rate || 0,
  );

  if (rate > 0) {
    return `${rate}% OFF`;
  }

  const fixed = Number(
    voucher.discount_price || 0,
  );

  if (fixed > 0) {
    return money(fixed);
  }

  return "PROMO";
}

function calculateIncludedBreakdown(
  subtotalAfterDiscount: number,
  serviceRate: number,
  taxRate: number,
) {
  /*
   * MUST match the checkout backend exactly.
   *
   * Backend included-price formula:
   * divisor = (1 + service) * (1 + tax)
   * trueBase = floor(total / divisor)
   * service = floor(trueBase * serviceRate)
   * tax = total - trueBase - service
   *
   * Total is NOT increased when isTaxIncluded=true.
   */
  const serviceDecimal =
    serviceRate / 100;

  const taxDecimal =
    taxRate / 100;

  const divisor =
    (1 + serviceDecimal) *
    (1 + taxDecimal);

  const base =
    divisor > 0
      ? Math.floor(
          subtotalAfterDiscount /
            divisor,
        )
      : Math.floor(
          subtotalAfterDiscount,
        );

  const service =
    Math.max(
      0,
      Math.floor(
        base *
          serviceDecimal,
      ),
    );

  const tax =
    Math.max(
      0,
      Math.floor(
        subtotalAfterDiscount -
          base -
          service,
      ),
    );

  return {
    base:
      Math.max(
        0,
        base,
      ),
    service,
    tax,
  };
}

export default function CustomerCheckoutV3({
  onBack,
  onSuccess,
}: Props) {
  const params = useParams();

  const slug = String(
    params.mitraSlug || "",
  );

  const routeSegments =
    Array.isArray(params.branchSlug)
      ? params.branchSlug
      : [];

  const branchSlug =
    routeSegments[0] &&
    !RESERVED_VIEWS.has(
      routeSegments[0],
    )
      ? routeSegments[0]
      : null;

  const cart =
    useCartStore();

  const menuItems =
    useMenuStore(
      (state) =>
        state.items,
    );

  const {
    createOrder,
  } =
    useOrderStore();

  const auth =
    useAuthStore();

  const {
    tableCode,
    tableName,
  } =
    useTableStore();

  const cartItems =
    cart.getCartBySlug(
      slug,
    );

  const appliedCoupon =
    cart.getAppliedCoupon(
      slug,
    );

  const [
    step,
    setStep,
  ] =
    useState<CheckoutStep>(
      "review",
    );

  const [
    settings,
    setSettings,
  ] =
    useState<SettingsState>({
      taxRate: 0,
      serviceRate: 0,
      isTaxIncluded: false,
    });

  const [
    publicVouchers,
    setPublicVouchers,
  ] =
    useState<
      PublicVoucher[]
    >([]);

  const [
    loadingVouchers,
    setLoadingVouchers,
  ] =
    useState(false);

  const [
    applyingCode,
    setApplyingCode,
  ] =
    useState<
      string | null
    >(null);

  const [
    showManualCode,
    setShowManualCode,
  ] =
    useState(false);

  const [
    manualCoupon,
    setManualCoupon,
  ] =
    useState("");

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    customer,
    setCustomer,
  ] =
    useState({
      name: "",
      email: "",
      phone: "",
      serviceType:
        tableCode
          ? "dine_in"
          : "takeaway",
      method: "qris",
      orderType: "online",
    });

  const [
    order,
    setOrder,
  ] =
    useState<any>(null);

  const [
    qrisCountdown,
    setQrisCountdown,
  ] =
    useState("");

  useEffect(() => {
    if (!slug) {
      return;
    }

    const controller =
      new AbortController();

    async function loadCheckoutData() {
      setLoadingVouchers(
        true,
      );

      try {
        const couponQuery =
          new URLSearchParams({
            slug,
          });

        if (branchSlug) {
          couponQuery.set(
            "branch_slug",
            branchSlug,
          );
        }

        const [
          settingsResponse,
          authResponse,
          vouchersResponse,
        ] =
          await Promise.all([
            fetch(
              `/api/settings?slug=${encodeURIComponent(
                slug,
              )}`,
              {
                signal:
                  controller.signal,
              },
            ),

            fetch(
              `/api/auth/me?slug=${encodeURIComponent(
                slug,
              )}`,
              {
                credentials:
                  "include",
                cache:
                  "no-store",
                signal:
                  controller.signal,
              },
            ),

            fetch(
              `/api/coupons?${couponQuery.toString()}`,
              {
                credentials:
                  "include",
                cache:
                  "no-store",
                signal:
                  controller.signal,
              },
            ),
          ]);

        const settingsJson =
          await settingsResponse.json();

        if (
          settingsJson.success
        ) {
          setSettings({
            taxRate:
              Number(
                settingsJson.data
                  .taxRate || 0,
              ),
            serviceRate:
              Number(
                settingsJson.data
                  .serviceRate ||
                  0,
              ),
            isTaxIncluded:
              settingsJson.data
                .isTaxIncluded ===
                1 ||
              settingsJson.data
                .isTaxIncluded ===
                true,
          });
        }

        const authJson =
          await authResponse
            .json()
            .catch(
              () => null,
            );

        if (
          authResponse.ok &&
          authJson?.success &&
          authJson.user
        ) {
          setCustomer(
            (previous) => ({
              ...previous,
              name:
                authJson.user
                  .name || "",
              email:
                authJson.user
                  .email || "",
              phone:
                authJson.user
                  .phone || "",
            }),
          );
        }

        const vouchersJson =
          await vouchersResponse
            .json()
            .catch(
              () => null,
            );

        if (
          vouchersResponse.ok &&
          vouchersJson?.success
        ) {
          const rows =
            Array.isArray(
              vouchersJson.data,
            )
              ? vouchersJson.data
              : [];

          setPublicVouchers(
            rows.filter(
              (
                voucher:
                  PublicVoucher,
              ) =>
                isVoucherPublic(
                  voucher,
                ) &&
                isVoucherActive(
                  voucher,
                ),
            ),
          );
        }
      } catch (error) {
        if (
          error instanceof
            DOMException &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        console.warn(
          "Gagal memuat sebagian data checkout.",
          error,
        );
      } finally {
        setLoadingVouchers(
          false,
        );
      }
    }

    void loadCheckoutData();

    return () => {
      controller.abort();
    };
  }, [
    slug,
    branchSlug,
  ]);

  const totals =
    cart.calculateTotal(
      slug,
      menuItems,
    );

  const subtotalAfterDiscount =
    Number(
      totals.total || 0,
    );

  let chargedService = 0;
  let chargedTax = 0;

  if (
    !settings.isTaxIncluded
  ) {
    chargedService =
      Math.floor(
        subtotalAfterDiscount *
          (settings.serviceRate /
            100),
      );

    chargedTax =
      Math.floor(
        (subtotalAfterDiscount +
          chargedService) *
          (settings.taxRate /
            100),
      );
  }

  const includedBreakdown =
    useMemo(
      () =>
        calculateIncludedBreakdown(
          subtotalAfterDiscount,
          settings.serviceRate,
          settings.taxRate,
        ),
      [
        subtotalAfterDiscount,
        settings.serviceRate,
        settings.taxRate,
      ],
    );

  const displayService =
    settings.isTaxIncluded
      ? includedBreakdown.service
      : chargedService;

  const displayTax =
    settings.isTaxIncluded
      ? includedBreakdown.tax
      : chargedTax;

  const grandTotal =
    settings.isTaxIncluded
      ? Math.floor(
          subtotalAfterDiscount,
        )
      : Math.floor(
          subtotalAfterDiscount +
            chargedService +
            chargedTax,
        );

  async function applyVoucher(
    code: string,
  ) {
    const normalized =
      code
        .trim()
        .toUpperCase();

    if (!normalized) {
      Toast.fire({
        icon: "warning",
        title:
          "Kode promo wajib diisi.",
      });
      return;
    }

    setApplyingCode(
      normalized,
    );

    try {
      let authenticatedUserId:
        number | null =
        Number(auth.userId) >
        0
          ? Number(
              auth.userId,
            )
          : null;

      if (
        !authenticatedUserId
      ) {
        const authResponse =
          await fetch(
            `/api/auth/me?slug=${encodeURIComponent(
              slug,
            )}`,
            {
              credentials:
                "include",
              cache:
                "no-store",
            },
          );

        const authJson =
          await authResponse
            .json()
            .catch(
              () => null,
            );

        if (
          authResponse.ok &&
          authJson?.success &&
          authJson.user?.id
        ) {
          authenticatedUserId =
            Number(
              authJson.user.id,
            );
        }
      }

      const query =
        new URLSearchParams({
          code: normalized,
          slug,
        });

      if (branchSlug) {
        query.set(
          "branch_slug",
          branchSlug,
        );
      }

      if (
        authenticatedUserId
      ) {
        query.set(
          "user_id",
          String(
            authenticatedUserId,
          ),
        );
      }

      const response =
        await fetch(
          `/api/coupons/validate?${query.toString()}`,
          {
            credentials:
              "include",
            cache:
              "no-store",
          },
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Voucher tidak dapat digunakan.",
        );
      }

      cart.applyCouponManual(
        slug,
        {
          id:
            result.data.id,
          code:
            result.data.code ||
            result.data
              .coupon_code ||
            normalized,
          type:
            Number(
              result.data
                .discountRate ||
                0,
            ) > 0
              ? "percentage"
              : "fixed",
          value:
            Number(
              result.data
                .discountRate ||
                0,
            ) > 0
              ? Number(
                  result.data
                    .discountRate,
                )
              : Number(
                  result.data
                    .discountPrice ||
                    0,
                ),
          min_purchase:
            result.data
              .min_purchase ||
            0,
          max_discount:
            result.data
              .max_discount ||
            0,
          is_auto_apply:
            result.data
              .is_auto_apply ||
            false,
          applicable_items:
            result.data
              .applicable_items ||
            [],
        } as any,
      );

      setManualCoupon("");

      Toast.fire({
        icon: "success",
        title:
          "Voucher digunakan.",
      });
    } catch (error) {
      Toast.fire({
        icon: "error",
        title:
          error instanceof
          Error
            ? error.message
            : "Voucher gagal digunakan.",
      });
    } finally {
      setApplyingCode(
        null,
      );
    }
  }

  function removeVoucher() {
    cart.removeCoupon(
      slug,
    );
  }

  async function placeOrder() {
    if (
      !customer.name.trim()
    ) {
      Toast.fire({
        icon: "warning",
        title:
          "Nama wajib diisi.",
      });
      return;
    }

    setBusy(true);

    const preparedItems =
      cartItems.map(
        (cartItem) => {
          const product =
            menuItems.find(
              (candidate) =>
                candidate.id ===
                cartItem.menuItemId,
            );

          return {
            ...cartItem,
            priceAtOrder:
              getItemPrice(
                cartItem,
                product,
              ),
            selectedAddOnsDetails:
              getItemOptions(
                cartItem,
                product,
              ).map(
                (name) => ({
                  name,
                  price: 0,
                }),
              ),
          };
        },
      );

    const payload = {
      slug,
      branchSlug,
      branch_slug:
        branchSlug,

      total:
        totals.subtotal,

      discount:
        totals.discountAmount,

      /*
       * Preserve existing backend behavior:
       * included tax/service are informational only.
       * They are not added twice to the order.
       */
      tax:
        chargedTax,

      service:
        chargedService,

      totalAfterDiscount:
        grandTotal,

      discountId:
        cart.getAppliedCoupon(
          slug,
        )?.id || null,

      serviceType:
        customer.serviceType,

      manualTableInfo:
        customer.serviceType ===
        "takeaway"
          ? "Takeaway"
          : null,

      customer: {
        ...customer,

        userId:
          Number(
            auth.userId,
          ) > 0
            ? Number(
                auth.userId,
              )
            : null,

        tableNumber:
          customer.serviceType ===
          "dine_in"
            ? tableCode ||
              null
            : null,

        manualTableInfo:
          customer.serviceType ===
          "takeaway"
            ? "Takeaway"
            : null,
      },

      cartItems:
        preparedItems,
    };

    try {
      const response =
        await fetch(
          "/api/checkout",
          {
            method: "POST",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
              "X-Idempotency-Key":
                crypto.randomUUID(),
            },
            body:
              JSON.stringify(
                payload,
              ),
          },
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Checkout gagal.",
        );
      }

      const orderPayload = {
        id:
          result.orderId,
        orderCode:
          result.orderCode,
        expiryTime:
          result.expiryTime,
        qrUrl:
          result.qrUrl,
        qrString:
          result.qrString,
        ...payload,
        status: "pending",
      };

      if (
        customer.method ===
          "qris" &&
        (result.qrUrl ||
          result.qrString)
      ) {
        setOrder(
          orderPayload,
        );
        setStep("qris");
        return;
      }

      createOrder(
        orderPayload as any,
      );

      cart.clearCart(
        slug,
      );

      onSuccess();
    } catch (error) {
      Toast.fire({
        icon: "error",
        title:
          error instanceof
          Error
            ? error.message
            : "Checkout gagal.",
      });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (
      step !== "qris" ||
      !order?.expiryTime
    ) {
      return;
    }

    const tick = () => {
      const remaining =
        Math.max(
          0,
          new Date(
            order.expiryTime,
          ).getTime() -
            Date.now(),
        );

      const minutes =
        Math.floor(
          remaining / 60000,
        );

      const seconds =
        Math.floor(
          (remaining % 60000) /
            1000,
        );

      setQrisCountdown(
        remaining <= 0
          ? "EXPIRED"
          : `${String(
              minutes,
            ).padStart(
              2,
              "0",
            )}:${String(
              seconds,
            ).padStart(
              2,
              "0",
            )}`,
      );
    };

    tick();

    const interval =
      window.setInterval(
        tick,
        1000,
      );

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [
    step,
    order,
  ]);

  async function checkQrisPayment() {
    if (
      !order?.orderCode
    ) {
      return;
    }

    try {
      const response =
        await fetch(
          `/api/checkout/status?orderCode=${encodeURIComponent(
            String(
              order.orderCode,
            ),
          )}`,
          {
            credentials:
              "include",
            cache:
              "no-store",
          },
        );

      const result =
        await response.json();

      const paid =
        result.paymentStatus ===
          2 ||
        result.payment_status ===
          2 ||
        [
          "settlement",
          "capture",
        ].includes(
          String(
            result.status || "",
          ).toLowerCase(),
        );

      if (!paid) {
        Toast.fire({
          icon: "info",
          title:
            "Pembayaran belum terdeteksi.",
        });
        return;
      }

      createOrder(
        order,
      );

      cart.clearCart(
        slug,
      );

      onSuccess();
    } catch {
      Toast.fire({
        icon: "error",
        title:
          "Gagal mengecek pembayaran.",
      });
    }
  }

  if (
    step === "review" &&
    !cartItems.length
  ) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center bg-stone-50 px-6 text-center">
        <h2 className="text-3xl font-black tracking-[-0.05em]">
          Your cart is empty.
        </h2>

        <button
          type="button"
          onClick={onBack}
          className="mt-5 rounded-full bg-black px-6 py-3 text-xs font-black text-white"
        >
          Back to menu
        </button>
      </div>
    );
  }

  if (
    step === "qris"
  ) {
    return (
      <div className="min-h-full bg-black px-4 pb-10 pt-[calc(1rem+env(safe-area-inset-top))] text-white">
        <button
          type="button"
          onClick={() =>
            setStep(
              "payment",
            )
          }
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <p className="mt-8 text-[9px] font-black uppercase tracking-[0.2em] text-white/35">
          Pay with QRIS
        </p>

        <h1 className="mt-2 text-5xl font-black tracking-[-0.07em]">
          {money(
            grandTotal,
          )}
        </h1>

        <div className="mt-8 rounded-[32px] bg-white p-6 text-black">
          <div className="mx-auto flex h-64 w-64 items-center justify-center">
            {order?.qrString ? (
              <QRCodeSVG
                value={
                  order.qrString
                }
                className="h-full w-full"
              />
            ) : order?.qrUrl ? (
              <img
                src={
                  order.qrUrl
                }
                alt="QRIS"
                className="h-full w-full object-contain"
              />
            ) : (
              <QrCode className="h-20 w-20 text-black/20" />
            )}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-black/10 pt-4">
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-black/35">
              Expires
            </span>

            <span className="font-mono text-sm font-black">
              {qrisCountdown ||
                "--:--"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            void checkQrisPayment()
          }
          className="mt-4 h-14 w-full rounded-2xl bg-white text-xs font-black uppercase tracking-[0.12em] text-black"
        >
          I have paid
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-stone-50 pb-32">
      <header className="flex items-center justify-between px-4 pb-5 pt-[calc(1rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={
            step === "review"
              ? onBack
              : () =>
                  setStep(
                    "review",
                  )
          }
          className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="text-right">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-black/30">
            Checkout
          </p>

          <b className="text-xs">
            {step === "review"
              ? "1 / 2"
              : "2 / 2"}
          </b>
        </div>
      </header>

      {step === "review" ? (
        <main className="px-4">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-black/30">
            Your order
          </p>

          <h1 className="mt-2 text-[38px] font-black leading-[0.95] tracking-[-0.06em]">
            Review before
            <br />
            you pay.
          </h1>

          {/* PRODUCT LIST WITH IMAGES */}
          <section className="mt-7 overflow-hidden rounded-[28px] border border-black/[0.07] bg-white">
            {cartItems.map(
              (
                cartItem,
                index,
              ) => {
                const product =
                  menuItems.find(
                    (candidate) =>
                      candidate.id ===
                      cartItem.menuItemId,
                  );

                if (!product) {
                  return null;
                }

                const itemPrice =
                  getItemPrice(
                    cartItem,
                    product,
                  );

                const options =
                  getItemOptions(
                    cartItem,
                    product,
                  );

                return (
                  <article
                    key={
                      cartItem.id
                    }
                    className={`grid grid-cols-[72px_1fr] gap-3 p-3 ${
                      index > 0
                        ? "border-t border-black/[0.06]"
                        : ""
                    }`}
                  >
                    <div className="h-[72px] w-[72px] overflow-hidden rounded-2xl bg-stone-100">
                      {product.image ? (
                        <img
                          src={normalizeImageSrc(
                            product.image,
                          )}
                          alt={
                            product.name
                          }
                          onError={
                            applyFallbackImage
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-black/15">
                          <Tag className="h-5 w-5" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="line-clamp-2 text-sm font-black leading-tight tracking-[-0.02em]">
                            {
                              product.name
                            }
                          </h3>

                          {options.length >
                            0 && (
                            <p className="mt-1 line-clamp-2 text-[9px] leading-4 text-black/35">
                              {options.join(
                                " · ",
                              )}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            cart.removeItem(
                              slug,
                              cartItem.id,
                            )
                          }
                          aria-label={`Hapus ${product.name}`}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-black/20 active:bg-red-50 active:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <b className="text-xs">
                          {money(
                            itemPrice *
                              cartItem.quantity,
                          )}
                        </b>

                        <div className="flex h-9 items-center rounded-full border border-black/10 bg-stone-50 p-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              cart.updateQuantity(
                                slug,
                                cartItem.id,
                                -1,
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full text-black/45"
                          >
                            <Minus className="h-3 w-3" />
                          </button>

                          <span className="w-6 text-center text-xs font-black">
                            {
                              cartItem.quantity
                            }
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              cart.updateQuantity(
                                slug,
                                cartItem.id,
                                1,
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              },
            )}
          </section>

          {/* VOUCHERS */}
          <section className="mt-8">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-black/30">
                  Voucher
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-[-0.05em]">
                  Save on this order
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowManualCode(
                    (value) =>
                      !value,
                  )
                }
                className="text-[9px] font-black uppercase tracking-[0.12em] text-black/40"
              >
                Have a code?
              </button>
            </div>

            {appliedCoupon && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-black p-4 text-white">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-black">
                  <Check className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/35">
                    Applied voucher
                  </p>

                  <p className="mt-1 truncate text-sm font-black">
                    {appliedCoupon.code ||
                      appliedCoupon.coupon_code}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    removeVoucher
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {showManualCode && (
              <div className="mt-3 flex gap-2">
                <input
                  value={
                    manualCoupon
                  }
                  onChange={(
                    event,
                  ) =>
                    setManualCoupon(
                      event.target.value.toUpperCase(),
                    )
                  }
                  placeholder="PROMO CODE"
                  className="h-12 min-w-0 flex-1 rounded-2xl border border-black/10 bg-white px-4 text-xs font-black uppercase outline-none focus:border-black"
                />

                <button
                  type="button"
                  disabled={
                    !manualCoupon.trim() ||
                    Boolean(
                      applyingCode,
                    )
                  }
                  onClick={() =>
                    void applyVoucher(
                      manualCoupon,
                    )
                  }
                  className="flex h-12 min-w-20 items-center justify-center rounded-2xl bg-black px-4 text-[9px] font-black uppercase tracking-[0.1em] text-white disabled:opacity-30"
                >
                  {applyingCode ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Apply"
                  )}
                </button>
              </div>
            )}

            <div className="mt-4">
              {loadingVouchers ? (
                <div className="flex h-28 items-center justify-center rounded-3xl border border-black/[0.07] bg-white">
                  <Loader2 className="h-5 w-5 animate-spin text-black/30" />
                </div>
              ) : publicVouchers.length >
                0 ? (
                <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {publicVouchers.map(
                    (
                      voucher,
                    ) => {
                      const code =
                        String(
                          voucher.coupon_code ||
                            voucher.code ||
                            "",
                        );

                      const minPurchase =
                        Number(
                          voucher.min_purchase ||
                            0,
                        );

                      const selected =
                        String(
                          appliedCoupon?.code ||
                            appliedCoupon?.coupon_code ||
                            "",
                        ).toUpperCase() ===
                        code.toUpperCase();

                      return (
                        <button
                          key={
                            voucher.id
                          }
                          type="button"
                          disabled={
                            !code ||
                            Boolean(
                              applyingCode,
                            )
                          }
                          onClick={() =>
                            void applyVoucher(
                              code,
                            )
                          }
                          className={`w-[82%] max-w-[330px] shrink-0 snap-start rounded-[26px] border p-4 text-left ${
                            selected
                              ? "border-black bg-black text-white"
                              : "border-black/[0.08] bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <span
                              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                                selected
                                  ? "bg-white text-black"
                                  : "bg-black text-white"
                              }`}
                            >
                              {selected ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Ticket className="h-4 w-4" />
                              )}
                            </span>

                            <span className="text-2xl font-black tracking-[-0.055em]">
                              {voucherValueLabel(
                                voucher,
                              )}
                            </span>
                          </div>

                          <p
                            className={`mt-6 text-[8px] font-black uppercase tracking-[0.14em] ${
                              selected
                                ? "text-white/35"
                                : "text-black/30"
                            }`}
                          >
                            {code}
                          </p>

                          <h3 className="mt-1 line-clamp-2 text-sm font-black">
                            {voucher.title ||
                              voucher.description ||
                              "Public voucher"}
                          </h3>

                          <div className="mt-4 flex items-center justify-between gap-3">
                            <span
                              className={`text-[9px] font-bold ${
                                selected
                                  ? "text-white/45"
                                  : "text-black/35"
                              }`}
                            >
                              {minPurchase >
                              0
                                ? `Min. ${money(
                                    minPurchase,
                                  )}`
                                : "No minimum"}
                            </span>

                            <span
                              className={`text-[9px] font-black uppercase tracking-[0.1em] ${
                                selected
                                  ? "text-white"
                                  : "text-black"
                              }`}
                            >
                              {applyingCode ===
                              code.toUpperCase()
                                ? "Checking..."
                                : selected
                                  ? "Applied"
                                  : "Use"}
                            </span>
                          </div>
                        </button>
                      );
                    },
                  )}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-black/10 p-5 text-center">
                  <p className="text-xs font-bold text-black/35">
                    Belum ada voucher publik yang dapat langsung digunakan.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* TOTAL BREAKDOWN */}
          <section className="mt-8 rounded-[28px] bg-black p-5 text-white">
            <div className="space-y-3 text-xs">
              <div className="flex justify-between gap-4 text-white/50">
                <span>
                  Subtotal
                </span>

                <span>
                  {money(
                    totals.subtotal,
                  )}
                </span>
              </div>

              {totals.discountAmount >
                0 && (
                <div className="flex justify-between gap-4 text-emerald-300">
                  <span>
                    Voucher discount
                  </span>

                  <span>
                    -
                    {money(
                      totals.discountAmount,
                    )}
                  </span>
                </div>
              )}

              <div className="flex justify-between gap-4 text-white/50">
                <span>
                  Service (
                  {
                    settings.serviceRate
                  }
                  %)
                </span>

                <span className="text-right">
                  {money(
                    displayService,
                  )}
                  {settings.isTaxIncluded && (
                    <small className="ml-1 text-[8px] uppercase tracking-[0.08em] text-white/25">
                      included
                    </small>
                  )}
                </span>
              </div>

              <div className="flex justify-between gap-4 text-white/50">
                <span>
                  Tax (
                  {
                    settings.taxRate
                  }
                  %)
                </span>

                <span className="text-right">
                  {money(
                    displayTax,
                  )}
                  {settings.isTaxIncluded && (
                    <small className="ml-1 text-[8px] uppercase tracking-[0.08em] text-white/25">
                      included
                    </small>
                  )}
                </span>
              </div>
            </div>

            {settings.isTaxIncluded && (
              <p className="mt-4 border-t border-white/10 pt-3 text-[9px] leading-4 text-white/30">
                Tax dan service sudah termasuk dalam harga. Nilai di atas hanya menampilkan breakdown perhitungannya dan tidak ditambahkan lagi ke total.
              </p>
            )}

            <div className="mt-5 flex items-end justify-between border-t border-white/10 pt-5">
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white/35">
                Total
              </span>

              <b className="text-3xl tracking-[-0.05em]">
                {money(
                  grandTotal,
                )}
              </b>
            </div>
          </section>
        </main>
      ) : (
        <main className="px-4">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-black/30">
            Payment
          </p>

          <h1 className="mt-2 text-[38px] font-black leading-[0.95] tracking-[-0.06em]">
            How would
            <br />
            you like to pay?
          </h1>

          <div className="mt-7 space-y-3">
            <input
              value={
                customer.name
              }
              onChange={(
                event,
              ) =>
                setCustomer({
                  ...customer,
                  name:
                    event.target
                      .value,
                })
              }
              placeholder="Full name"
              className="h-14 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm font-bold outline-none focus:border-black"
            />

            <input
              value={
                customer.email
              }
              onChange={(
                event,
              ) =>
                setCustomer({
                  ...customer,
                  email:
                    event.target
                      .value,
                })
              }
              placeholder="Email (optional)"
              className="h-14 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm font-bold outline-none focus:border-black"
            />

            <input
              value={
                customer.phone
              }
              onChange={(
                event,
              ) =>
                setCustomer({
                  ...customer,
                  phone:
                    event.target
                      .value.replace(
                        /\D/g,
                        "",
                      ),
                })
              }
              placeholder="Phone (optional)"
              className="h-14 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm font-bold outline-none focus:border-black"
            />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={
                !tableCode
              }
              onClick={() =>
                setCustomer({
                  ...customer,
                  serviceType:
                    "dine_in",
                })
              }
              className={`rounded-2xl border p-4 text-left ${
                customer.serviceType ===
                "dine_in"
                  ? "border-black bg-black text-white"
                  : "border-black/10 bg-white"
              } disabled:opacity-30`}
            >
              <p className="text-[9px] font-black uppercase tracking-[0.12em] opacity-40">
                Service
              </p>

              <b className="mt-2 block text-sm">
                Dine in
              </b>

              <small>
                {tableName ||
                  tableCode ||
                  "No table"}
              </small>
            </button>

            <button
              type="button"
              onClick={() =>
                setCustomer({
                  ...customer,
                  serviceType:
                    "takeaway",
                })
              }
              className={`rounded-2xl border p-4 text-left ${
                customer.serviceType ===
                "takeaway"
                  ? "border-black bg-black text-white"
                  : "border-black/10 bg-white"
              }`}
            >
              <p className="text-[9px] font-black uppercase tracking-[0.12em] opacity-40">
                Service
              </p>

              <b className="mt-2 block text-sm">
                Takeaway
              </b>
            </button>
          </div>

          <div className="mt-7 space-y-2">
            {[
              [
                "qris",
                "QRIS",
                QrCode,
              ],
              [
                "cash",
                "Pay at cashier",
                Banknote,
              ],
            ].map(
              ([
                id,
                label,
                Icon,
              ]: any) => {
                const selected =
                  customer.method ===
                  id;

                return (
                  <button
                    key={
                      id
                    }
                    type="button"
                    onClick={() =>
                      setCustomer({
                        ...customer,
                        method:
                          id,
                        orderType:
                          id ===
                          "qris"
                            ? "online"
                            : "cashier",
                      })
                    }
                    className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left ${
                      selected
                        ? "border-black bg-black text-white"
                        : "border-black/10 bg-white"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        selected
                          ? "bg-white text-black"
                          : "bg-stone-100"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>

                    <span className="flex-1 text-sm font-black">
                      {label}
                    </span>

                    {selected && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                );
              },
            )}
          </div>

          {/* Payment total recap */}
          <div className="mt-7 rounded-3xl border border-black/[0.07] bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-[0.14em] text-black/30">
                Amount to pay
              </span>

              <b className="text-2xl tracking-[-0.04em]">
                {money(
                  grandTotal,
                )}
              </b>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-[9px] text-black/40">
              <span>
                Service {settings.serviceRate}% · {money(displayService)}
              </span>

              <span className="text-right">
                Tax {settings.taxRate}% · {money(displayTax)}
              </span>
            </div>
          </div>
        </main>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[480px] border-t border-black/[0.07] bg-stone-50/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl">
        <button
          type="button"
          disabled={
            busy
          }
          onClick={() =>
            step === "review"
              ? setStep(
                  "payment",
                )
              : void placeOrder()
          }
          className="flex h-14 w-full items-center justify-between rounded-2xl bg-black px-5 text-white disabled:opacity-40"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <span className="text-[10px] font-black uppercase tracking-[0.14em]">
                {step ===
                "review"
                  ? "Continue to payment"
                  : "Place order"}
              </span>

              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
