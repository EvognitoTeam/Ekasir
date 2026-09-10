"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  motion,
} from "framer-motion";

import {
  ArrowLeft,
  BadgePercent,
  CalendarDays,
  Check,
  Copy,
  Gift,
  Globe2,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Ticket,
  UserRoundCheck,
  XCircle,
  Zap,
} from "lucide-react";

import type {
  LucideIcon,
} from 'lucide-react';

import {
  useParams,
  usePathname,
} from "next/navigation";

import {
  useLanguageStore,
} from "@/store/language.store";

import {
  Toast,
} from "@/utils/toast";

type Locale =
  | "id"
  | "en";

type CouponTab =
  | "available"
  | "mine"
  | "expired";

type CouponRecord = {
  id: number;

  title?: string | null;
  name?: string | null;

  description?: string | null;

  coupon_code?: string | null;
  couponCode?: string | null;

  discount_rate?: number | string | null;
  discountRate?: number | string | null;

  discount_price?: number | string | null;
  discountPrice?: number | string | null;

  max_use?: number | string | null;
  maxUse?: number | string | null;

  already_used?: number | string | null;
  alreadyUsed?: number | string | null;

  start_date?: string | Date | null;
  startDate?: string | Date | null;

  expired_date?: string | Date | null;
  expiredDate?: string | Date | null;

  is_member_only?: boolean | number | string | null;
  isMemberOnly?: boolean | number | string | null;

  is_auto_apply?: boolean | number | string | null;
  isAutoApply?: boolean | number | string | null;

  is_claimable?: boolean | number | string | null;
  isClaimable?: boolean | number | string | null;

  valid_days_after_claim?: number | string | null;
  validDaysAfterClaim?: number | string | null;

  claimed_by_user_id?: number | string | null;
  claimedByUserId?: number | string | null;

  branch_ids?: Array<number | string> | null;
  branchIds?: Array<number | string> | null;

  applicable_items?: Array<number | string> | string | null;
  applicableItems?: Array<number | string> | string | null;
};

type NormalizedCoupon = {
  id: number;
  title: string;
  description: string;
  code: string;

  discountRate: number;
  discountPrice: number;

  maxUse: number;
  alreadyUsed: number;

  startDate: Date | null;
  expiredDate: Date | null;

  memberOnly: boolean;
  autoApply: boolean;
  claimable: boolean;

  validDaysAfterClaim: number;
  claimedByUserId: number | null;

  branchIds: number[];
};

type SessionResponse = {
  success?: boolean;

  user?: {
    id?: number | string;
    role?: string;
  };

  data?: {
    user?: {
      id?: number | string;
      role?: string;
    };
  };
};

