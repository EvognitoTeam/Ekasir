"use client";

import dynamic from "next/dynamic";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Copy,
  Edit3,
  Globe2,
  Layers3,
  Loader2,
  MapPin,
  Percent,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Ticket,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";

import type {
  LucideIcon,
} from 'lucide-react';

import "react-quill-new/dist/quill.snow.css";

import {
  useLanguageStore,
} from "@/store/language.store";

import {
  Toast,
} from "@/utils/toast";

const ReactQuill =
  dynamic(
    () =>
      import(
        "react-quill-new"
      ),
    {
      ssr:
        false,

      loading:
        () => (
          <div className="h-[170px] animate-pulse rounded-xl bg-[#f2f2ee]" />
        ),
    },
  );

type Locale =
  | "id"
  | "en";

type CampaignFilter =
  | "all"
  | "active"
  | "scheduled"
  | "ended"
  | "claimable";

type BranchFilter =
  | "all"
  | "global"
  | number;

type FormMode =
  | "closed"
  | "create"
  | "edit";

type Branch = {
  id: number;
  name: string;
  branch_slug: string;
};

type CouponData = {
  id: number;
  mitra_id: number | null;
  branch_id: number | null;
  branch_ids: number[];
  title: string | null;
  image: string | null;
  description: string | null;
  coupon_code: string;

  is_member_only: boolean;

  discount_price: string | null;
  discount_rate: number | null;

  max_use: number;
  already_used: number;

  is_auto_apply: boolean;

  applicable_items: number[];

  max_use_per_user: number;
  daily_user_limit: number;
  monthly_user_limit: number;
  yearly_user_limit: number;

  is_claimable: boolean;
  valid_days_after_claim: number;
  claimed_by_user_id: number | null;

  campaign_group_id: string | null;

  start_date:
    | string
    | Date
    | null;

  expired_date:
    | string
    | Date
    | null;

  createdAt:
    | string
    | Date
    | null;

  updatedAt:
    | string
    | Date
    | null;

  deletedAt:
    | string
    | Date
    | null;
};

type PromoPayload = {
  branch_ids: number[];
  title: string;
  description: string;
  coupon_code: string;

  is_member_only: boolean;

  discount_rate: number | null;
  discount_price: string | null;

  max_use: number;
  is_auto_apply: boolean;

  applicable_items: number[];

  max_use_per_user: number;
  daily_user_limit: number;
  monthly_user_limit: number;
  yearly_user_limit: number;

  is_claimable: boolean;
  valid_days_after_claim: number;
  bulk_count: number;

  start_date: Date | null;
  expired_date: Date | null;
};

type EditorForm = {
  all_branches: boolean;
  branch_ids: number[];

  title: string;
  description: string;
  coupon_code: string;

  is_member_only: boolean;
  is_auto_apply: boolean;

  discountType:
    | "percentage"
    | "fixed";

  discount_rate: string;
  discount_price: string;

  max_use: number;

  max_use_per_user: number;
  daily_user_limit: number;
  monthly_user_limit: number;
  yearly_user_limit: number;

  applicable_items: number[];

  is_claimable: boolean;
  valid_days_after_claim: number;

  bulk_count: number;

  start_date: string;
  expired_date: string;
};