const copy = {
  id: {
    eyebrow:
      "Promo wallet",

    title:
      "Kupon & Promo",

    subtitle:
      "Simpan kode favoritmu dan gunakan saat checkout.",

    back:
      "Kembali",

    refresh:
      "Perbarui",

    available:
      "Tersedia",

    mine:
      "Voucher Saya",

    expired:
      "Berakhir",

    search:
      "Cari promo atau kode...",

    availableCount:
      "Promo aktif",

    mineCount:
      "Voucher saya",

    emptyAvailable:
      "Belum ada promo yang tersedia.",

    emptyMine:
      "Belum ada voucher yang tersimpan di akunmu.",

    emptyExpired:
      "Belum ada riwayat promo yang berakhir.",

    percentageOff:
      "diskon",

    fixedOff:
      "potongan",

    memberOnly:
      "Khusus member",

    autoApply:
      "Otomatis",

    mineBadge:
      "Milikmu",

    publicPromo:
      "Promo publik",

    couponCode:
      "Kode promo",

    copyCode:
      "Salin",

    copied:
      "Kode promo berhasil disalin",

    copyFailed:
      "Gagal menyalin kode promo",

    activeNow:
      "Aktif sekarang",

    scheduled:
      "Segera hadir",

    ended:
      "Expired",

    quotaEnded:
      "Kuota habis",

    starts:
      "Mulai",

    expires:
      "Berakhir",

    noExpiry:
      "Tanpa batas waktu",

    usage:
      "Pemakaian",

    unlimited:
      "Tanpa batas",

    validAfterClaim:
      "Aktif setelah klaim",

    days:
      "hari",

    loginHint:
      "Login untuk melihat voucher pribadi.",

    targeted:
      "Voucher pribadi",

    terms:
      "Detail promo",

    global:
      "Semua outlet",

    loading:
      "Memuat promo...",

    loadFailed:
      "Gagal memuat daftar promo.",

    noDescription:
      "Promo spesial untuk transaksi yang memenuhi ketentuan.",

    codeUnavailable:
      "Kode belum tersedia",
  },

  en: {
    eyebrow:
      "Promo wallet",

    title:
      "Coupons & Promos",

    subtitle:
      "Save your favorite codes and use them at checkout.",

    back:
      "Back",

    refresh:
      "Refresh",

    available:
      "Available",

    mine:
      "My Vouchers",

    expired:
      "Ended",

    search:
      "Search promo or code...",

    availableCount:
      "Active promos",

    mineCount:
      "My vouchers",

    emptyAvailable:
      "No promotions are currently available.",

    emptyMine:
      "You do not have saved vouchers yet.",

    emptyExpired:
      "No expired promotion history yet.",

    percentageOff:
      "discount",

    fixedOff:
      "discount",

    memberOnly:
      "Members only",

    autoApply:
      "Automatic",

    mineBadge:
      "Yours",

    publicPromo:
      "Public promo",

    couponCode:
      "Promo code",

    copyCode:
      "Copy",

    copied:
      "Promo code copied",

    copyFailed:
      "Failed to copy promo code",

    activeNow:
      "Active now",

    scheduled:
      "Coming soon",

    ended:
      "Expired",

    quotaEnded:
      "Quota ended",

    starts:
      "Starts",

    expires:
      "Ends",

    noExpiry:
      "No expiry",

    usage:
      "Usage",

    unlimited:
      "Unlimited",

    validAfterClaim:
      "Valid after claim",

    days:
      "days",

    loginHint:
      "Sign in to see your personal vouchers.",

    targeted:
      "Personal voucher",

    terms:
      "Promo details",

    global:
      "All outlets",

    loading:
      "Loading promos...",

    loadFailed:
      "Failed to load promotions.",

    noDescription:
      "A special promotion for eligible transactions.",

    codeUnavailable:
      "Code unavailable",
  },
} as const;

function toBoolean(
  value: unknown,
) {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    String(
      value ??
        "",
    ).toLowerCase() ===
      "true"
  );
}

function toNumber(
  value: unknown,
) {
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

function toDate(
  value:
    string |
    Date |
    null |
    undefined,
) {
  if (!value) {
    return null;
  }

  const date =
    value instanceof
      Date
      ? value
      : new Date(
          value,
        );

  return Number.isNaN(
    date.getTime(),
  )
    ? null
    : date;
}

function sanitizeHtml(
  html: string,
) {
  return String(
    html ??
      "",
  )
    .replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      "",
    )
    .replace(
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      "",
    )
    .replace(
      /\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi,
      "",
    )
    .replace(
      /javascript\s*:/gi,
      "",
    );
}

function normalizeCoupon(
  raw:
    CouponRecord,
): NormalizedCoupon {
  const branchRaw =
    raw.branch_ids ??
    raw.branchIds ??
    [];

  return {
    id:
      Number(
        raw.id,
      ),

    title:
      String(
        raw.title ??
          raw.name ??
          raw.coupon_code ??
          raw.couponCode ??
          "Promo",
      ),

    description:
      String(
        raw.description ??
          "",
      ),

    code:
      String(
        raw.coupon_code ??
          raw.couponCode ??
          "",
      )
        .trim()
        .toUpperCase(),

    discountRate:
      toNumber(
        raw.discount_rate ??
          raw.discountRate,
      ),

    discountPrice:
      toNumber(
        raw.discount_price ??
          raw.discountPrice,
      ),

    maxUse:
      toNumber(
        raw.max_use ??
          raw.maxUse,
      ),

    alreadyUsed:
      toNumber(
        raw.already_used ??
          raw.alreadyUsed,
      ),

    startDate:
      toDate(
        raw.start_date ??
          raw.startDate,
      ),

    expiredDate:
      toDate(
        raw.expired_date ??
          raw.expiredDate,
      ),

    memberOnly:
      toBoolean(
        raw.is_member_only ??
          raw.isMemberOnly,
      ),

    autoApply:
      toBoolean(
        raw.is_auto_apply ??
          raw.isAutoApply,
      ),

    claimable:
      toBoolean(
        raw.is_claimable ??
          raw.isClaimable,
      ),

    validDaysAfterClaim:
      toNumber(
        raw.valid_days_after_claim ??
          raw.validDaysAfterClaim,
      ),

    claimedByUserId:
      (
        raw.claimed_by_user_id ??
        raw.claimedByUserId
      ) ===
        null ||
      (
        raw.claimed_by_user_id ??
        raw.claimedByUserId
      ) ===
        undefined
        ? null
        : toNumber(
            raw.claimed_by_user_id ??
              raw.claimedByUserId,
          ) ||
          null,

    branchIds:
      Array.isArray(
        branchRaw,
      )
        ? branchRaw
            .map(
              (
                id,
              ) =>
                Number(
                  id,
                ),
            )
            .filter(
              (
                id,
              ) =>
                Number.isInteger(
                  id,
                ) &&
                id >
                  0,
            )
        : [],
  };
}

function getCouponState(
  coupon:
    NormalizedCoupon,
) {
  const now =
    new Date();

  if (
    coupon.maxUse >
      0 &&
    coupon.alreadyUsed >=
      coupon.maxUse
  ) {
    return "quota-ended" as const;
  }

  if (
    coupon.expiredDate &&
    now >
      coupon.expiredDate
  ) {
    return "expired" as const;
  }

  if (
    coupon.startDate &&
    now <
      coupon.startDate
  ) {
    return "scheduled" as const;
  }

  return "active" as const;
}

function formatCurrency(
  value:
    number,
  locale:
    Locale,
) {
  return new Intl.NumberFormat(
    locale ===
      "id"
      ? "id-ID"
      : "en-US",
    {
      style:
        "currency",
      currency:
        "IDR",
      maximumFractionDigits:
        0,
    },
  ).format(
    value,
  );
}

function formatDate(
  value:
    Date |
    null,
  locale:
    Locale,
) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(
    locale ===
      "id"
      ? "id-ID"
      : "en-US",
    {
      day:
        "2-digit",
      month:
        "short",
      year:
        "numeric",
    },
  ).format(
    value,
  );
}

function resolveBranchSlug(
  pathname:
    string,
  mitraSlug:
    string,
) {
  const segments =
    pathname
      .split(
        "/",
      )
      .filter(
        Boolean,
      );

  const mitraIndex =
    segments.indexOf(
      mitraSlug,
    );

  if (
    mitraIndex <
      0
  ) {
    return null;
  }

  const afterMitra =
    segments.slice(
      mitraIndex +
        1,
    );

  /*
   * /[mitraSlug]/coupons
   * => ["coupons"]
   *
   * /[mitraSlug]/[branchSlug]/coupons
   * => ["branchSlug", "coupons"]
   */
  if (
    afterMitra.length >=
      2 &&
    afterMitra[
      afterMitra.length -
        1
    ] ===
      "coupons"
  ) {
    return afterMitra[
      0
    ];
  }

  return null;
}