const copy = {
  id: {
    eyebrow:
      "Campaign studio",

    title:
      "Promo & Event",

    subtitle:
      "Susun kampanye diskon, voucher targeted, dan periode promosi untuk seluruh outlet atau cabang tertentu.",

    refresh:
      "Perbarui",

    refreshing:
      "Memperbarui",

    create:
      "Buat kampanye",

    totalCampaign:
      "Total kampanye",

    activeCampaign:
      "Sedang aktif",

    scheduledCampaign:
      "Terjadwal",

    claimableVoucher:
      "Voucher targeted",

    search:
      "Cari nama atau kode promo...",

    all:
      "Semua",

    active:
      "Aktif",

    scheduled:
      "Terjadwal",

    ended:
      "Berakhir",

    claimable:
      "Targeted",

    allBranches:
      "Semua outlet",

    global:
      "Global",

    campaignList:
      "Campaign board",

    campaignListDesc:
      "Pantau benefit, periode aktif, cakupan outlet, quota, dan tipe promo.",

    campaign:
      "kampanye",

    noCampaign:
      "Belum ada kampanye yang cocok dengan filter.",

    percentage:
      "Persentase",

    fixed:
      "Nominal",

    off:
      "OFF",

    used:
      "Digunakan",

    unlimited:
      "Tanpa batas",

    starts:
      "Mulai",

    expires:
      "Berakhir",

    now:
      "Sekarang",

    member:
      "Member",

    autoApply:
      "Auto-Apply",

    targeted:
      "Targeted",

    claimed:
      "Sudah diklaim",

    claimedStrong:
      "SUDAH DIKLAIM",

    expiredStrong:
      "EXPIRED",

    unclaimed:
      "Belum diklaim",

    quotaEnded:
      "Kuota habis",

    edit:
      "Edit",

    delete:
      "Hapus",

    deleteTitle:
      "Hapus kampanye?",

    deleteDesc:
      "Kampanye akan dihapus dari sistem.",

    cancel:
      "Batal",

    confirmDelete:
      "Hapus kampanye",

    createTitle:
      "Kampanye baru",

    editTitle:
      "Edit kampanye",

    editorDesc:
      "Atur benefit, periode, outlet, voucher, dan limit penggunaan.",

    identity:
      "Identitas kampanye",

    identityDesc:
      "Nama kampanye, kode kupon, dan syarat promo.",

    promoName:
      "Nama promo",

    promoNamePlaceholder:
      "Contoh: Payday Treat",

    couponCode:
      "Kode kupon",

    copyCode:
      "Salin kode",

    codeCopied:
      "Kode promo berhasil disalin",

    couponPrefix:
      "Prefix kode voucher",

    couponPlaceholder:
      "PAYDAY20",

    prefixPlaceholder:
      "GIFT",

    generatedCodeHint:
      "Kode voucher akan dibuat otomatis menggunakan prefix ini.",

    description:
      "Deskripsi & ketentuan",

    descriptionPlaceholder:
      "Jelaskan benefit dan syarat promo...",

    outletScope:
      "Cakupan outlet",

    outletScopeDesc:
      "Pilih semua outlet atau batasi kampanye pada outlet tertentu.",

    allOutlet:
      "Semua outlet",

    benefit:
      "Benefit promo",

    benefitDesc:
      "Tentukan bentuk diskon yang diberikan.",

    discountType:
      "Tipe diskon",

    discountRate:
      "Diskon (%)",

    maxDiscount:
      "Maks. potongan",

    fixedDiscount:
      "Nominal potongan",

    timing:
      "Periode kampanye",

    timingDesc:
      "Atur waktu publikasi dan masa berlaku.",

    startDate:
      "Mulai berlaku",

    endDate:
      "Berakhir",

    claimStart:
      "Mulai publikasi",

    claimEnd:
      "Batas akhir klaim",

    targeting:
      "Target & automasi",

    targetingDesc:
      "Atur siapa yang menerima dan bagaimana promo diterapkan.",

    memberOnly:
      "Member eksklusif",

    memberOnlyDesc:
      "Hanya pelanggan yang login.",

    autoApplyTitle:
      "Auto-Apply",

    autoApplyDesc:
      "Terapkan otomatis saat syarat terpenuhi.",

    voucherTargeted:
      "Voucher targeted",

    voucherTargetedDesc:
      "Kode unik yang akan terikat ke satu akun pelanggan.",

    bulkCount:
      "Jumlah voucher",

    bulkHint:
      "Bulk generate hanya tersedia saat membuat voucher baru.",

    validDays:
      "Masa aktif setelah diklaim",

    days:
      "hari",

    usage:
      "Limit penggunaan",

    usageDesc:
      "Isi 0 jika limit tidak digunakan.",

    globalQuota:
      "Kuota global",

    dailyLimit:
      "Per hari / user",

    monthlyLimit:
      "Per bulan / user",

    yearlyLimit:
      "Per tahun / user",

    lifetimeLimit:
      "Lifetime / user",

    save:
      "Simpan kampanye",

    update:
      "Update kampanye",

    saving:
      "Menyimpan",

    errorNameCode:
      "Nama promo dan kode kupon/prefix wajib diisi.",

    errorPercent:
      "Persentase diskon harus berada di antara 1 sampai 100.",

    errorFixed:
      "Nominal potongan wajib lebih dari Rp0.",

    errorDate:
      "Waktu berakhir harus setelah waktu mulai.",

    errorBulk:
      "Jumlah voucher minimal 1.",

    loadError:
      "Gagal memuat data promosi.",

    saveError:
      "Gagal menyimpan promo.",

    deleteError:
      "Gagal menghapus promo.",

    created:
      "Promo berhasil ditambahkan.",

    updated:
      "Promo berhasil diperbarui.",

    deleted:
      "Promo berhasil dihapus.",

    genericError:
      "Terjadi kesalahan sistem.",

    validAfterClaim:
      "aktif setelah klaim",
  },

  en: {
    eyebrow:
      "Campaign studio",

    title:
      "Promos & Events",

    subtitle:
      "Build discount campaigns, targeted vouchers, and promotional periods for all outlets or selected branches.",

    refresh:
      "Refresh",

    refreshing:
      "Refreshing",

    create:
      "Create campaign",

    totalCampaign:
      "Total campaigns",

    activeCampaign:
      "Active now",

    scheduledCampaign:
      "Scheduled",

    claimableVoucher:
      "Targeted vouchers",

    search:
      "Search campaign or promo code...",

    all:
      "All",

    active:
      "Active",

    scheduled:
      "Scheduled",

    ended:
      "Ended",

    claimable:
      "Targeted",

    allBranches:
      "All outlets",

    global:
      "Global",

    campaignList:
      "Campaign board",

    campaignListDesc:
      "Track benefit, active period, outlet scope, quota, and campaign type.",

    campaign:
      "campaigns",

    noCampaign:
      "No campaigns match the current filters.",

    percentage:
      "Percentage",

    fixed:
      "Fixed",

    off:
      "OFF",

    used:
      "Used",

    unlimited:
      "Unlimited",

    starts:
      "Starts",

    expires:
      "Ends",

    now:
      "Now",

    member:
      "Member",

    autoApply:
      "Auto-Apply",

    targeted:
      "Targeted",

    claimed:
      "Claimed",

    claimedStrong:
      "CLAIMED",

    expiredStrong:
      "EXPIRED",

    unclaimed:
      "Unclaimed",

    quotaEnded:
      "Quota ended",

    edit:
      "Edit",

    delete:
      "Delete",

    deleteTitle:
      "Delete campaign?",

    deleteDesc:
      "This campaign will be removed from the system.",

    cancel:
      "Cancel",

    confirmDelete:
      "Delete campaign",

    createTitle:
      "New campaign",

    editTitle:
      "Edit campaign",

    editorDesc:
      "Configure benefits, timing, outlets, vouchers, and usage limits.",

    identity:
      "Campaign identity",

    identityDesc:
      "Campaign name, coupon code, and promotional terms.",

    promoName:
      "Promo name",

    promoNamePlaceholder:
      "Example: Payday Treat",

    couponCode:
      "Coupon code",

    copyCode:
      "Copy code",

    codeCopied:
      "Promo code copied",

    couponPrefix:
      "Voucher code prefix",

    couponPlaceholder:
      "PAYDAY20",

    prefixPlaceholder:
      "GIFT",

    generatedCodeHint:
      "Voucher codes will be generated automatically using this prefix.",

    description:
      "Description & terms",

    descriptionPlaceholder:
      "Explain campaign benefits and terms...",

    outletScope:
      "Outlet scope",

    outletScopeDesc:
      "Apply globally or restrict this campaign to selected outlets.",

    allOutlet:
      "All outlets",

    benefit:
      "Campaign benefit",

    benefitDesc:
      "Choose the discount customers receive.",

    discountType:
      "Discount type",

    discountRate:
      "Discount (%)",

    maxDiscount:
      "Max discount",

    fixedDiscount:
      "Fixed discount",

    timing:
      "Campaign period",

    timingDesc:
      "Configure publication and validity dates.",

    startDate:
      "Starts",

    endDate:
      "Ends",

    claimStart:
      "Publication starts",

    claimEnd:
      "Claim deadline",

    targeting:
      "Target & automation",

    targetingDesc:
      "Configure who receives the campaign and how it is applied.",

    memberOnly:
      "Member exclusive",

    memberOnlyDesc:
      "Only signed-in customers.",

    autoApplyTitle:
      "Auto-Apply",

    autoApplyDesc:
      "Apply automatically when conditions are met.",

    voucherTargeted:
      "Targeted voucher",

    voucherTargetedDesc:
      "Unique codes that bind to one customer account.",

    bulkCount:
      "Voucher quantity",

    bulkHint:
      "Bulk generation is available only while creating a new voucher.",

    validDays:
      "Validity after claim",

    days:
      "days",

    usage:
      "Usage limits",

    usageDesc:
      "Use 0 when a limit is not required.",

    globalQuota:
      "Global quota",

    dailyLimit:
      "Per day / user",

    monthlyLimit:
      "Per month / user",

    yearlyLimit:
      "Per year / user",

    lifetimeLimit:
      "Lifetime / user",

    save:
      "Save campaign",

    update:
      "Update campaign",

    saving:
      "Saving",

    errorNameCode:
      "Campaign name and coupon code/prefix are required.",

    errorPercent:
      "Discount percentage must be between 1 and 100.",

    errorFixed:
      "Fixed discount must be greater than Rp0.",

    errorDate:
      "End time must be later than the start time.",

    errorBulk:
      "Voucher quantity must be at least 1.",

    loadError:
      "Failed to load promotions.",

    saveError:
      "Failed to save promotion.",

    deleteError:
      "Failed to delete promotion.",

    created:
      "Promotion created.",

    updated:
      "Promotion updated.",

    deleted:
      "Promotion deleted.",

    genericError:
      "A system error occurred.",

    validAfterClaim:
      "valid after claim",
  },
} as const;