export default function CouponView({
  onBack,
}: {
  onBack:
    () => void;
}) {
  const params =
    useParams<{
      mitraSlug:
        string;
    }>();

  const pathname =
    usePathname();

  const slug =
    String(
      params.mitraSlug ??
        "",
    );

  const branchSlug =
    useMemo(
      () =>
        resolveBranchSlug(
          pathname,
          slug,
        ),
      [
        pathname,
        slug,
      ],
    );

  const locale =
    useLanguageStore(
      (
        state,
      ) =>
        state.locale,
    ) as Locale;

  const t =
    copy[
      locale
    ];

  const [
    coupons,
    setCoupons,
  ] =
    useState<
      NormalizedCoupon[]
    >(
      [],
    );

  const [
    userId,
    setUserId,
  ] =
    useState<
      number |
      null
    >(
      null,
    );

  const [
    tab,
    setTab,
  ] =
    useState<CouponTab>(
      "available",
    );

  const [
    search,
    setSearch,
  ] =
    useState(
      "",
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false,
    );

  const [
    error,
    setError,
  ] =
    useState<
      string |
      null
    >(
      null,
    );

  const loadCoupons =
    useCallback(
      async (
        silent =
          false,
      ) => {
        if (
          !slug
        ) {
          return;
        }

        if (
          !silent
        ) {
          setLoading(
            true,
          );
        }

        setError(
          null,
        );

        try {
          const couponQuery =
            new URLSearchParams({
              slug,
            });

          if (
            branchSlug
          ) {
            couponQuery.set(
              "branch_slug",
              branchSlug,
            );
          }

          const [
            couponResponse,
            sessionResponse,
          ] =
            await Promise.all([
              fetch(
                `/api/coupons?${couponQuery.toString()}`,
                {
                  cache:
                    "no-store",
                  credentials:
                    "include",
                },
              ),

              fetch(
                "/api/auth/session",
                {
                  cache:
                    "no-store",
                  credentials:
                    "include",
                },
              ).catch(
                () =>
                  null,
              ),
            ]);

          const couponResult =
            await couponResponse.json();

          if (
            !couponResponse.ok ||
            !couponResult.success
          ) {
            throw new Error(
              couponResult.message ||
                t.loadFailed,
            );
          }

          let sessionUserId:
            number |
            null =
              null;

          if (
            sessionResponse?.ok
          ) {
            try {
              const sessionResult =
                await sessionResponse.json() as
                  SessionResponse;

              const sessionUser =
                sessionResult.user ??
                sessionResult.data?.user;

              const numericId =
                Number(
                  sessionUser?.id ??
                    0,
                );

              if (
                Number.isInteger(
                  numericId,
                ) &&
                numericId >
                  0 &&
                String(
                  sessionUser?.role ??
                    "",
                ).toLowerCase() ===
                  "user"
              ) {
                sessionUserId =
                  numericId;
              }
            } catch {
              sessionUserId =
                null;
            }
          }

          setUserId(
            sessionUserId,
          );

          const rawCoupons =
            Array.isArray(
              couponResult.data,
            )
              ? couponResult.data as
                  CouponRecord[]
              : [];

          const normalized =
            rawCoupons
              .map(
                normalizeCoupon,
              )
              .filter(
                (
                  coupon,
                ) =>
                  Number.isInteger(
                    coupon.id,
                  ) &&
                  coupon.id >
                    0,
              );

          /*
           * SECURITY / UX:
           *
           * Coupon claimable yang belum dimiliki siapa pun adalah pool
           * voucher targeted. Jangan tampilkan kode tersebut ke semua customer.
           *
           * Coupon claimable yang sudah dimiliki user lain juga tidak boleh
           * bocor ke customer ini.
           *
           * Promo non-claimable tetap public.
           */
          const customerVisible =
            normalized.filter(
              (
                coupon,
              ) => {
                if (
                  !coupon.claimable
                ) {
                  return true;
                }

                if (
                  !sessionUserId
                ) {
                  return false;
                }

                return (
                  coupon.claimedByUserId ===
                  sessionUserId
                );
              },
            );

          setCoupons(
            customerVisible,
          );
        } catch (
          loadError
        ) {
          console.error(
            "[CUSTOMER_COUPONS_LOAD_ERROR]",
            loadError,
          );

          setError(
            loadError instanceof
              Error
              ? loadError.message
              : t.loadFailed,
          );
        } finally {
          if (
            !silent
          ) {
            setLoading(
              false,
            );
          }
        }
      },
      [
        branchSlug,
        slug,
        t.loadFailed,
      ],
    );

  useEffect(() => {
    void loadCoupons();
  }, [
    loadCoupons,
  ]);

  const publicActive =
    useMemo(
      () =>
        coupons.filter(
          (
            coupon,
          ) => {
            const state =
              getCouponState(
                coupon,
              );

            return (
              !coupon.claimable &&
              (
                state ===
                  "active" ||
                state ===
                  "scheduled"
              )
            );
          },
        ),
      [
        coupons,
      ],
    );

  const myVouchers =
    useMemo(
      () =>
        coupons.filter(
          (
            coupon,
          ) =>
            coupon.claimable &&
            userId !==
              null &&
            coupon.claimedByUserId ===
              userId,
        ),
      [
        coupons,
        userId,
      ],
    );

  const expiredCoupons =
    useMemo(
      () =>
        coupons.filter(
          (
            coupon,
          ) => {
            const state =
              getCouponState(
                coupon,
              );

            return (
              state ===
                "expired" ||
              state ===
                "quota-ended"
            );
          },
        ),
      [
        coupons,
      ],
    );

  const filteredCoupons =
    useMemo(
      () => {
        const source =
          tab ===
            "mine"
            ? myVouchers
            : tab ===
                "expired"
              ? expiredCoupons
              : publicActive;

        const query =
          search
            .trim()
            .toLowerCase();

        if (
          !query
        ) {
          return source;
        }

        return source.filter(
          (
            coupon,
          ) =>
            `${coupon.title} ${coupon.code}`
              .toLowerCase()
              .includes(
                query,
              ),
        );
      },
      [
        expiredCoupons,
        myVouchers,
        publicActive,
        search,
        tab,
      ],
    );

  const handleRefresh =
    async () => {
      if (
        refreshing
      ) {
        return;
      }

      setRefreshing(
        true,
      );

      try {
        await loadCoupons(
          true,
        );
      } finally {
        setRefreshing(
          false,
        );
      }
    };

  const copyCode =
    async (
      code:
        string,
    ) => {
      if (
        !code
      ) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          code,
        );

        Toast.fire({
          icon:
            "success",
          title:
            t.copied,
        });
      } catch {
        Toast.fire({
          icon:
            "error",
          title:
            t.copyFailed,
        });
      }
    };

  return (
    <div className="min-h-full bg-[#f7f7f4] text-[#111111]">
      {/* OWN HEADER — parent CustomerPage hides the normal Header on /coupons */}
      <header className="sticky top-0 z-30 border-b border-black/[0.07] bg-[#f7f7f4]/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[480px] items-center justify-between gap-3">
          <button
            type="button"
            onClick={
              onBack
            }
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white text-black/60 shadow-sm transition active:scale-95"
            aria-label={
              t.back
            }
          >
            <ArrowLeft
              size={
                17
              }
            />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-extrabold uppercase tracking-[0.18em] text-black/30">
              {
                t.eyebrow
              }
            </p>

            <p className="truncate text-sm font-extrabold">
              {
                t.title
              }
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void handleRefresh()
            }
            disabled={
              refreshing
            }
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white text-black/45 shadow-sm transition active:scale-95 disabled:opacity-40"
            aria-label={
              t.refresh
            }
          >
            <RefreshCw
              size={
                15
              }
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[480px] px-4 pb-10 pt-5 sm:px-5">
        {/* INTRO */}
        <section className="relative overflow-hidden rounded-[28px] bg-black p-5 text-white shadow-[0_18px_50px_rgba(0,0,0,0.13)]">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full border border-white/10" />
          <div className="absolute -bottom-16 right-12 h-32 w-32 rounded-full border border-white/[0.07]" />

          <div className="relative">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white/70">
              <Gift
                size={
                  17
                }
              />
            </span>

            <h1 className="mt-7 text-3xl font-semibold tracking-[-0.05em]">
              {
                t.title
              }
            </h1>

            <p className="mt-2 max-w-[330px] text-xs leading-5 text-white/45">
              {
                t.subtitle
              }
            </p>

            <div className="mt-6 grid grid-cols-2 gap-2">
              <div className="rounded-[16px] bg-white/[0.07] p-3">
                <p className="text-[8px] font-extrabold uppercase tracking-[0.12em] text-white/30">
                  {
                    t.availableCount
                  }
                </p>

                <p className="mt-1 text-xl font-semibold">
                  {
                    publicActive.filter(
                      (
                        coupon,
                      ) =>
                        getCouponState(
                          coupon,
                        ) ===
                        "active",
                    ).length
                  }
                </p>
              </div>

              <div className="rounded-[16px] bg-white/[0.07] p-3">
                <p className="text-[8px] font-extrabold uppercase tracking-[0.12em] text-white/30">
                  {
                    t.mineCount
                  }
                </p>

                <p className="mt-1 text-xl font-semibold">
                  {
                    myVouchers.length
                  }
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* TABS */}
        <section className="mt-5">
          <div className="grid grid-cols-3 rounded-[16px] border border-black/[0.07] bg-white p-1 shadow-sm">
            {(
              [
                [
                  "available",
                  t.available,
                  BadgePercent,
                ],
                [
                  "mine",
                  t.mine,
                  Ticket,
                ],
                [
                  "expired",
                  t.expired,
                  CalendarDays,
                ],
              ] as const
            ).map(
              (
                [
                  value,
                  label,
                  Icon,
                ],
              ) => {
                const active =
                  tab ===
                  value;

                return (
                  <button
                    type="button"
                    key={
                      value
                    }
                    onClick={() =>
                      setTab(
                        value,
                      )
                    }
                    className={[
                      "flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 text-[9px] font-extrabold transition",
                      active
                        ? "bg-black text-white"
                        : "text-black/35",
                    ].join(
                      " ",
                    )}
                  >
                    <Icon
                      size={
                        12
                      }
                    />

                    <span className="truncate">
                      {
                        label
                      }
                    </span>
                  </button>
                );
              },
            )}
          </div>

          <div className="relative mt-3">
            <Search
              size={
                14
              }
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-black/25"
            />

            <input
              type="search"
              value={
                search
              }
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder={
                t.search
              }
              className="h-11 w-full rounded-[14px] border border-black/[0.07] bg-white pl-10 pr-4 text-xs font-semibold outline-none shadow-sm placeholder:text-black/20 focus:border-black/20"
            />
          </div>
        </section>

        {/* LOGIN HINT */}
        {!userId &&
          tab ===
            "mine" && (
            <div className="mt-4 flex items-start gap-3 rounded-[18px] border border-black/[0.07] bg-white p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f2f2ee] text-black/40">
                <LockKeyhole
                  size={
                    14
                  }
                />
              </span>

              <p className="pt-0.5 text-[10px] leading-5 text-black/40">
                {
                  t.loginHint
                }
              </p>
            </div>
          )}

        {/* CONTENT */}
        <section className="mt-5 space-y-4">
          {loading ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[24px] border border-black/[0.07] bg-white">
              <Loader2 className="h-5 w-5 animate-spin text-black/35" />

              <p className="mt-3 text-[10px] font-bold text-black/30">
                {
                  t.loading
                }
              </p>
            </div>
          ) : error ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[24px] border border-red-100 bg-white px-6 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                <XCircle
                  size={
                    17
                  }
                />
              </span>

              <p className="mt-3 text-xs font-extrabold">
                {
                  error
                }
              </p>

              <button
                type="button"
                onClick={() =>
                  void handleRefresh()
                }
                className="mt-4 rounded-xl bg-black px-4 py-2.5 text-[10px] font-extrabold text-white"
              >
                {
                  t.refresh
                }
              </button>
            </div>
          ) : filteredCoupons.length ? (
            filteredCoupons.map(
              (
                coupon,
                index,
              ) => (
                <CouponCard
                  key={
                    coupon.id
                  }
                  coupon={
                    coupon
                  }
                  locale={
                    locale
                  }
                  isMine={
                    Boolean(
                      userId &&
                      coupon.claimable &&
                      coupon.claimedByUserId ===
                        userId,
                    )
                  }
                  index={
                    index
                  }
                  onCopy={() =>
                    void copyCode(
                      coupon.code,
                    )
                  }
                />
              ),
            )
          ) : (
            <EmptyState
              tab={
                tab
              }
              locale={
                locale
              }
            />
          )}
        </section>
      </main>
    </div>
  );
}

function CouponCard({
  coupon,
  locale,
  isMine,
  index,
  onCopy,
}: {
  coupon:
    NormalizedCoupon;
  locale:
    Locale;
  isMine:
    boolean;
  index:
    number;
  onCopy:
    () => void;
}) {
  const t =
    copy[
      locale
    ];

  const state =
    getCouponState(
      coupon,
    );

  const ended =
    state ===
      "expired" ||
    state ===
      "quota-ended";

  const scheduled =
    state ===
    "scheduled";

  const percentage =
    coupon.discountRate >
    0;

  const benefit =
    percentage
      ? `${coupon.discountRate}%`
      : formatCurrency(
          coupon.discountPrice,
          locale,
        );

  const startLabel =
    formatDate(
      coupon.startDate,
      locale,
    );

  const expiryLabel =
    formatDate(
      coupon.expiredDate,
      locale,
    );

  return (
    <motion.article
      initial={{
        opacity:
          0,
        y:
          7,
      }}
      animate={{
        opacity:
          1,
        y:
          0,
      }}
      transition={{
        delay:
          Math.min(
            index *
              0.03,
            0.15,
          ),
      }}
      className={[
        "overflow-hidden rounded-[26px] border bg-white shadow-[0_8px_30px_rgba(0,0,0,0.045)]",
        ended
          ? "border-red-100"
          : isMine
            ? "border-black/15"
            : "border-black/[0.07]",
      ].join(
        " ",
      )}
    >
      {/* STATUS STRIP */}
      {(ended ||
        isMine ||
        scheduled) && (
        <div
          className={[
            "flex items-center gap-2 border-b px-4 py-2.5",
            ended
              ? "border-red-100 bg-red-50 text-red-700"
              : isMine
                ? "border-black/[0.07] bg-[#efefe9] text-black/60"
                : "border-amber-100 bg-amber-50 text-amber-700",
          ].join(
            " ",
          )}
        >
          {ended ? (
            <XCircle
              size={
                12
              }
            />
          ) : isMine ? (
            <UserRoundCheck
              size={
                12
              }
            />
          ) : (
            <CalendarDays
              size={
                12
              }
            />
          )}

          <span className="text-[8px] font-extrabold uppercase tracking-[0.12em]">
            {ended
              ? state ===
                "quota-ended"
                ? t.quotaEnded
                : t.ended
              : isMine
                ? t.mineBadge
                : t.scheduled}
          </span>
        </div>
      )}

      <div className="p-4">
        {/* BENEFIT / TITLE */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f2f2ee] px-2 py-1 text-[7px] font-extrabold uppercase tracking-[0.09em] text-black/40">
                {isMine ? (
                  <Ticket
                    size={
                      9
                    }
                  />
                ) : (
                  <Globe2
                    size={
                      9
                    }
                  />
                )}

                {isMine
                  ? t.targeted
                  : t.publicPromo}
              </span>

              {coupon.memberOnly && (
                <span className="inline-flex items-center gap-1 rounded-full border border-black/[0.07] px-2 py-1 text-[7px] font-extrabold uppercase tracking-[0.09em] text-black/35">
                  <ShieldCheck
                    size={
                      9
                    }
                  />

                  {
                    t.memberOnly
                  }
                </span>
              )}

              {coupon.autoApply && (
                <span className="inline-flex items-center gap-1 rounded-full bg-black px-2 py-1 text-[7px] font-extrabold uppercase tracking-[0.09em] text-white">
                  <Zap
                    size={
                      9
                    }
                  />

                  {
                    t.autoApply
                  }
                </span>
              )}
            </div>

            <h2
              className={[
                "mt-3 text-lg font-semibold tracking-[-0.035em]",
                ended
                  ? "text-black/45"
                  : "text-black",
              ].join(
                " ",
              )}
            >
              {
                coupon.title
              }
            </h2>
          </div>

          <div
            className={[
              "shrink-0 text-right",
              ended
                ? "opacity-45"
                : "",
            ].join(
              " ",
            )}
          >
            <p className="text-2xl font-semibold tracking-[-0.05em]">
              {
                benefit
              }
            </p>

            <p className="mt-0.5 text-[7px] font-extrabold uppercase tracking-[0.12em] text-black/30">
              {percentage
                ? t.percentageOff
                : t.fixedOff}
            </p>
          </div>
        </div>

        {/* HTML DESCRIPTION */}
        <div
          className={[
            "coupon-customer-description mt-4 text-[11px] leading-5",
            ended
              ? "text-black/30"
              : "text-black/45",
          ].join(
            " ",
          )}
          dangerouslySetInnerHTML={{
            __html:
              sanitizeHtml(
                coupon.description ||
                  `<p>${t.noDescription}</p>`,
              ),
          }}
        />

        {/* CODE */}
        {/* <button
          type="button"
          onClick={
            onCopy
          }
          disabled={
            !coupon.code
          }
          className={[
            "group mt-5 w-full rounded-[18px] border p-3 text-left transition active:scale-[0.99] disabled:cursor-not-allowed",
            ended
              ? "border-black/[0.05] bg-[#f5f5f2] opacity-60"
              : "border-black/[0.09] bg-[#f7f7f4] hover:border-black/20",
          ].join(
            " ",
          )}
        >
          <span className="flex items-center justify-between gap-3">
            <span className="text-[7px] font-extrabold uppercase tracking-[0.14em] text-black/25">
              {
                t.couponCode
              }
            </span>

            <span className="inline-flex items-center gap-1.5 text-[8px] font-extrabold uppercase tracking-[0.09em] text-black/35 transition group-hover:text-black/60">
              <Copy
                size={
                  10
                }
              />

              {
                t.copyCode
              }
            </span>
          </span>

          <span className="mt-1.5 block break-all font-mono text-xl font-extrabold tracking-[0.07em] text-black">
            {coupon.code ||
              t.codeUnavailable}
          </span>
        </button> */}

        {/* META */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <MetaBox
            icon={
              CalendarDays
            }
            label={
              scheduled
                ? t.starts
                : t.expires
            }
            value={
              scheduled
                ? startLabel ||
                  "-"
                : expiryLabel ||
                  t.noExpiry
            }
          />

          <MetaBox
            icon={
              Tag
            }
            label={
              coupon.claimable
                ? t.validAfterClaim
                : t.usage
            }
            value={
              coupon.claimable
                ? coupon.validDaysAfterClaim >
                  0
                  ? `${coupon.validDaysAfterClaim} ${t.days}`
                  : t.noExpiry
                : coupon.maxUse >
                    0
                  ? `${coupon.alreadyUsed} / ${coupon.maxUse}`
                  : t.unlimited
            }
          />
        </div>

        {coupon.branchIds.length ===
          0 && (
          <div className="mt-3 flex items-center gap-2 border-t border-black/[0.05] pt-3 text-[8px] font-bold uppercase tracking-[0.08em] text-black/25">
            <Globe2
              size={
                10
              }
            />

            {
              t.global
            }
          </div>
        )}
      </div>
    </motion.article>
  );
}

function MetaBox({
  icon:
    Icon,
  label,
  value,
}: {
  icon:
    LucideIcon;
  label:
    string;
  value:
    string;
}) {
  return (
    <div className="rounded-[14px] bg-[#f4f4f0] p-3">
      <div className="flex items-center gap-1.5 text-[7px] font-extrabold uppercase tracking-[0.1em] text-black/25">
        <Icon
          size={
            9
          }
        />

        {
          label
        }
      </div>

      <p className="mt-1 truncate text-[9px] font-extrabold text-black/50">
        {
          value
        }
      </p>
    </div>
  );
}

function EmptyState({
  tab,
  locale,
}: {
  tab:
    CouponTab;
  locale:
    Locale;
}) {
  const t =
    copy[
      locale
    ];

  const message =
    tab ===
      "mine"
      ? t.emptyMine
      : tab ===
          "expired"
        ? t.emptyExpired
        : t.emptyAvailable;

  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[24px] border border-dashed border-black/[0.08] bg-white px-8 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f2f2ee] text-black/25">
        <Sparkles
          size={
            17
          }
        />
      </span>

      <p className="mt-4 text-xs font-extrabold text-black/45">
        {
          message
        }
      </p>
    </div>
  );
}