function safeDate(
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

function getLocalDatetime(
  value:
    string |
    Date |
    null |
    undefined,
) {
  const date =
    safeDate(
      value,
    );

  if (!date) {
    return "";
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() +
        1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      "0",
    );

  const hour =
    String(
      date.getHours(),
    ).padStart(
      2,
      "0",
    );

  const minute =
    String(
      date.getMinutes(),
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function formatCurrency(
  value:
    number |
    string |
    null |
    undefined,
  locale:
    Locale,
) {
  const numeric =
    Number(
      value ??
        0,
    );

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
    Number.isFinite(
      numeric,
    )
      ? numeric
      : 0,
  );
}

function formatDateTime(
  value:
    string |
    Date |
    null |
    undefined,
  locale:
    Locale,
) {
  const date =
    safeDate(
      value,
    );

  if (!date) {
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
      hour:
        "2-digit",
      minute:
        "2-digit",
    },
  ).format(
    date,
  );
}

function campaignState(
  promo:
    CouponData,
):
  | "active"
  | "scheduled"
  | "ended"
  | "claimable"
  | "claimed" {
  if (
    promo.is_claimable
  ) {
    return promo.claimed_by_user_id
      ? "claimed"
      : "claimable";
  }

  const now =
    new Date();

  const start =
    safeDate(
      promo.start_date,
    );

  const end =
    safeDate(
      promo.expired_date,
    );

  if (
    start &&
    now <
      start
  ) {
    return "scheduled";
  }

  if (
    end &&
    now >
      end
  ) {
    return "ended";
  }

  if (
    promo.max_use >
      0 &&
    promo.already_used >=
      promo.max_use
  ) {
    return "ended";
  }

  return "active";
}

function initialEditorForm(
  initial:
    CouponData |
    null,
): EditorForm {
  return {
    all_branches:
      !initial ||
      !Array.isArray(
        initial.branch_ids,
      ) ||
      initial.branch_ids.length ===
        0,

    branch_ids:
      initial?.branch_ids ??
      [],

    title:
      initial?.title ??
      "",

    description:
      initial?.description ??
      "",

    coupon_code:
      initial?.coupon_code ??
      "",

    is_member_only:
      Boolean(
        initial?.is_member_only,
      ),

    is_auto_apply:
      Boolean(
        initial?.is_auto_apply,
      ),

    discountType:
      initial?.discount_rate &&
      initial.discount_rate >
        0
        ? "percentage"
        : "fixed",

    discount_rate:
      initial?.discount_rate
        ? String(
            initial.discount_rate,
          )
        : "",

    discount_price:
      initial?.discount_price ??
      "",

    max_use:
      Number(
        initial?.max_use ??
          0,
      ),

    max_use_per_user:
      Number(
        initial?.max_use_per_user ??
          0,
      ),

    daily_user_limit:
      Number(
        initial?.daily_user_limit ??
          0,
      ),

    monthly_user_limit:
      Number(
        initial?.monthly_user_limit ??
          0,
      ),

    yearly_user_limit:
      Number(
        initial?.yearly_user_limit ??
          0,
      ),

    applicable_items:
      initial?.applicable_items ??
      [],

    is_claimable:
      Boolean(
        initial?.is_claimable,
      ),

    valid_days_after_claim:
      Number(
        initial?.valid_days_after_claim ??
          0,
      ),

    bulk_count:
      1,

    start_date:
      getLocalDatetime(
        initial?.start_date,
      ),

    expired_date:
      getLocalDatetime(
        initial?.expired_date,
      ),
  };
}

export default function AdminPromosPage() {
  const params =
    useParams<{
      mitraSlug:
        string;
    }>();

  const slug =
    String(
      params.mitraSlug ??
        "",
    );

  const locale =
    useLanguageStore(
      (
        state,
      ) =>
        state.locale,
    ) as Locale;

  const t =
    copy[locale];

  const [
    promos,
    setPromos,
  ] =
    useState<CouponData[]>(
      [],
    );

  const [
    branches,
    setBranches,
  ] =
    useState<Branch[]>(
      [],
    );

  const [
    formMode,
    setFormMode,
  ] =
    useState<FormMode>(
      "closed",
    );

  const [
    editingPromo,
    setEditingPromo,
  ] =
    useState<CouponData | null>(
      null,
    );

  const [
    form,
    setForm,
  ] =
    useState<EditorForm>(
      initialEditorForm(
        null,
      ),
    );

  const [
    formError,
    setFormError,
  ] =
    useState(
      "",
    );

  const [
    search,
    setSearch,
  ] =
    useState(
      "",
    );

  const [
    campaignFilter,
    setCampaignFilter,
  ] =
    useState<CampaignFilter>(
      "all",
    );

  const [
    branchFilter,
    setBranchFilter,
  ] =
    useState<BranchFilter>(
      "all",
    );

  const [
    deleteConfirm,
    setDeleteConfirm,
  ] =
    useState<CouponData | null>(
      null,
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true,
    );

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(
      false,
    );

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false,
    );

  const fetchData =
    async (
      showLoader =
        true,
    ) => {
      if (
        showLoader
      ) {
        setIsLoading(
          true,
        );
      }

      try {
        const [
          couponResponse,
          branchResponse,
        ] =
          await Promise.all([
            fetch(
              "/api/pos/coupons",
              {
                cache:
                  "no-store",
                credentials:
                  "include",
              },
            ),

            slug
              ? fetch(
                  `/api/pos/branches?slug=${encodeURIComponent(
                    slug,
                  )}`,
                  {
                    cache:
                      "no-store",
                    credentials:
                      "include",
                  },
                )
              : Promise.resolve(
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
              t.loadError,
          );
        }

        setPromos(
          Array.isArray(
            couponResult.data,
          )
            ? couponResult.data
            : [],
        );

        if (
          branchResponse?.ok
        ) {
          const branchResult =
            await branchResponse.json();

          if (
            branchResult.success
          ) {
            setBranches(
              Array.isArray(
                branchResult.data,
              )
                ? branchResult.data
                : [],
            );
          }
        }
      } catch (
        error
      ) {
        console.error(
          "[ADMIN_PROMO_LOAD_ERROR]",
          error,
        );

        Toast.fire({
          icon:
            "error",
          title:
            error instanceof
              Error
              ? error.message
              : t.loadError,
        });
      } finally {
        if (
          showLoader
        ) {
          setIsLoading(
            false,
          );
        }
      }
    };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    slug,
  ]);

  const activeCount =
    useMemo(
      () =>
        promos.filter(
          (
            promo,
          ) =>
            campaignState(
              promo,
            ) ===
            "active",
        ).length,
      [
        promos,
      ],
    );

  const scheduledCount =
    useMemo(
      () =>
        promos.filter(
          (
            promo,
          ) =>
            campaignState(
              promo,
            ) ===
            "scheduled",
        ).length,
      [
        promos,
      ],
    );

  const claimableCount =
    useMemo(
      () =>
        promos.filter(
          (
            promo,
          ) =>
            promo.is_claimable,
        ).length,
      [
        promos,
      ],
    );

  const filteredPromos =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        return promos.filter(
          (
            promo,
          ) => {
            const state =
              campaignState(
                promo,
              );

            const searchMatch =
              !query ||
              `${promo.title ?? ""} ${promo.coupon_code} ${promo.campaign_group_id ?? ""}`
                .toLowerCase()
                .includes(
                  query,
                );

            const campaignMatch =
              campaignFilter ===
                "all" ||
              (
                campaignFilter ===
                  "claimable"
                  ? promo.is_claimable
                  : state ===
                    campaignFilter
              );

            const branchMatch =
              branchFilter ===
                "all" ||
              (
                branchFilter ===
                  "global"
                  ? promo.branch_ids.length ===
                    0
                  : promo.branch_ids.includes(
                      branchFilter,
                    )
              );

            return (
              searchMatch &&
              campaignMatch &&
              branchMatch
            );
          },
        );
      },
      [
        branchFilter,
        campaignFilter,
        promos,
        search,
      ],
    );

  const openCreate =
    () => {
      setEditingPromo(
        null,
      );

      setForm(
        initialEditorForm(
          null,
        ),
      );

      setFormError(
        "",
      );

      setFormMode(
        "create",
      );
    };

  const openEdit =
    (
      promo:
        CouponData,
    ) => {
      setEditingPromo(
        promo,
      );

      setForm(
        initialEditorForm(
          promo,
        ),
      );

      setFormError(
        "",
      );

      setFormMode(
        "edit",
      );
    };

  const closeEditor =
    () => {
      if (
        isSubmitting
      ) {
        return;
      }

      setFormMode(
        "closed",
      );

      setEditingPromo(
        null,
      );

      setFormError(
        "",
      );
    };

  const toggleBranch =
    (
      branchId:
        number,
    ) => {
      setForm(
        (
          current,
        ) => {
          const checked =
            current.branch_ids.includes(
              branchId,
            );

          return {
            ...current,
            branch_ids:
              checked
                ? current.branch_ids.filter(
                    (
                      id,
                    ) =>
                      id !==
                      branchId,
                  )
                : [
                    ...current.branch_ids,
                    branchId,
                  ],
          };
        },
      );
    };

  const savePromo =
    async () => {
      if (
        !form.title.trim() ||
        !form.coupon_code.trim()
      ) {
        setFormError(
          t.errorNameCode,
        );
        return;
      }

      if (
        form.discountType ===
          "percentage" &&
        (
          !form.discount_rate ||
          Number(
            form.discount_rate,
          ) <=
            0 ||
          Number(
            form.discount_rate,
          ) >
            100
        )
      ) {
        setFormError(
          t.errorPercent,
        );
        return;
      }

      if (
        form.discountType ===
          "fixed" &&
        (
          !form.discount_price ||
          Number(
            form.discount_price,
          ) <=
            0
        )
      ) {
        setFormError(
          t.errorFixed,
        );
        return;
      }

      if (
        form.start_date &&
        form.expired_date &&
        new Date(
          form.expired_date,
        ) <=
          new Date(
            form.start_date,
          )
      ) {
        setFormError(
          t.errorDate,
        );
        return;
      }

      if (
        form.is_claimable &&
        form.bulk_count <
          1
      ) {
        setFormError(
          t.errorBulk,
        );
        return;
      }

      setFormError(
        "",
      );

      const payload:
        PromoPayload = {
          branch_ids:
            form.all_branches
              ? []
              : form.branch_ids,

          title:
            form.title.trim(),

          description:
            form.description,

          coupon_code:
            form.coupon_code
              .toUpperCase()
              .replace(
                /\s+/g,
                "",
              ),

          is_member_only:
            form.is_claimable
              ? true
              : form.is_member_only,

          is_auto_apply:
            form.is_claimable
              ? false
              : form.is_auto_apply,

          discount_rate:
            form.discountType ===
              "percentage"
              ? Number(
                  form.discount_rate,
                )
              : null,

          discount_price:
            form.discount_price
              ? String(
                  form.discount_price,
                )
              : null,

          max_use:
            form.is_claimable
              ? 0
              : Number(
                  form.max_use,
                ) ||
                0,

          applicable_items:
            form.applicable_items,

          max_use_per_user:
            form.is_claimable
              ? 0
              : Number(
                  form.max_use_per_user,
                ) ||
                0,

          daily_user_limit:
            form.is_claimable
              ? 0
              : Number(
                  form.daily_user_limit,
                ) ||
                0,

          monthly_user_limit:
            form.is_claimable
              ? 0
              : Number(
                  form.monthly_user_limit,
                ) ||
                0,

          yearly_user_limit:
            form.is_claimable
              ? 0
              : Number(
                  form.yearly_user_limit,
                ) ||
                0,

          is_claimable:
            form.is_claimable,

          valid_days_after_claim:
            Number(
              form.valid_days_after_claim,
            ) ||
            0,

          bulk_count:
            Number(
              form.bulk_count,
            ) ||
            1,

          start_date:
            form.start_date
              ? new Date(
                  form.start_date,
                )
              : null,

          expired_date:
            form.expired_date
              ? new Date(
                  form.expired_date,
                )
              : null,
        };

      setIsSubmitting(
        true,
      );

      try {
        const id =
          editingPromo?.id;

        const response =
          await fetch(
            id
              ? `/api/pos/coupons?id=${id}`
              : "/api/pos/coupons",
            {
              method:
                id
                  ? "PUT"
                  : "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              credentials:
                "include",

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
              t.saveError,
          );
        }

        Toast.fire({
          icon:
            "success",
          title:
            id
              ? t.updated
              : t.created,
        });

        closeEditor();

        await fetchData(
          false,
        );
      } catch (
        error
      ) {
        Toast.fire({
          icon:
            "error",
          title:
            error instanceof
              Error
              ? error.message
              : t.genericError,
        });
      } finally {
        setIsSubmitting(
          false,
        );
      }
    };

  const removePromo =
    async () => {
      if (
        !deleteConfirm
      ) {
        return;
      }

      setIsSubmitting(
        true,
      );

      try {
        const response =
          await fetch(
            `/api/pos/coupons?id=${deleteConfirm.id}`,
            {
              method:
                "DELETE",
              credentials:
                "include",
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
              t.deleteError,
          );
        }

        Toast.fire({
          icon:
            "success",
          title:
            t.deleted,
        });

        setDeleteConfirm(
          null,
        );

        await fetchData(
          false,
        );
      } catch (
        error
      ) {
        Toast.fire({
          icon:
            "error",
          title:
            error instanceof
              Error
              ? error.message
              : t.genericError,
        });
      } finally {
        setIsSubmitting(
          false,
        );
      }
    };

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
        await fetchData(
          false,
        );
      } finally {
        setRefreshing(
          false,
        );
      }
    };

  return (
    <div className="space-y-6 pb-16">
      {/* HEADER */}
      <section className="flex flex-col gap-5 border-b border-black/[0.08] pb-7 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-black/30">
            <Sparkles
              size={
                13
              }
            />

            {
              t.eyebrow
            }
          </div>

          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
            {
              t.title
            }
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/40">
            {
              t.subtitle
            }
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              void handleRefresh()
            }
            disabled={
              refreshing
            }
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-black/[0.08] bg-white px-4 text-xs font-extrabold shadow-sm transition hover:border-black/20 disabled:opacity-50"
          >
            <RefreshCw
              size={
                14
              }
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            {
              refreshing
                ? t.refreshing
                : t.refresh
            }
          </button>

          <button
            type="button"
            onClick={
              openCreate
            }
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-black px-4 text-xs font-extrabold text-white transition hover:bg-[#262626]"
          >
            <Plus
              size={
                14
              }
            />

            {
              t.create
            }
          </button>
        </div>
      </section>

      {/* METRICS */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={
            Layers3
          }
          label={
            t.totalCampaign
          }
          value={
            String(
              promos.length,
            )
          }
          dark
        />

        <Metric
          icon={
            Zap
          }
          label={
            t.activeCampaign
          }
          value={
            String(
              activeCount,
            )
          }
        />

        <Metric
          icon={
            CalendarDays
          }
          label={
            t.scheduledCampaign
          }
          value={
            String(
              scheduledCount,
            )
          }
        />

        <Metric
          icon={
            Ticket
          }
          label={
            t.claimableVoucher
          }
          value={
            String(
              claimableCount,
            )
          }
        />
      </section>

      {/* SEARCH / FILTER */}
      <section className="rounded-[24px] border border-black/[0.08] bg-white p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <Search
              size={
                15
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
              className="h-11 w-full rounded-xl border border-black/[0.08] bg-[#fafaf8] pl-10 pr-4 text-xs font-semibold outline-none placeholder:text-black/25 focus:border-black/20"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {(
              [
                [
                  "all",
                  t.all,
                ],
                [
                  "active",
                  t.active,
                ],
                [
                  "scheduled",
                  t.scheduled,
                ],
                [
                  "ended",
                  t.ended,
                ],
                [
                  "claimable",
                  t.claimable,
                ],
              ] as const
            ).map(
              (
                [
                  value,
                  label,
                ],
              ) => (
                <button
                  type="button"
                  key={
                    value
                  }
                  onClick={() =>
                    setCampaignFilter(
                      value,
                    )
                  }
                  className={[
                    "h-11 whitespace-nowrap rounded-xl border px-4 text-[10px] font-extrabold uppercase tracking-[0.08em] transition",
                    campaignFilter ===
                    value
                      ? "border-black bg-black text-white"
                      : "border-black/[0.08] bg-white text-black/40 hover:text-black",
                  ].join(
                    " ",
                  )}
                >
                  {
                    label
                  }
                </button>
              ),
            )}
          </div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto border-t border-black/[0.06] pt-3">
          <BranchFilterButton
            active={
              branchFilter ===
              "all"
            }
            label={
              t.allBranches
            }
            onClick={() =>
              setBranchFilter(
                "all",
              )
            }
          />

          <BranchFilterButton
            active={
              branchFilter ===
              "global"
            }
            label={
              t.global
            }
            onClick={() =>
              setBranchFilter(
                "global",
              )
            }
            global
          />

          {branches.map(
            (
              branch,
            ) => (
              <BranchFilterButton
                key={
                  branch.id
                }
                active={
                  branchFilter ===
                  branch.id
                }
                label={
                  branch.name
                }
                onClick={() =>
                  setBranchFilter(
                    branch.id,
                  )
                }
              />
            ),
          )}
        </div>
      </section>

      {/* BOARD */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-black/30">
              {
                t.campaignList
              }
            </p>

            <p className="mt-1 text-xs leading-5 text-black/35">
              {
                t.campaignListDesc
              }
            </p>
          </div>

          <span className="whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.12em] text-black/30">
            {
              filteredPromos.length
            }{" "}
            {
              t.campaign
            }
          </span>
        </div>

        {isLoading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-[26px] border border-black/[0.08] bg-white">
            <Loader2 className="h-5 w-5 animate-spin text-black/40" />
          </div>
        ) : filteredPromos.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredPromos.map(
              (
                promo,
                index,
              ) => (
                <CampaignCard
                  key={
                    promo.id
                  }
                  promo={
                    promo
                  }
                  branches={
                    branches
                  }
                  locale={
                    locale
                  }
                  index={
                    index
                  }
                  onEdit={() =>
                    openEdit(
                      promo,
                    )
                  }
                  onDelete={() =>
                    setDeleteConfirm(
                      promo,
                    )
                  }
                />
              ),
            )}
          </div>
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[26px] border border-dashed border-black/[0.08] bg-white px-6 text-center">
            <Tag
              size={
                22
              }
              className="text-black/20"
            />

            <p className="mt-3 text-sm font-semibold text-black/35">
              {
                t.noCampaign
              }
            </p>
          </div>
        )}
      </section>

      {/* EDITOR DRAWER */}
      <AnimatePresence>
        {formMode !==
          "closed" && (
          <>
            <motion.button
              type="button"
              initial={{
                opacity:
                  0,
              }}
              animate={{
                opacity:
                  1,
              }}
              exit={{
                opacity:
                  0,
              }}
              onClick={
                closeEditor
              }
              className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-[2px]"
            />

            <motion.aside
              initial={{
                x:
                  "100%",
              }}
              animate={{
                x:
                  0,
              }}
              exit={{
                x:
                  "100%",
              }}
              transition={{
                type:
                  "spring",
                stiffness:
                  260,
                damping:
                  28,
              }}
              className="fixed inset-y-0 right-0 z-[80] flex w-full max-w-[720px] flex-col bg-[#f7f7f4] shadow-[-24px_0_60px_rgba(0,0,0,0.14)]"
            >
              <div className="flex items-start justify-between gap-4 border-b border-black/[0.08] bg-white px-5 py-5 sm:px-6">
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-black/30">
                    {
                      t.eyebrow
                    }
                  </p>

                  <h3 className="mt-1 text-xl font-semibold tracking-[-0.035em]">
                    {formMode ===
                    "edit"
                      ? t.editTitle
                      : t.createTitle}
                  </h3>

                  <p className="mt-1 text-[10px] leading-4 text-black/30">
                    {
                      t.editorDesc
                    }
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeEditor
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/[0.08] text-black/40"
                >
                  <X
                    size={
                      14
                    }
                  />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                {formError && (
                  <div className="mb-5 flex items-start gap-2 rounded-[16px] border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-700">
                    <AlertCircle
                      size={
                        14
                      }
                      className="mt-0.5 shrink-0"
                    />

                    {
                      formError
                    }
                  </div>
                )}

                <div className="space-y-5">
                  {/* IDENTITY */}
                  <EditorSection
                    icon={
                      Tag
                    }
                    title={
                      t.identity
                    }
                    description={
                      t.identityDesc
                    }
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label={
                          t.promoName
                        }
                        placeholder={
                          t.promoNamePlaceholder
                        }
                        value={
                          form.title
                        }
                        onChange={(
                          value,
                        ) =>
                          setForm(
                            (
                              current,
                            ) => ({
                              ...current,
                              title:
                                value,
                            }),
                          )
                        }
                      />

                      <Field
                        label={
                          form.is_claimable &&
                          formMode ===
                            "create"
                            ? t.couponPrefix
                            : t.couponCode
                        }
                        placeholder={
                          form.is_claimable &&
                          formMode ===
                            "create"
                            ? t.prefixPlaceholder
                            : t.couponPlaceholder
                        }
                        value={
                          form.coupon_code
                        }
                        uppercase
                        onChange={(
                          value,
                        ) =>
                          setForm(
                            (
                              current,
                            ) => ({
                              ...current,
                              coupon_code:
                                value,
                            }),
                          )
                        }
                      />
                    </div>

                    {form.is_claimable &&
                      formMode ===
                        "create" && (
                        <p className="-mt-2 text-[9px] text-black/30">
                          {
                            t.generatedCodeHint
                          }
                        </p>
                      )}

                    <div>
                      <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.14em] text-black/30">
                        {
                          t.description
                        }
                      </p>

                      <div className="kaloo-promo-quill overflow-hidden rounded-xl border border-black/[0.08] bg-[#fafaf8] focus-within:border-black/20">
                        <ReactQuill
                          theme="snow"
                          value={
                            form.description
                          }
                          onChange={(
                            description,
                          ) =>
                            setForm(
                              (
                                current,
                              ) => ({
                                ...current,
                                description,
                              }),
                            )
                          }
                          modules={{
                            toolbar: [
                              [
                                {
                                  header: [
                                    2,
                                    3,
                                    false,
                                  ],
                                },
                              ],

                              [
                                "bold",
                                "italic",
                                "underline",
                                "strike",
                              ],

                              [
                                {
                                  list:
                                    "ordered",
                                },
                                {
                                  list:
                                    "bullet",
                                },
                              ],

                              [
                                "blockquote",
                                "link",
                              ],

                              [
                                "clean",
                              ],
                            ],
                          }}
                          placeholder={
                            t.descriptionPlaceholder
                          }
                        />
                      </div>
                    </div>
                  </EditorSection>

                  {/* OUTLET SCOPE */}
                  <EditorSection
                    icon={
                      MapPin
                    }
                    title={
                      t.outletScope
                    }
                    description={
                      t.outletScopeDesc
                    }
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            all_branches:
                              !current.all_branches,
                            branch_ids:
                              !current.all_branches
                                ? []
                                : current.branch_ids,
                          }),
                        )
                      }
                      className={[
                        "flex w-full items-center gap-3 rounded-[16px] border p-3 text-left transition",
                        form.all_branches
                          ? "border-black bg-black text-white"
                          : "border-black/[0.08] bg-[#fafaf8] text-black",
                      ].join(
                        " ",
                      )}
                    >
                      <span
                        className={[
                          "flex h-9 w-9 items-center justify-center rounded-xl",
                          form.all_branches
                            ? "bg-white/10"
                            : "bg-white ring-1 ring-black/[0.07]",
                        ].join(
                          " ",
                        )}
                      >
                        <Globe2
                          size={
                            14
                          }
                        />
                      </span>

                      <span className="flex-1 text-xs font-extrabold">
                        {
                          t.allOutlet
                        }
                      </span>

                      {form.all_branches && (
                        <Check
                          size={
                            14
                          }
                        />
                      )}
                    </button>

                    {branches.length >
                      0 && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {branches.map(
                          (
                            branch,
                          ) => {
                            const checked =
                              form.branch_ids.includes(
                                branch.id,
                              );

                            return (
                              <button
                                type="button"
                                key={
                                  branch.id
                                }
                                disabled={
                                  form.all_branches
                                }
                                onClick={() =>
                                  toggleBranch(
                                    branch.id,
                                  )
                                }
                                className={[
                                  "flex items-center gap-3 rounded-[14px] border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-35",
                                  checked
                                    ? "border-black bg-[#f0f0eb]"
                                    : "border-black/[0.07] bg-white",
                                ].join(
                                  " ",
                                )}
                              >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f3f3ef] text-black/40">
                                  <MapPin
                                    size={
                                      13
                                    }
                                  />
                                </span>

                                <span className="min-w-0 flex-1 truncate text-[11px] font-extrabold">
                                  {
                                    branch.name
                                  }
                                </span>

                                {checked && (
                                  <Check
                                    size={
                                      13
                                    }
                                  />
                                )}
                              </button>
                            );
                          },
                        )}
                      </div>
                    )}
                  </EditorSection>

                  {/* BENEFIT */}
                  <EditorSection
                    icon={
                      Percent
                    }
                    title={
                      t.benefit
                    }
                    description={
                      t.benefitDesc
                    }
                    dark
                  >
                    <div className="grid gap-4 sm:grid-cols-3">
                      <label className="block">
                        <span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.13em] text-white/35">
                          {
                            t.discountType
                          }
                        </span>

                        <span className="relative block">
                          <select
                            value={
                              form.discountType
                            }
                            onChange={(
                              event,
                            ) =>
                              setForm(
                                (
                                  current,
                                ) => ({
                                  ...current,
                                  discountType:
                                    event.target.value as
                                      | "percentage"
                                      | "fixed",
                                  discount_rate:
                                    "",
                                  discount_price:
                                    "",
                                }),
                              )
                            }
                            className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-white/10 px-3 pr-9 text-xs font-extrabold text-white outline-none"
                          >
                            <option
                              className="text-black"
                              value="percentage"
                            >
                              {
                                t.percentage
                              }
                            </option>

                            <option
                              className="text-black"
                              value="fixed"
                            >
                              {
                                t.fixed
                              }
                            </option>
                          </select>

                          <ChevronDown
                            size={
                              14
                            }
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/35"
                          />
                        </span>
                      </label>

                      {form.discountType ===
                      "percentage" ? (
                        <>
                          <DarkField
                            label={
                              t.discountRate
                            }
                            type="number"
                            value={
                              form.discount_rate
                            }
                            onChange={(
                              value,
                            ) =>
                              setForm(
                                (
                                  current,
                                ) => ({
                                  ...current,
                                  discount_rate:
                                    value,
                                }),
                              )
                            }
                          />

                          <DarkField
                            label={
                              t.maxDiscount
                            }
                            type="number"
                            value={
                              form.discount_price
                            }
                            onChange={(
                              value,
                            ) =>
                              setForm(
                                (
                                  current,
                                ) => ({
                                  ...current,
                                  discount_price:
                                    value,
                                }),
                              )
                            }
                          />
                        </>
                      ) : (
                        <div className="sm:col-span-2">
                          <DarkField
                            label={
                              t.fixedDiscount
                            }
                            type="number"
                            value={
                              form.discount_price
                            }
                            onChange={(
                              value,
                            ) =>
                              setForm(
                                (
                                  current,
                                ) => ({
                                  ...current,
                                  discount_price:
                                    value,
                                }),
                              )
                            }
                          />
                        </div>
                      )}
                    </div>
                  </EditorSection>

                  {/* TIMING */}
                  <EditorSection
                    icon={
                      CalendarDays
                    }
                    title={
                      t.timing
                    }
                    description={
                      t.timingDesc
                    }
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label={
                          form.is_claimable
                            ? t.claimStart
                            : t.startDate
                        }
                        type="datetime-local"
                        value={
                          form.start_date
                        }
                        onChange={(
                          value,
                        ) =>
                          setForm(
                            (
                              current,
                            ) => ({
                              ...current,
                              start_date:
                                value,
                            }),
                          )
                        }
                      />

                      <Field
                        label={
                          form.is_claimable
                            ? t.claimEnd
                            : t.endDate
                        }
                        type="datetime-local"
                        value={
                          form.expired_date
                        }
                        onChange={(
                          value,
                        ) =>
                          setForm(
                            (
                              current,
                            ) => ({
                              ...current,
                              expired_date:
                                value,
                            }),
                          )
                        }
                      />
                    </div>
                  </EditorSection>

                  {/* TARGETING */}
                  <EditorSection
                    icon={
                      Users
                    }
                    title={
                      t.targeting
                    }
                    description={
                      t.targetingDesc
                    }
                  >
                    <ToggleRow
                      icon={
                        Ticket
                      }
                      title={
                        t.voucherTargeted
                      }
                      description={
                        t.voucherTargetedDesc
                      }
                      checked={
                        form.is_claimable
                      }
                      onChange={(
                        checked,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            is_claimable:
                              checked,
                            is_auto_apply:
                              checked
                                ? false
                                : current.is_auto_apply,
                            is_member_only:
                              checked
                                ? true
                                : current.is_member_only,
                          }),
                        )
                      }
                    />

                    <AnimatePresence
                      initial={
                        false
                      }
                    >
                      {form.is_claimable && (
                        <motion.div
                          initial={{
                            height:
                              0,
                            opacity:
                              0,
                          }}
                          animate={{
                            height:
                              "auto",
                            opacity:
                              1,
                          }}
                          exit={{
                            height:
                              0,
                            opacity:
                              0,
                          }}
                          className="overflow-hidden"
                        >
                          <div className="grid gap-4 rounded-[16px] bg-[#f4f4f0] p-4 sm:grid-cols-2">
                            <Field
                              label={
                                t.bulkCount
                              }
                              type="number"
                              disabled={
                                formMode ===
                                "edit"
                              }
                              value={
                                String(
                                  form.bulk_count,
                                )
                              }
                              onChange={(
                                value,
                              ) =>
                                setForm(
                                  (
                                    current,
                                  ) => ({
                                    ...current,
                                    bulk_count:
                                      Number(
                                        value,
                                      ) ||
                                      1,
                                  }),
                                )
                              }
                            />

                            <Field
                              label={
                                t.validDays
                              }
                              type="number"
                              value={
                                String(
                                  form.valid_days_after_claim,
                                )
                              }
                              onChange={(
                                value,
                              ) =>
                                setForm(
                                  (
                                    current,
                                  ) => ({
                                    ...current,
                                    valid_days_after_claim:
                                      Number(
                                        value,
                                      ) ||
                                      0,
                                  }),
                                )
                              }
                            />

                            <p className="sm:col-span-2 -mt-2 text-[9px] leading-4 text-black/30">
                              {
                                t.bulkHint
                              }
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div
                      className={[
                        "grid gap-3 sm:grid-cols-2",
                        form.is_claimable
                          ? "opacity-45"
                          : "",
                      ].join(
                        " ",
                      )}
                    >
                      <ToggleRow
                        icon={
                          ShieldCheck
                        }
                        title={
                          t.memberOnly
                        }
                        description={
                          t.memberOnlyDesc
                        }
                        checked={
                          form.is_member_only ||
                          form.is_claimable
                        }
                        disabled={
                          form.is_claimable
                        }
                        onChange={(
                          checked,
                        ) =>
                          setForm(
                            (
                              current,
                            ) => ({
                              ...current,
                              is_member_only:
                                checked,
                            }),
                          )
                        }
                      />

                      <ToggleRow
                        icon={
                          Zap
                        }
                        title={
                          t.autoApplyTitle
                        }
                        description={
                          t.autoApplyDesc
                        }
                        checked={
                          form.is_auto_apply &&
                          !form.is_claimable
                        }
                        disabled={
                          form.is_claimable
                        }
                        onChange={(
                          checked,
                        ) =>
                          setForm(
                            (
                              current,
                            ) => ({
                              ...current,
                              is_auto_apply:
                                checked,
                            }),
                          )
                        }
                      />
                    </div>
                  </EditorSection>

                  {/* LIMITS */}
                  {!form.is_claimable && (
                    <EditorSection
                      icon={
                        ShieldCheck
                      }
                      title={
                        t.usage
                      }
                      description={
                        t.usageDesc
                      }
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                          label={
                            t.globalQuota
                          }
                          type="number"
                          value={
                            String(
                              form.max_use,
                            )
                          }
                          onChange={(
                            value,
                          ) =>
                            setForm(
                              (
                                current,
                              ) => ({
                                ...current,
                                max_use:
                                  Number(
                                    value,
                                  ) ||
                                  0,
                              }),
                            )
                          }
                        />

                        <Field
                          label={
                            t.lifetimeLimit
                          }
                          type="number"
                          value={
                            String(
                              form.max_use_per_user,
                            )
                          }
                          onChange={(
                            value,
                          ) =>
                            setForm(
                              (
                                current,
                              ) => ({
                                ...current,
                                max_use_per_user:
                                  Number(
                                    value,
                                  ) ||
                                  0,
                              }),
                            )
                          }
                        />

                        <Field
                          label={
                            t.dailyLimit
                          }
                          type="number"
                          value={
                            String(
                              form.daily_user_limit,
                            )
                          }
                          onChange={(
                            value,
                          ) =>
                            setForm(
                              (
                                current,
                              ) => ({
                                ...current,
                                daily_user_limit:
                                  Number(
                                    value,
                                  ) ||
                                  0,
                              }),
                            )
                          }
                        />

                        <Field
                          label={
                            t.monthlyLimit
                          }
                          type="number"
                          value={
                            String(
                              form.monthly_user_limit,
                            )
                          }
                          onChange={(
                            value,
                          ) =>
                            setForm(
                              (
                                current,
                              ) => ({
                                ...current,
                                monthly_user_limit:
                                  Number(
                                    value,
                                  ) ||
                                  0,
                              }),
                            )
                          }
                        />

                        <Field
                          label={
                            t.yearlyLimit
                          }
                          type="number"
                          value={
                            String(
                              form.yearly_user_limit,
                            )
                          }
                          onChange={(
                            value,
                          ) =>
                            setForm(
                              (
                                current,
                              ) => ({
                                ...current,
                                yearly_user_limit:
                                  Number(
                                    value,
                                  ) ||
                                  0,
                              }),
                            )
                          }
                        />
                      </div>
                    </EditorSection>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 justify-end gap-2 border-t border-black/[0.08] bg-white p-4 sm:px-6">
                <button
                  type="button"
                  onClick={
                    closeEditor
                  }
                  disabled={
                    isSubmitting
                  }
                  className="h-11 rounded-xl px-4 text-xs font-extrabold text-black/40 disabled:opacity-40"
                >
                  {
                    t.cancel
                  }
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void savePromo()
                  }
                  disabled={
                    isSubmitting
                  }
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-black px-5 text-xs font-extrabold text-white transition hover:bg-[#262626] disabled:opacity-40"
                >
                  {isSubmitting && (
                    <Loader2
                      size={
                        14
                      }
                      className="animate-spin"
                    />
                  )}

                  {isSubmitting
                    ? t.saving
                    : formMode ===
                        "edit"
                      ? t.update
                      : t.save}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRM */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.button
              type="button"
              initial={{
                opacity:
                  0,
              }}
              animate={{
                opacity:
                  1,
              }}
              exit={{
                opacity:
                  0,
              }}
              onClick={() =>
                !isSubmitting &&
                setDeleteConfirm(
                  null,
                )
              }
              className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-[2px]"
            />

            <motion.div
              initial={{
                opacity:
                  0,
                scale:
                  0.96,
                y:
                  10,
              }}
              animate={{
                opacity:
                  1,
                scale:
                  1,
                y:
                  0,
              }}
              exit={{
                opacity:
                  0,
                scale:
                  0.97,
                y:
                  6,
              }}
              className="fixed left-1/2 top-1/2 z-[100] w-[calc(100%-32px)] max-w-[430px] -translate-x-1/2 -translate-y-1/2 rounded-[24px] bg-white p-5 shadow-2xl"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <Trash2
                  size={
                    17
                  }
                />
              </span>

              <h3 className="mt-4 text-xl font-semibold tracking-[-0.035em]">
                {
                  t.deleteTitle
                }
              </h3>

              <p className="mt-2 text-xs leading-5 text-black/40">
                <strong className="text-black">
                  {
                    deleteConfirm.title
                  }
                </strong>
                .{" "}
                {
                  t.deleteDesc
                }
              </p>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={
                    isSubmitting
                  }
                  onClick={() =>
                    setDeleteConfirm(
                      null,
                    )
                  }
                  className="h-10 rounded-xl px-4 text-xs font-extrabold text-black/40"
                >
                  {
                    t.cancel
                  }
                </button>

                <button
                  type="button"
                  disabled={
                    isSubmitting
                  }
                  onClick={() =>
                    void removePromo()
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-extrabold text-white disabled:opacity-40"
                >
                  {isSubmitting && (
                    <Loader2
                      size={
                        13
                      }
                      className="animate-spin"
                    />
                  )}

                  {
                    t.confirmDelete
                  }
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .kaloo-promo-quill .ql-toolbar.ql-snow {
          border: 0;
          border-bottom: 1px solid rgba(0, 0, 0, 0.07);
          background: #ffffff;
          padding: 10px 12px;
        }

        .kaloo-promo-quill .ql-container.ql-snow {
          border: 0;
          background: #fafaf8;
          font-family: inherit;
          font-size: 13px;
        }

        .kaloo-promo-quill .ql-editor {
          min-height: 160px;
          padding: 14px 16px;
          line-height: 1.65;
          color: #111111;
        }

        .kaloo-promo-quill .ql-editor.ql-blank::before {
          left: 16px;
          color: rgba(0, 0, 0, 0.28);
          font-style: normal;
        }

        .kaloo-promo-quill .ql-snow .ql-stroke {
          stroke: rgba(0, 0, 0, 0.55);
        }

        .kaloo-promo-quill .ql-snow .ql-fill {
          fill: rgba(0, 0, 0, 0.55);
        }

        .kaloo-promo-quill .ql-snow .ql-picker {
          color: rgba(0, 0, 0, 0.55);
        }

        .kaloo-promo-quill .ql-toolbar button:hover .ql-stroke,
        .kaloo-promo-quill .ql-toolbar button.ql-active .ql-stroke {
          stroke: #111111;
        }

        .kaloo-promo-quill .ql-toolbar button:hover .ql-fill,
        .kaloo-promo-quill .ql-toolbar button.ql-active .ql-fill {
          fill: #111111;
        }
      `}</style>
    </div>
  );
}

function Metric({
  icon:
    Icon,
  label,
  value,
  dark = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  dark?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-[22px] border p-5",
        dark
          ? "border-black bg-black text-white"
          : "border-black/[0.08] bg-white text-black",
      ].join(
        " ",
      )}
    >
      <div
        className={[
          "flex h-9 w-9 items-center justify-center rounded-xl",
          dark
            ? "bg-white/10 text-white/65"
            : "bg-[#f3f3ef] text-black/40",
        ].join(
          " ",
        )}
      >
        <Icon
          size={
            15
          }
        />
      </div>

      <p
        className={[
          "mt-6 text-[9px] font-extrabold uppercase tracking-[0.14em]",
          dark
            ? "text-white/35"
            : "text-black/30",
        ].join(
          " ",
        )}
      >
        {
          label
        }
      </p>

      <p className="mt-1 text-2xl font-semibold tracking-[-0.04em]">
        {
          value
        }
      </p>
    </div>
  );
}

function BranchFilterButton({
  active,
  label,
  onClick,
  global = false,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  global?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={[
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-[9px] font-extrabold uppercase tracking-[0.08em] transition",
        active
          ? "border-black bg-black text-white"
          : "border-black/[0.08] bg-white text-black/35 hover:text-black",
      ].join(
        " ",
      )}
    >
      {global ? (
        <Globe2
          size={
            11
          }
        />
      ) : (
        <MapPin
          size={
            11
          }
        />
      )}

      {
        label
      }
    </button>
  );
}

function CampaignCard({
  promo,
  branches,
  locale,
  index,
  onEdit,
  onDelete,
}: {
  promo: CouponData;
  branches: Branch[];
  locale: Locale;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t =
    copy[locale];

  const state =
    campaignState(
      promo,
    );

  const percentage =
    Boolean(
      promo.discount_rate &&
      promo.discount_rate >
        0,
    );

  const branchNames =
    branches
      .filter(
        (
          branch,
        ) =>
          promo.branch_ids.includes(
            branch.id,
          ),
      )
      .map(
        (
          branch,
        ) =>
          branch.name,
      );

  const hasUserLimit =
    promo.max_use_per_user >
      0 ||
    promo.daily_user_limit >
      0 ||
    promo.monthly_user_limit >
      0 ||
    promo.yearly_user_limit >
      0;

  const benefit =
    percentage
      ? `${promo.discount_rate}%`
      : formatCurrency(
          promo.discount_price,
          locale,
        );

  const startLabel =
    formatDateTime(
      promo.start_date,
      locale,
    );

  const endLabel =
    formatDateTime(
      promo.expired_date,
      locale,
    );

  return (
    <motion.article
      initial={{
        opacity:
          0,
        y:
          6,
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
              0.025,
            0.15,
          ),
      }}
      className={[
        "overflow-hidden rounded-[26px] border bg-white transition",
        state === "ended"
          ? "border-red-200 ring-1 ring-red-100"
          : state === "claimed"
            ? "border-violet-200 ring-1 ring-violet-100"
            : "border-black/[0.08]",
      ].join(
        " ",
      )}
    >
      {(state === "ended" ||
        state === "claimed") && (
        <div
          className={[
            "flex items-center justify-between gap-3 border-b px-4 py-2.5 sm:px-5",
            state === "ended"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-violet-200 bg-violet-50 text-violet-700",
          ].join(
            " ",
          )}
        >
          <div className="flex items-center gap-2">
            {state === "ended" ? (
              <AlertCircle
                size={
                  13
                }
              />
            ) : (
              <Check
                size={
                  13
                }
              />
            )}

            <span className="text-[9px] font-extrabold uppercase tracking-[0.14em]">
              {state === "ended"
                ? t.expiredStrong
                : t.claimedStrong}
            </span>
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  promo.coupon_code,
                );

                Toast.fire({
                  icon:
                    "success",
                  title:
                    t.codeCopied,
                });
              } catch {
                // Main promo-code button below remains available.
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/55 px-2.5 py-1 font-mono text-[8px] font-extrabold tracking-[0.08em] opacity-70 transition hover:opacity-100"
            aria-label={
              t.copyCode
            }
          >
            <Copy
              size={
                9
              }
            />

            {
              promo.coupon_code
            }
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-[180px_minmax(0,1fr)]">
        <div
          className={[
            "relative flex min-h-[180px] flex-col justify-between p-5 text-white md:min-h-[260px]",
            state === "ended"
              ? "bg-[#241313]"
              : state === "claimed"
                ? "bg-[#21182d]"
                : "bg-[#111111]",
          ].join(
            " ",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <StateBadge
              state={
                state
              }
              locale={
                locale
              }
              dark
            />

            {promo.campaign_group_id && (
              <span className="rounded-full bg-white/10 px-2 py-1 font-mono text-[8px] font-bold tracking-[0.08em] text-white/40">
                #
                {
                  promo.campaign_group_id.slice(
                    -6,
                  )
                }
              </span>
            )}
          </div>

          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-white/30">
              {
                percentage
                  ? t.percentage
                  : t.fixed
              }
            </p>

            <p className="mt-2 break-words text-3xl font-semibold tracking-[-0.05em]">
              {
                benefit
              }
            </p>

            {percentage && (
              <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.15em] text-white/35">
                {
                  t.off
                }
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  promo.coupon_code,
                );

                Toast.fire({
                  icon:
                    "success",
                  title:
                    t.codeCopied,
                });
              } catch {
                Toast.fire({
                  icon:
                    "error",
                  title:
                    locale === "id"
                      ? "Gagal menyalin kode promo"
                      : "Failed to copy promo code",
                });
              }
            }}
            className="group/code w-full rounded-[16px] border border-white/10 bg-white/[0.06] p-3 text-left transition hover:border-white/20 hover:bg-white/[0.09]"
            aria-label={
              t.copyCode
            }
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-white/25">
                {
                  t.couponCode
                }
              </span>

              <span className="inline-flex items-center gap-1 text-[8px] font-extrabold uppercase tracking-[0.1em] text-white/35 transition group-hover/code:text-white/70">
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

            <span className="mt-2 block break-all font-mono text-lg font-extrabold tracking-[0.08em] text-white sm:text-xl">
              {
                promo.coupon_code
              }
            </span>
          </button>
        </div>

        <div className="flex min-w-0 flex-col p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="truncate text-xl font-semibold tracking-[-0.035em]">
                {
                  promo.title ||
                  promo.coupon_code
                }
              </h3>

              <div className="mt-3 flex flex-wrap gap-2">
                <ScopeBadge
                  names={
                    branchNames
                  }
                  locale={
                    locale
                  }
                />

                {(promo.is_member_only ||
                  hasUserLimit) &&
                  !promo.is_claimable && (
                    <SmallBadge
                      icon={
                        ShieldCheck
                      }
                      label={
                        t.member
                      }
                    />
                  )}

                {promo.is_auto_apply && (
                  <SmallBadge
                    icon={
                      Zap
                    }
                    label={
                      t.autoApply
                    }
                  />
                )}

                {promo.is_claimable && (
                  <SmallBadge
                    icon={
                      Ticket
                    }
                    label={
                      t.targeted
                    }
                  />
                )}
              </div>
            </div>

            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={
                  onEdit
                }
                className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.07] text-black/35 transition hover:border-black/20 hover:text-black"
                aria-label={
                  t.edit
                }
              >
                <Edit3
                  size={
                    13
                  }
                />
              </button>

              <button
                type="button"
                onClick={
                  onDelete
                }
                className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.07] text-black/35 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                aria-label={
                  t.delete
                }
              >
                <Trash2
                  size={
                    13
                  }
                />
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {promo.is_claimable ? (
              <InfoCell
                icon={
                  Clock3
                }
                label={
                  t.validDays
                }
                value={`${promo.valid_days_after_claim} ${t.days}`}
              />
            ) : (
              <InfoCell
                icon={
                  Users
                }
                label={
                  t.used
                }
                value={
                  promo.max_use >
                  0
                    ? `${promo.already_used} / ${promo.max_use}`
                    : `${promo.already_used} · ${t.unlimited}`
                }
              />
            )}

            <InfoCell
              icon={
                MapPin
              }
              label={
                t.outletScope
              }
              value={
                branchNames.length
                  ? branchNames.join(
                      ", ",
                    )
                  : t.allOutlet
              }
            />
          </div>

          <div className="mt-auto pt-5">
            <div className="flex flex-col gap-2 border-t border-black/[0.06] pt-4 text-[10px] text-black/35">
              <div className="flex items-center gap-2">
                <CalendarDays
                  size={
                    12
                  }
                  className="shrink-0"
                />

                <span className="font-bold text-black/45">
                  {
                    t.starts
                  }:
                </span>

                <span>
                  {
                    startLabel ||
                    t.now
                  }
                </span>
              </div>

              <div className="flex items-center gap-2">
                <CalendarDays
                  size={
                    12
                  }
                  className="shrink-0"
                />

                <span className="font-bold text-black/45">
                  {
                    t.expires
                  }:
                </span>

                <span>
                  {
                    endLabel ||
                    t.unlimited
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function StateBadge({
  state,
  locale,
  dark = false,
}: {
  state:
    | "active"
    | "scheduled"
    | "ended"
    | "claimable"
    | "claimed";
  locale:
    Locale;
  dark?: boolean;
}) {
  const t =
    copy[locale];

  const labels = {
    active:
      t.active,
    scheduled:
      t.scheduled,
    ended:
      t.ended,
    claimable:
      t.unclaimed,
    claimed:
      t.claimed,
  };

  const lightClass =
    state ===
    "active"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
      : state ===
        "scheduled"
        ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
        : state ===
          "claimable"
          ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
          : state ===
            "claimed"
            ? "bg-violet-100 text-violet-800 ring-1 ring-violet-200"
            : "bg-red-100 text-red-700 ring-1 ring-red-200";

  return (
    <span
      className={[
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[0.09em]",
        dark
          ? state === "ended"
            ? "bg-red-500/20 text-red-200 ring-1 ring-red-400/20"
            : state === "claimed"
              ? "bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/20"
              : "bg-white/10 text-white/60"
          : lightClass,
      ].join(
        " ",
      )}
    >
      {state ===
        "active" && (
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      )}

      {
        labels[
          state
        ]
      }
    </span>
  );
}

function ScopeBadge({
  names,
  locale,
}: {
  names:
    string[];
  locale:
    Locale;
}) {
  const t =
    copy[locale];

  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#f3f3ef] px-2.5 py-1 text-[9px] font-extrabold text-black/45">
      {names.length ? (
        <MapPin
          size={
            10
          }
        />
      ) : (
        <Globe2
          size={
            10
          }
        />
      )}

      <span className="truncate">
        {names.length
          ? names.join(
              ", ",
            )
          : t.allOutlet}
      </span>
    </span>
  );
}

function SmallBadge({
  icon:
    Icon,
  label,
}: {
  icon: LucideIcon;
  label:
    string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.07] px-2.5 py-1 text-[9px] font-extrabold text-black/40">
      <Icon
        size={
          10
        }
      />

      {
        label
      }
    </span>
  );
}

function InfoCell({
  icon:
    Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label:
    string;
  value:
    string;
}) {
  return (
    <div className="rounded-[15px] bg-[#f6f6f2] p-3">
      <div className="flex items-center gap-1.5 text-[8px] font-extrabold uppercase tracking-[0.1em] text-black/25">
        <Icon
          size={
            10
          }
        />

        {
          label
        }
      </div>

      <p className="mt-1 truncate text-[10px] font-extrabold text-black/55">
        {
          value
        }
      </p>
    </div>
  );
}

function EditorSection({
  icon:
    Icon,
  title,
  description,
  children,
  dark = false,
}: {
  icon: LucideIcon;
  title:
    string;
  description:
    string;
  children:
    React.ReactNode;
  dark?: boolean;
}) {
  return (
    <section
      className={[
        "rounded-[22px] border p-5",
        dark
          ? "border-black bg-black text-white"
          : "border-black/[0.08] bg-white text-black",
      ].join(
        " ",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            dark
              ? "bg-white/10 text-white/60"
              : "bg-[#f3f3ef] text-black/40",
          ].join(
            " ",
          )}
        >
          <Icon
            size={
              14
            }
          />
        </span>

        <div>
          <p className="text-xs font-extrabold">
            {
              title
            }
          </p>

          <p
            className={[
              "mt-1 text-[10px] leading-4",
              dark
                ? "text-white/30"
                : "text-black/30",
            ].join(
              " ",
            )}
          >
            {
              description
            }
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {
          children
        }
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  uppercase = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange:
    (
      value:
        string,
    ) => void;
  placeholder?: string;
  type?:
    | "text"
    | "number"
    | "datetime-local";
  uppercase?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-black/30">
        {
          label
        }
      </span>

      <input
        type={
          type
        }
        value={
          value
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        placeholder={
          placeholder
        }
        disabled={
          disabled
        }
        className={[
          "h-11 w-full rounded-xl border border-black/[0.08] bg-[#fafaf8] px-3 text-xs font-semibold outline-none transition placeholder:text-black/20 focus:border-black/20 disabled:cursor-not-allowed disabled:bg-black/[0.03] disabled:text-black/30",
          uppercase
            ? "font-mono uppercase tracking-[0.08em]"
            : "",
        ].join(
          " ",
        )}
      />
    </label>
  );
}

function DarkField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label:
    string;
  value:
    string;
  onChange:
    (
      value:
        string,
    ) => void;
  type?:
    | "text"
    | "number";
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.13em] text-white/35">
        {
          label
        }
      </span>

      <input
        type={
          type
        }
        value={
          value
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        className="h-11 w-full rounded-xl border border-white/10 bg-white/10 px-3 text-xs font-extrabold text-white outline-none placeholder:text-white/20 focus:border-white/25"
      />
    </label>
  );
}

function ToggleRow({
  icon:
    Icon,
  title,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  icon: LucideIcon;
  title:
    string;
  description:
    string;
  checked:
    boolean;
  onChange:
    (
      value:
        boolean,
    ) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={
        disabled
      }
      onClick={() =>
        !disabled &&
        onChange(
          !checked,
        )
      }
      className={[
        "flex w-full items-center gap-3 rounded-[16px] border p-3 text-left transition disabled:cursor-not-allowed",
        checked
          ? "border-black bg-[#f0f0eb]"
          : "border-black/[0.07] bg-white",
        disabled
          ? "opacity-45"
          : "",
      ].join(
        " ",
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-black/40 ring-1 ring-black/[0.06]">
        <Icon
          size={
            14
          }
        />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-extrabold">
          {
            title
          }
        </span>

        <span className="mt-0.5 block text-[9px] leading-4 text-black/30">
          {
            description
          }
        </span>
      </span>

      <span
        className={[
          "relative h-6 w-11 shrink-0 rounded-full transition",
          checked
            ? "bg-black"
            : "bg-black/15",
        ].join(
          " ",
        )}
      >
        <span
          className={[
            "absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition",
            checked
              ? "left-6"
              : "left-1",
          ].join(
            " ",
          )}
        />
      </span>
    </button>
  );
}
