"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  Banknote,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Eye,
  EyeOff,
  HelpCircle,
  Landmark,
  Loader2,
  Package,
  Plus,
  ReceiptText,
  QrCode,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  UserRound,
  Utensils,
  Wallet,
  Wifi,
} from "lucide-react";

import {
  useParams,
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

type Workspace =
  | "global"
  | "outlet";

type GlobalSection =
  | "overview"
  | "business"
  | "finance"
  | "bank"
  | "faq"
  | "payout"
  | "account";

type Branch = {
  id: number;
  name: string;
  branch_slug?: string | null;
};

type Facility = {
  icon: string;
  name: string;
  description: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

type GlobalForm = {
  cafeName: string;
  mitraAddress: string;
  mitraWelcome: string;

  bankName: string;
  bankNumber: string;
  bankOwner: string;

  taxRate: string;
  serviceRate: string;
  platformFeeRate: string;
  isTaxIncluded: 0 | 1 | null;

  faq: FaqItem[];
};

type OutletForm = {
  wifiSSID: string;
  wifiPassword: string;
  facilities: Facility[];
};

type OwnerProfile = {
  name: string;
  email: string;
  role: string;
};

type PayoutPeriod = {
  gross?: number;
  net?: number;
  ordersCount?: number;
  totalOrders?: number;
};

type Withdrawal = {
  id: number | string;
  amount: number | string;
  status?: string | null;
  createdAt?: string | null;
};

type PayoutData = {
  totalEligibleQris?: number;
  totalTax?: number;
  totalPlatformFee?: number;
  totalCash?: number;
  totalLockedQris?: number;
  canWithdraw?: boolean;
  withdrawalMessage?: string;
  breakdown?: {
    today?: PayoutPeriod;
    week?: PayoutPeriod;
    month?: PayoutPeriod;
    year?: PayoutPeriod;
  };
  withdrawals?: Withdrawal[];
};

type PayoutDetailAddon = {
  id?: number;
  name: string;
  price: number;
  customerNote?: string;
};

type PayoutDetailItem = {
  id: number;
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  addons: PayoutDetailAddon[];
};

type PayoutDetailCalculation = {
  subtotal: number;
  discount: number;
  service: number;
  tax: number;
  gross: number;
  platformFeeRate: number;
  platformFee: number;
  netPayout: number;
};

type PayoutState =
  | "eligible"
  | "pending"
  | "approved"
  | "rejected"
  | "cashouted";

type PayoutDetailOrder = {
  id: number;
  orderCode: string;
  branchId: number | null;
  branchName: string;
  customerName: string;
  createdAt?: string | Date | null;
  paidAt?: string | Date | null;
  transactionId?: string | null;
  issuer?: string | null;

  isCashouted: boolean;
  payoutState: PayoutState;

  cashout: {
    id: number | null;
    status: string | null;
    amount: number | null;
    timeCashout?: string | Date | null;
    createdAt?: string | Date | null;
    updatedAt?: string | Date | null;
  };

  calculation: PayoutDetailCalculation;
  itemLineCount: number;
  itemQuantity: number;
  items: PayoutDetailItem[];
};

type PayoutCashoutBatch = {
  id: number;
  status: string | null;
  amount: number | null;
  timeCashout?: string | Date | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  orderCount: number;
  orderCodes: string[];
  calculatedNetOrders: number;
};

type PayoutDetailData = {
  generatedAt: string;

  summary: {
    orderCount: number;
    itemLineCount: number;
    itemQuantity: number;
    subtotal: number;
    discount: number;
    service: number;
    tax: number;
    gross: number;
    platformFee: number;
    netPayout: number;
  };

  statusSummary: Record<PayoutState, number>;

  cashoutBatches: PayoutCashoutBatch[];

  orders: PayoutDetailOrder[];
};

const EMPTY_GLOBAL: GlobalForm = {
  cafeName: "",
  mitraAddress: "",
  mitraWelcome: "",
  bankName: "",
  bankNumber: "",
  bankOwner: "",
  taxRate: "",
  serviceRate: "",
  platformFeeRate: "",
  isTaxIncluded: null,
  faq: [],
};

const EMPTY_OUTLET: OutletForm = {
  wifiSSID: "",
  wifiPassword: "",
  facilities: [],
};

const BANK_OPTIONS = [
  "BCA",
  "Bank Mandiri",
  "BRI",
  "BNI",
  "BSI",
  "BTN",
  "CIMB Niaga",
  "OCBC",
  "PermataBank",
  "Bank Danamon",
  "Maybank Indonesia",
  "PaninBank",
  "Bank Mega",
  "Bank Sinarmas",
  "Bank Bukopin",
  "Bank BTPN",
  "Jenius",
  "Bank Jago",
  "SeaBank Indonesia",
  "Bank Neo Commerce",
  "Allo Bank",
  "Bank Aladin Syariah",
  "Bank Muamalat Indonesia",
  "Bank Mega Syariah",
  "BCA Syariah",
  "Bank Victoria Syariah",
  "Bank Commonwealth",
  "Bank Capital Indonesia",
  "Bank INA Perdana",
  "Bank Maspion",
  "Bank Mayapada",
  "Bank Ganesha",
  "Bank Woori Saudara",
  "Bank SBI Indonesia",
  "Bank UOB Indonesia",
  "Bank HSBC Indonesia",
  "Standard Chartered Bank Indonesia",
  "Bank of China Indonesia",
  "Citibank Indonesia",
  "DBS Indonesia",
] as const;

const FACILITY_ICONS = [
  "Wifi",
  "Wind",
  "Droplet",
  "Plug",
  "MapPin",
  "Coffee",
  "Music",
  "Car",
  "Tv",
  "Users",
];

const copy = {
  id: {
    eyebrow:
      "Management / System",

    title:
      "Konfigurasi",

    subtitle:
      "Pengaturan global dan pengaturan outlet dipisahkan agar tidak ada konfigurasi yang tertukar.",

    globalWorkspace:
      "Global Configuration",

    globalWorkspaceDesc:
      "Berlaku untuk seluruh bisnis dan semua outlet.",

    outletWorkspace:
      "Outlet Configuration",

    outletWorkspaceDesc:
      "Hanya WiFi dan fasilitas yang berbeda per outlet.",

    globalBadge:
      "GLOBAL",

    outletBadge:
      "PER OUTLET",

    overview:
      "Ringkasan",

    business:
      "Profil Bisnis",

    finance:
      "Pajak & Biaya",

    bank:
      "Rekening",

    faq:
      "FAQ",

    payout:
      "Pencairan",

    account:
      "Akun Owner",

    saveGlobal:
      "Simpan Global",

    saveOutlet:
      "Simpan Outlet",

    saving:
      "Menyimpan...",

    savedGlobal:
      "Konfigurasi global berhasil disimpan.",

    savedOutlet:
      "Konfigurasi outlet berhasil disimpan.",

    refresh:
      "Perbarui",

    chooseOutlet:
      "Pilih outlet yang ingin dikonfigurasi",

    mainOutlet:
      "Pusat / Main",

    outletNoticeTitle:
      "Hanya dua pengaturan di bawah yang bersifat per outlet",

    outletNotice:
      "Mengganti outlet di sini hanya akan mengganti WiFi dan fasilitas. Pajak, service, rekening, FAQ, dan profil bisnis tidak ikut berubah.",

    wifi:
      "WiFi",

    wifiDesc:
      "SSID dan password yang ditampilkan kepada customer di outlet ini.",

    facilities:
      "Fasilitas",

    facilitiesDesc:
      "Daftar fasilitas yang tersedia khusus di outlet ini.",

    ssid:
      "Nama WiFi / SSID",

    wifiPassword:
      "Password WiFi",

    show:
      "Tampilkan",

    hide:
      "Sembunyikan",

    addFacility:
      "Tambah fasilitas",

    facilityName:
      "Nama fasilitas",

    facilityIcon:
      "Icon",

    facilityDescription:
      "Deskripsi",

    noFacilities:
      "Belum ada fasilitas untuk outlet ini.",

    configurationHealth:
      "Kelengkapan konfigurasi global",

    globalRules:
      "Aturan global",

    globalRulesDesc:
      "Aturan ini sama untuk seluruh outlet dan tidak dipengaruhi selector outlet.",

    customerInfo:
      "Informasi customer",

    settlement:
      "Settlement",

    configured:
      "Terkonfigurasi",

    needsAttention:
      "Perlu dilengkapi",

    tax:
      "Pajak / PB1",

    service:
      "Service charge",

    platformFee:
      "Platform fee",

    platformFeeLocked:
      "Ditentukan platform. Owner tidak dapat mengubah nilai ini.",

    inclusive:
      "Harga sudah termasuk pajak & service",

    exclusive:
      "Pajak & service ditambahkan saat checkout",

    pricingMode:
      "Mode harga",

    preview:
      "Simulasi transaksi Rp100.000",

    menuBase:
      "Harga menu",

    serviceAmount:
      "Service",

    taxAmount:
      "Pajak",

    customerTotal:
      "Total customer",

    platformCut:
      "Platform fee",

    merchantNet:
      "Estimasi net mitra",

    businessName:
      "Nama bisnis",

    businessLocked:
      "Nama bisnis mengikuti data mitra dan tidak diubah dari halaman ini.",

    address:
      "Alamat bisnis",

    welcome:
      "Welcome message",

    bankName:
      "Nama bank",

    chooseBank:
      "Pilih bank",

    searchBank:
      "Cari bank...",

    bankNotFound:
      "Bank tidak ditemukan dalam daftar.",

    notConfigured:
      "Belum diatur",

    bankNumber:
      "Nomor rekening",

    bankOwner:
      "Pemilik rekening",

    bankDesc:
      "Rekening global yang digunakan untuk proses payout.",

    faqDesc:
      "FAQ berlaku sama di seluruh outlet.",

    addFaq:
      "Tambah FAQ",

    question:
      "Pertanyaan",

    answer:
      "Jawaban",

    noFaq:
      "Belum ada FAQ.",

    payoutReady:
      "QRIS siap cair",

    taxReturned:
      "Pajak untuk mitra",

    platformDeduction:
      "Fee platform",

    cashRecorded:
      "Tunai tercatat",

    qrisLocked:
      "QRIS tertahan",

    withdraw:
      "Tarik dana QRIS",

    withdrawalHistory:
      "Riwayat penarikan",

    noWithdrawals:
      "Belum ada riwayat penarikan.",

    today:
      "Hari ini",

    week:
      "Minggu ini",

    month:
      "Bulan ini",

    year:
      "Tahun ini",

    gross:
      "Gross",

    net:
      "Net",

    orders:
      "Order",

    withdrawConfirm:
      "Konfirmasi pencairan",

    withdrawConfirmDesc:
      "Dana akan diajukan ke rekening global yang terdaftar.",

    cancel:
      "Batal",

    confirmWithdraw:
      "Ya, tarik dana",

    ownerAccount:
      "Owner yang sedang login",

    ownerAccountDesc:
      "Informasi session Owner saat ini.",

    name:
      "Nama",

    email:
      "Email",

    role:
      "Role",

    loadError:
      "Gagal memuat konfigurasi.",

    saveError:
      "Gagal menyimpan konfigurasi.",

    payoutError:
      "Gagal memuat payout.",

    withdrawError:
      "Gagal memproses pencairan.",

    requiredFacility:
      "Nama fasilitas tidak boleh kosong.",

    requiredFaq:
      "Pertanyaan FAQ tidak boleh kosong.",
  },

  en: {
    eyebrow:
      "Management / System",

    title:
      "Configuration",

    subtitle:
      "Global and outlet settings are separated so configuration scope is always clear.",

    globalWorkspace:
      "Global Configuration",

    globalWorkspaceDesc:
      "Applies to the entire business and every outlet.",

    outletWorkspace:
      "Outlet Configuration",

    outletWorkspaceDesc:
      "Only WiFi and facilities are different per outlet.",

    globalBadge:
      "GLOBAL",

    outletBadge:
      "PER OUTLET",

    overview:
      "Overview",

    business:
      "Business Profile",

    finance:
      "Tax & Fees",

    bank:
      "Bank Account",

    faq:
      "FAQ",

    payout:
      "Payout",

    account:
      "Owner Account",

    saveGlobal:
      "Save Global",

    saveOutlet:
      "Save Outlet",

    saving:
      "Saving...",

    savedGlobal:
      "Global configuration saved.",

    savedOutlet:
      "Outlet configuration saved.",

    refresh:
      "Refresh",

    chooseOutlet:
      "Choose the outlet to configure",

    mainOutlet:
      "Main outlet",

    outletNoticeTitle:
      "Only the two settings below are outlet-specific",

    outletNotice:
      "Changing the outlet here only changes WiFi and facilities. Tax, service, bank account, FAQ, and business profile remain unchanged.",

    wifi:
      "WiFi",

    wifiDesc:
      "SSID and password shown to customers at this outlet.",

    facilities:
      "Facilities",

    facilitiesDesc:
      "Facilities available specifically at this outlet.",

    ssid:
      "WiFi name / SSID",

    wifiPassword:
      "WiFi password",

    show:
      "Show",

    hide:
      "Hide",

    addFacility:
      "Add facility",

    facilityName:
      "Facility name",

    facilityIcon:
      "Icon",

    facilityDescription:
      "Description",

    noFacilities:
      "No facilities configured for this outlet.",

    configurationHealth:
      "Global configuration completeness",

    globalRules:
      "Global rules",

    globalRulesDesc:
      "These rules apply to every outlet and are not affected by outlet selection.",

    customerInfo:
      "Customer information",

    settlement:
      "Settlement",

    configured:
      "Configured",

    needsAttention:
      "Needs attention",

    tax:
      "Tax / PB1",

    service:
      "Service charge",

    platformFee:
      "Platform fee",

    platformFeeLocked:
      "Defined by the platform. The merchant cannot edit this value.",

    inclusive:
      "Prices already include tax & service",

    exclusive:
      "Tax & service are added at checkout",

    pricingMode:
      "Pricing mode",

    preview:
      "Rp100,000 transaction simulation",

    menuBase:
      "Menu price",

    serviceAmount:
      "Service",

    taxAmount:
      "Tax",

    customerTotal:
      "Customer total",

    platformCut:
      "Platform fee",

    merchantNet:
      "Estimated merchant net",

    businessName:
      "Business name",

    businessLocked:
      "Business name follows merchant registration and is not changed here.",

    address:
      "Business address",

    welcome:
      "Welcome message",

    bankName:
      "Bank name",

    chooseBank:
      "Choose bank",

    searchBank:
      "Search bank...",

    bankNotFound:
      "Bank is not available in the list.",

    notConfigured:
      "Not configured",

    bankNumber:
      "Account number",

    bankOwner:
      "Account holder",

    bankDesc:
      "Global bank account used for payout.",

    faqDesc:
      "FAQ is shared across all outlets.",

    addFaq:
      "Add FAQ",

    question:
      "Question",

    answer:
      "Answer",

    noFaq:
      "No FAQ yet.",

    payoutReady:
      "QRIS ready for payout",

    taxReturned:
      "Tax for merchant",

    platformDeduction:
      "Platform fee",

    cashRecorded:
      "Recorded cash",

    qrisLocked:
      "Locked QRIS",

    withdraw:
      "Withdraw QRIS funds",

    withdrawalHistory:
      "Withdrawal history",

    noWithdrawals:
      "No withdrawals yet.",

    today:
      "Today",

    week:
      "This week",

    month:
      "This month",

    year:
      "This year",

    gross:
      "Gross",

    net:
      "Net",

    orders:
      "Orders",

    withdrawConfirm:
      "Confirm withdrawal",

    withdrawConfirmDesc:
      "Funds will be requested to the registered global bank account.",

    cancel:
      "Cancel",

    confirmWithdraw:
      "Yes, withdraw",

    ownerAccount:
      "Currently signed-in Owner",

    ownerAccountDesc:
      "Current Owner session information.",

    name:
      "Name",

    email:
      "Email",

    role:
      "Role",

    loadError:
      "Failed to load configuration.",

    saveError:
      "Failed to save configuration.",

    payoutError:
      "Failed to load payout.",

    withdrawError:
      "Failed to process withdrawal.",

    requiredFacility:
      "Facility name cannot be empty.",

    requiredFaq:
      "FAQ question cannot be empty.",
  },
} as const;

function numberValue(
  value: unknown,
) {
  const parsed =
    Number(
      value ??
        0,
    );

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
}

function facilitiesFrom(
  value: unknown,
): Facility[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value.map(
    (
      item,
    ) => {
      if (
        typeof item ===
        "string"
      ) {
        return {
          icon:
            "",
          name:
            item,
          description:
            "",
        };
      }

      const record =
        (
          item ??
          {}
        ) as
          Partial<Facility>;

      return {
        icon:
          String(
            record.icon ??
              "",
          ),
        name:
          String(
            record.name ??
              "",
          ),
        description:
          String(
            record.description ??
              "",
          ),
      };
    },
  );
}

function faqFrom(
  value: unknown,
): FaqItem[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value.map(
    (
      item,
    ) => {
      if (
        typeof item ===
        "string"
      ) {
        return {
          question:
            item,
          answer:
            "",
        };
      }

      const record =
        (
          item ??
          {}
        ) as
          Partial<FaqItem>;

      return {
        question:
          String(
            record.question ??
              "",
          ),
        answer:
          String(
            record.answer ??
              "",
          ),
      };
    },
  );
}

function rupiah(
  value: unknown,
) {
  return new Intl.NumberFormat(
    "id-ID",
    {
      style:
        "currency",
      currency:
        "IDR",
      maximumFractionDigits:
        0,
    },
  ).format(
    numberValue(
      value,
    ),
  );
}

export default function AdminSettingsPage() {
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
    copy[
      locale
    ];

  const [
    workspace,
    setWorkspace,
  ] =
    useState<Workspace>(
      "global",
    );

  const [
    globalSection,
    setGlobalSection,
  ] =
    useState<GlobalSection>(
      "overview",
    );

  const [
    branches,
    setBranches,
  ] =
    useState<Branch[]>(
      [],
    );

  const [
    selectedOutlet,
    setSelectedOutlet,
  ] =
    useState<
      "main" |
      number
    >(
      "main",
    );

  const [
    globalForm,
    setGlobalForm,
  ] =
    useState<GlobalForm>(
      EMPTY_GLOBAL,
    );

  const [
    outletForm,
    setOutletForm,
  ] =
    useState<OutletForm>(
      EMPTY_OUTLET,
    );

  const [
    owner,
    setOwner,
  ] =
    useState<OwnerProfile>({
      name:
        "",
      email:
        "",
      role:
        "",
    });

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    outletLoading,
    setOutletLoading,
  ] =
    useState(
      false,
    );

  const [
    saving,
    setSaving,
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

  const [
    showWifiPassword,
    setShowWifiPassword,
  ] =
    useState(
      false,
    );

  const [
    payout,
    setPayout,
  ] =
    useState<PayoutData | null>(
      null,
    );

  const [
    payoutLoading,
    setPayoutLoading,
  ] =
    useState(
      false,
    );

  const [
    withdrawing,
    setWithdrawing,
  ] =
    useState(
      false,
    );

  const [
    withdrawConfirm,
    setWithdrawConfirm,
  ] =
    useState(
      false,
    );

  const loadBranches =
    useCallback(
      async () => {
        if (
          !slug
        ) {
          return;
        }

        try {
          const response =
            await fetch(
              `/api/pos/branches?slug=${encodeURIComponent(
                slug,
              )}`,
              {
                cache:
                  "no-store",
                credentials:
                  "include",
              },
            );

          const result =
            await response.json();

          if (
            response.ok &&
            result.success &&
            Array.isArray(
              result.data,
            )
          ) {
            setBranches(
              result.data,
            );
          }
        } catch (
          error
        ) {
          console.error(
            "[SETTINGS_BRANCH_LOAD]",
            error,
          );
        }
      },
      [
        slug,
      ],
    );

  const loadGlobal =
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

        try {
          const [
            settingsResponse,
            profileResponse,
          ] =
            await Promise.all([
              fetch(
                `/api/settings?slug=${encodeURIComponent(
                  slug,
                )}`,
                {
                  cache:
                    "no-store",
                  credentials:
                    "include",
                },
              ),

              fetch(
                `/api/auth/me?slug=${encodeURIComponent(
                  slug,
                )}`,
                {
                  cache:
                    "no-store",
                  credentials:
                    "include",
                },
              ),
            ]);

          const settingsResult =
            await settingsResponse.json();

          if (
            !settingsResponse.ok ||
            !settingsResult.success ||
            !settingsResult.data
          ) {
            throw new Error(
              settingsResult.message ||
                t.loadError,
            );
          }

          const data =
            settingsResult.data;

          setGlobalForm({
            cafeName:
              String(
                data.cafeName ??
                  "",
              ),

            mitraAddress:
              String(
                data.mitraAddress ??
                  "",
              ),

            mitraWelcome:
              String(
                data.mitraWelcome ??
                  "",
              ),

            bankName:
              String(
                data.bankName ??
                  "",
              ),

            bankNumber:
              String(
                data.bankNumber ??
                  "",
              ),

            bankOwner:
              String(
                data.bankOwner ??
                  "",
              ),

            taxRate:
              data.taxRate ===
                null ||
              data.taxRate ===
                undefined
                ? ""
                : String(
                    data.taxRate,
                  ),

            serviceRate:
              data.serviceRate ===
                null ||
              data.serviceRate ===
                undefined
                ? ""
                : String(
                    data.serviceRate,
                  ),

            platformFeeRate:
              (
                data.platformFeeRate ??
                data.cashout
              ) ===
                null ||
              (
                data.platformFeeRate ??
                data.cashout
              ) ===
                undefined
                ? ""
                : String(
                    data.platformFeeRate ??
                      data.cashout,
                  ),

            isTaxIncluded:
              (
                data.isTaxIncluded ??
                data.is_tax_included
              ) ===
                null ||
              (
                data.isTaxIncluded ??
                data.is_tax_included
              ) ===
                undefined
                ? null
                : Number(
                    data.isTaxIncluded ??
                      data.is_tax_included,
                  ) ===
                  1
                  ? 1
                  : 0,

            faq:
              faqFrom(
                data.faq,
              ),
          });

          if (
            profileResponse.ok
          ) {
            const profileResult =
              await profileResponse.json();

            if (
              profileResult.success &&
              profileResult.user
            ) {
              setOwner({
                name:
                  String(
                    profileResult.user.name ??
                      "",
                  ),

                email:
                  String(
                    profileResult.user.email ??
                      "",
                  ),

                role:
                  String(
                    profileResult.user.role ??
                      "",
                  ),
              });
            }
          }
        } catch (
          error
        ) {
          console.error(
            "[SETTINGS_GLOBAL_LOAD]",
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
            !silent
          ) {
            setLoading(
              false,
            );
          }
        }
      },
      [
        slug,
        t.loadError,
      ],
    );

  const loadOutlet =
    useCallback(
      async () => {
        if (
          !slug
        ) {
          return;
        }

        setOutletLoading(
          true,
        );

        try {
          const query =
            new URLSearchParams({
              slug,
            });

          if (
            selectedOutlet !==
            "main"
          ) {
            query.set(
              "branch_id",
              String(
                selectedOutlet,
              ),
            );
          }

          const response =
            await fetch(
              `/api/settings?${query.toString()}`,
              {
                cache:
                  "no-store",
                credentials:
                  "include",
              },
            );

          const result =
            await response.json();

          if (
            !response.ok ||
            !result.success ||
            !result.data
          ) {
            throw new Error(
              result.message ||
                t.loadError,
            );
          }

          setOutletForm({
            wifiSSID:
              String(
                result.data.wifiSSID ??
                  "",
              ),

            wifiPassword:
              String(
                result.data.wifiPassword ??
                  "",
              ),

            facilities:
              facilitiesFrom(
                result.data.facilities ??
                  result.data.facility,
              ),
          });
        } catch (
          error
        ) {
          console.error(
            "[SETTINGS_OUTLET_LOAD]",
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
          setOutletLoading(
            false,
          );
        }
      },
      [
        selectedOutlet,
        slug,
        t.loadError,
      ],
    );

  const loadPayout =
    useCallback(
      async () => {
        if (
          !slug
        ) {
          return;
        }

        setPayoutLoading(
          true,
        );

        try {
          const response =
            await fetch(
              `/api/pos/payout?slug=${encodeURIComponent(
                slug,
              )}`,
              {
                cache:
                  "no-store",
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
                t.payoutError,
            );
          }

          setPayout(
            result.data ??
            null,
          );
        } catch (
          error
        ) {
          console.error(
            "[SETTINGS_PAYOUT_LOAD]",
            error,
          );

          Toast.fire({
            icon:
              "error",
            title:
              error instanceof
                Error
                ? error.message
                : t.payoutError,
          });
        } finally {
          setPayoutLoading(
            false,
          );
        }
      },
      [
        slug,
        t.payoutError,
      ],
    );

  useEffect(() => {
    void Promise.all([
      loadBranches(),
      loadGlobal(),
    ]);
  }, [
    loadBranches,
    loadGlobal,
  ]);

  useEffect(() => {
    if (
      workspace ===
      "outlet"
    ) {
      void loadOutlet();
    }
  }, [
    loadOutlet,
    workspace,
  ]);

  useEffect(() => {
    if (
      workspace ===
        "global" &&
      globalSection ===
        "payout"
    ) {
      void loadPayout();
    }
  }, [
    globalSection,
    loadPayout,
    workspace,
  ]);

  const saveGlobal =
    async (
      event?:
        FormEvent,
    ) => {
      event?.preventDefault();

      if (
        globalForm.faq.some(
          (
            item,
          ) =>
            !item.question.trim(),
        )
      ) {
        Toast.fire({
          icon:
            "warning",
          title:
            t.requiredFaq,
        });

        return;
      }

      setSaving(
        true,
      );

      try {
        const response =
          await fetch(
            `/api/settings?slug=${encodeURIComponent(
              slug,
            )}`,
            {
              method:
                "PUT",
              credentials:
                "include",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  scope:
                    "global",

                  cafeName:
                    globalForm.cafeName,

                  mitraAddress:
                    globalForm.mitraAddress,

                  mitraWelcome:
                    globalForm.mitraWelcome,

                  bankName:
                    globalForm.bankName,

                  bankNumber:
                    globalForm.bankNumber,

                  bankOwner:
                    globalForm.bankOwner,

                  taxRate:
                    numberValue(
                      globalForm.taxRate,
                    ),

                  serviceRate:
                    numberValue(
                      globalForm.serviceRate,
                    ),

                  is_tax_included:
                    globalForm.isTaxIncluded ??
                    0,

                  faq:
                    globalForm.faq,
                }),
            },
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          result.success ===
            false
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
            result.message ||
            t.savedGlobal,
        });

        await loadGlobal(
          true,
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
              : t.saveError,
        });
      } finally {
        setSaving(
          false,
        );
      }
    };

  const saveOutlet =
    async () => {
      if (
        outletForm.facilities.some(
          (
            facility,
          ) =>
            !facility.name.trim(),
        )
      ) {
        Toast.fire({
          icon:
            "warning",
          title:
            t.requiredFacility,
        });

        return;
      }

      setSaving(
        true,
      );

      try {
        const response =
          await fetch(
            `/api/settings?slug=${encodeURIComponent(
              slug,
            )}`,
            {
              method:
                "PUT",
              credentials:
                "include",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  scope:
                    "outlet",

                  branch_id:
                    selectedOutlet ===
                    "main"
                      ? null
                      : selectedOutlet,

                  wifiSSID:
                    outletForm.wifiSSID,

                  wifiPassword:
                    outletForm.wifiPassword,

                  facilities:
                    outletForm.facilities,
                }),
            },
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          result.success ===
            false
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
            result.message ||
            t.savedOutlet,
        });

        await loadOutlet();
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
              : t.saveError,
        });
      } finally {
        setSaving(
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
        if (
          workspace ===
          "global"
        ) {
          await loadGlobal(
            true,
          );

          if (
            globalSection ===
            "payout"
          ) {
            await loadPayout();
          }
        } else {
          await loadOutlet();
        }
      } finally {
        setRefreshing(
          false,
        );
      }
    };

  const withdraw =
    async () => {
      if (
        !payout?.canWithdraw ||
        withdrawing
      ) {
        return;
      }

      setWithdrawing(
        true,
      );

      try {
        const response =
          await fetch(
            "/api/pos/payout",
            {
              method:
                "POST",
              credentials:
                "include",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  slug,
                }),
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
              t.withdrawError,
          );
        }

        Toast.fire({
          icon:
            "success",
          title:
            result.message,
        });

        setWithdrawConfirm(
          false,
        );

        await loadPayout();
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
              : t.withdrawError,
        });
      } finally {
        setWithdrawing(
          false,
        );
      }
    };

  const financePreview =
    useMemo(
      () => {
        const baseInput =
          100000;

        const taxRate =
          Math.max(
            0,
            numberValue(
              globalForm.taxRate,
            ),
          );

        const serviceRate =
          Math.max(
            0,
            numberValue(
              globalForm.serviceRate,
            ),
          );

        const platformRate =
          Math.max(
            0,
            numberValue(
              globalForm.platformFeeRate,
            ),
          );

        let base =
          baseInput;

        let service =
          0;

        let tax =
          0;

        let total =
          baseInput;

        if (
          globalForm.isTaxIncluded ===
          1
        ) {
          const divisor =
            (
              1 +
              serviceRate /
                100
            ) *
            (
              1 +
              taxRate /
                100
            );

          base =
            divisor >
            0
              ? Math.floor(
                  baseInput /
                    divisor,
                )
              : baseInput;

          service =
            Math.floor(
              base *
                (
                  serviceRate /
                  100
                ),
            );

          tax =
            baseInput -
            base -
            service;

          total =
            baseInput;
        } else {
          service =
            Math.floor(
              base *
                (
                  serviceRate /
                  100
                ),
            );

          tax =
            Math.floor(
              (
                base +
                service
              ) *
                (
                  taxRate /
                  100
                ),
            );

          total =
            base +
            service +
            tax;
        }

        const platform =
          Math.floor(
            total *
              (
                platformRate /
                100
              ),
          );

        return {
          base,
          service,
          tax,
          total,
          platform,
          net:
            Math.max(
              0,
              total -
                platform,
            ),
        };
      },
      [
        globalForm,
      ],
    );

  const globalHealth =
    useMemo(
      () => {
        const values = [
          Boolean(
            globalForm.cafeName.trim(),
          ),
          Boolean(
            globalForm.mitraAddress.trim(),
          ),
          Boolean(
            globalForm.bankName.trim() &&
              globalForm.bankNumber.trim() &&
              globalForm.bankOwner.trim(),
          ),
          globalForm.faq.length >
            0,
          numberValue(
            globalForm.taxRate,
          ) >=
            0,
          numberValue(
            globalForm.serviceRate,
          ) >=
            0,
        ];

        return Math.round(
          (
            values.filter(
              Boolean,
            ).length /
            values.length
          ) *
            100,
        );
      },
      [
        globalForm,
      ],
    );

  const activeOutletName =
    selectedOutlet ===
    "main"
      ? t.mainOutlet
      : branches.find(
          (
            branch,
          ) =>
            branch.id ===
            selectedOutlet,
        )?.name ??
        t.mainOutlet;

  if (
    loading
  ) {
    return (
      <div className="flex min-h-[520px] items-center justify-center bg-[#f7f7f4]">
        <Loader2 className="h-7 w-7 animate-spin text-black/35" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f7f7f4] text-[#111111]">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        {/* PAGE HEADER */}
        <header className="flex flex-col gap-5 border-b border-black/[0.07] pb-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-black/35">
              {
                t.eyebrow
              }
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              {
                t.title
              }
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/45">
              {
                t.subtitle
              }
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void handleRefresh()
            }
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-black/[0.08] bg-white px-4 text-xs font-extrabold shadow-sm"
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
              t.refresh
            }
          </button>
        </header>

        {/* SCOPE SELECTOR */}
        <section className="mt-6 grid gap-3 lg:grid-cols-2">
          <WorkspaceCard
            active={
              workspace ===
              "global"
            }
            icon={
              Settings2
            }
            badge={
              t.globalBadge
            }
            title={
              t.globalWorkspace
            }
            description={
              t.globalWorkspaceDesc
            }
            onClick={() =>
              setWorkspace(
                "global",
              )
            }
          />

          <WorkspaceCard
            active={
              workspace ===
              "outlet"
            }
            icon={
              Store
            }
            badge={
              t.outletBadge
            }
            title={
              t.outletWorkspace
            }
            description={
              t.outletWorkspaceDesc
            }
            onClick={() =>
              setWorkspace(
                "outlet",
              )
            }
          />
        </section>

        {workspace ===
        "global" ? (
          <GlobalWorkspace
            slug={
              slug
            }
            locale={
              locale
            }
            section={
              globalSection
            }
            onSectionChange={
              setGlobalSection
            }
            form={
              globalForm
            }
            setForm={
              setGlobalForm
            }
            owner={
              owner
            }
            health={
              globalHealth
            }
            preview={
              financePreview
            }
            payout={
              payout
            }
            payoutLoading={
              payoutLoading
            }
            saving={
              saving
            }
            onSave={() =>
              void saveGlobal()
            }
            onWithdraw={() =>
              setWithdrawConfirm(
                true,
              )
            }
          />
        ) : (
          <OutletWorkspace
            locale={
              locale
            }
            branches={
              branches
            }
            selectedOutlet={
              selectedOutlet
            }
            setSelectedOutlet={
              setSelectedOutlet
            }
            outletName={
              activeOutletName
            }
            form={
              outletForm
            }
            setForm={
              setOutletForm
            }
            loading={
              outletLoading
            }
            saving={
              saving
            }
            showPassword={
              showWifiPassword
            }
            setShowPassword={
              setShowWifiPassword
            }
            onSave={() =>
              void saveOutlet()
            }
          />
        )}
      </div>

      {withdrawConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white">
              <Wallet
                size={
                  17
                }
              />
            </div>

            <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em]">
              {
                t.withdrawConfirm
              }
            </h3>

            <p className="mt-2 text-xs leading-5 text-black/45">
              {
                t.withdrawConfirmDesc
              }
            </p>

            <p className="mt-5 text-3xl font-semibold tracking-[-0.045em]">
              {
                rupiah(
                  payout?.totalEligibleQris,
                )
              }
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={
                  withdrawing
                }
                onClick={() =>
                  setWithdrawConfirm(
                    false,
                  )
                }
                className="h-11 rounded-xl bg-[#f2f2ee] text-xs font-extrabold text-black/50"
              >
                {
                  t.cancel
                }
              </button>

              <button
                type="button"
                disabled={
                  withdrawing
                }
                onClick={() =>
                  void withdraw()
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-black text-xs font-extrabold text-white disabled:opacity-50"
              >
                {withdrawing && (
                  <Loader2
                    size={
                      14
                    }
                    className="animate-spin"
                  />
                )}

                {
                  t.confirmWithdraw
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GlobalWorkspace({
  slug,
  locale,
  section,
  onSectionChange,
  form,
  setForm,
  owner,
  health,
  preview,
  payout,
  payoutLoading,
  saving,
  onSave,
  onWithdraw,
}: {
  slug:
    string;
  locale:
    Locale;
  section:
    GlobalSection;
  onSectionChange:
    (
      section:
        GlobalSection,
    ) => void;
  form:
    GlobalForm;
  setForm:
    React.Dispatch<
      React.SetStateAction<GlobalForm>
    >;
  owner:
    OwnerProfile;
  health:
    number;
  preview: {
    base: number;
    service: number;
    tax: number;
    total: number;
    platform: number;
    net: number;
  };
  payout:
    PayoutData | null;
  payoutLoading:
    boolean;
  saving:
    boolean;
  onSave:
    () => void;
  onWithdraw:
    () => void;
}) {
  const t =
    copy[
      locale
    ];

  const nav: Array<{
    id: GlobalSection;
    label: string;
    icon:
      typeof Settings2;
  }> = [
    {
      id:
        "overview",
      label:
        t.overview,
      icon:
        Settings2,
    },
    {
      id:
        "business",
      label:
        t.business,
      icon:
        Building2,
    },
    {
      id:
        "finance",
      label:
        t.finance,
      icon:
        CircleDollarSign,
    },
    {
      id:
        "bank",
      label:
        t.bank,
      icon:
        Landmark,
    },
    {
      id:
        "faq",
      label:
        t.faq,
      icon:
        HelpCircle,
    },
    {
      id:
        "payout",
      label:
        t.payout,
      icon:
        Wallet,
    },
    {
      id:
        "account",
      label:
        t.account,
      icon:
        UserRound,
    },
  ];

  const addFaq =
    () => {
      setForm(
        (
          current,
        ) => ({
          ...current,
          faq: [
            ...current.faq,
            {
              question:
                "",
              answer:
                "",
            },
          ],
        }),
      );
    };

  return (
    <section className="mt-5 grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
      {/* GLOBAL NAV */}
      <aside className="h-fit rounded-[24px] border border-black/[0.07] bg-white p-2 shadow-sm xl:sticky xl:top-5">
        <div className="px-3 py-3">
          <span className="inline-flex rounded-full bg-black px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[0.12em] text-white">
            {
              t.globalBadge
            }
          </span>

          <p className="mt-3 text-xs font-extrabold">
            {
              t.globalWorkspace
            }
          </p>

          <p className="mt-1 text-[9px] leading-4 text-black/35">
            {
              t.globalRulesDesc
            }
          </p>
        </div>

        <div className="mt-1 flex gap-1 overflow-x-auto xl:block xl:space-y-1">
          {nav.map(
            (
              item,
            ) => {
              const Icon =
                item.icon;

              const active =
                section ===
                item.id;

              return (
                <button
                  key={
                    item.id
                  }
                  type="button"
                  onClick={() =>
                    onSectionChange(
                      item.id,
                    )
                  }
                  className={[
                    "flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-[10px] font-extrabold transition xl:w-full",
                    active
                      ? "bg-black text-white"
                      : "text-black/40 hover:bg-[#f4f4f0] hover:text-black",
                  ].join(
                    " ",
                  )}
                >
                  <Icon
                    size={
                      13
                    }
                  />

                  {
                    item.label
                  }

                  <ChevronRight
                    size={
                      12
                    }
                    className="ml-auto hidden xl:block"
                  />
                </button>
              );
            },
          )}
        </div>
      </aside>

      {/* GLOBAL CONTENT */}
      <div className="min-w-0">
        {section ===
          "overview" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_.9fr]">
            <section className="overflow-hidden rounded-[28px] bg-black p-6 text-white shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.17em] text-white/30">
                    {
                      t.configurationHealth
                    }
                  </p>

                  <p className="mt-3 text-6xl font-semibold tracking-[-0.07em]">
                    {
                      health
                    }%
                  </p>
                </div>

                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white/60">
                  <Sparkles
                    size={
                      17
                    }
                  />
                </span>
              </div>

              <div className="mt-7 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{
                    width:
                      `${health}%`,
                  }}
                />
              </div>

              <div className="mt-7 grid gap-2 sm:grid-cols-3">
                <OverviewTile
                  label={
                    t.globalRules
                  }
                  value={`${form.taxRate}% + ${form.serviceRate}%`}
                  good
                />

                <OverviewTile
                  label={
                    t.customerInfo
                  }
                  value={`${form.faq.length} FAQ`}
                  good={
                    form.faq.length >
                    0
                  }
                />

                <OverviewTile
                  label={
                    t.settlement
                  }
                  value={
                    form.bankName ||
                    "—"
                  }
                  good={
                    Boolean(
                      form.bankName &&
                        form.bankNumber,
                    )
                  }
                />
              </div>
            </section>

            <Panel
              title={
                t.globalRules
              }
              description={
                t.globalRulesDesc
              }
              icon={
                ShieldCheck
              }
            >
              <div className="space-y-3">
                <SummaryRow
                  label={
                    t.tax
                  }
                  value={`${form.taxRate}%`}
                />

                <SummaryRow
                  label={
                    t.service
                  }
                  value={`${form.serviceRate}%`}
                />

                <SummaryRow
                  label={
                    t.pricingMode
                  }
                  value={
                    form.isTaxIncluded ===
                    null
                      ? t.notConfigured
                      : form.isTaxIncluded ===
                          1
                        ? t.inclusive
                        : t.exclusive
                  }
                />

                <SummaryRow
                  label={
                    t.bank
                  }
                  value={
                    form.bankName ||
                    "—"
                  }
                />
              </div>
            </Panel>

            <Panel
              title={
                t.business
              }
              description={
                form.cafeName ||
                "—"
              }
              icon={
                Store
              }
            >
              <p className="text-xs leading-6 text-black/45">
                {
                  form.mitraAddress ||
                  "—"
                }
              </p>
            </Panel>

            <Panel
              title={
                t.faq
              }
              description={
                t.faqDesc
              }
              icon={
                HelpCircle
              }
            >
              <p className="text-3xl font-semibold tracking-[-0.04em]">
                {
                  form.faq.length
                }
              </p>

              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-black/25">
                FAQ
              </p>
            </Panel>
          </div>
        )}

        {section ===
          "business" && (
          <Panel
            title={
              t.business
            }
            description={
              t.globalRulesDesc
            }
            icon={
              Building2
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label={
                  t.businessName
                }
                value={
                  form.cafeName
                }
                disabled
                onChange={() =>
                  undefined
                }
              />

              <TextField
                label={
                  t.welcome
                }
                value={
                  form.mitraWelcome
                }
                onChange={(
                  value,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,
                      mitraWelcome:
                        value,
                    }),
                  )
                }
              />
            </div>

            <p className="mt-2 text-[9px] text-black/30">
              {
                t.businessLocked
              }
            </p>

            <div className="mt-4">
              <TextArea
                label={
                  t.address
                }
                value={
                  form.mitraAddress
                }
                onChange={(
                  value,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,
                      mitraAddress:
                        value,
                    }),
                  )
                }
              />
            </div>
          </Panel>
        )}

        {section ===
          "finance" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_.8fr]">
            <Panel
              title={
                t.finance
              }
              description={
                t.globalRulesDesc
              }
              icon={
                CircleDollarSign
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label={
                    t.tax
                  }
                  value={
                    form.taxRate
                  }
                  onChange={(
                    value,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        taxRate:
                          value,
                      }),
                    )
                  }
                  suffix="%"
                />

                <NumberField
                  label={
                    t.service
                  }
                  value={
                    form.serviceRate
                  }
                  onChange={(
                    value,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        serviceRate:
                          value,
                      }),
                    )
                  }
                  suffix="%"
                />
              </div>

              <div className="mt-4 rounded-[18px] border border-red-100 bg-red-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[8px] font-extrabold uppercase tracking-[0.12em] text-red-500">
                      {
                        t.platformFee
                      }
                    </p>

                    <p className="mt-1 text-2xl font-semibold text-red-700">
                      {
                        form.platformFeeRate
                      }%
                    </p>

                    <p className="mt-1 text-[9px] leading-4 text-red-700/55">
                      {
                        t.platformFeeLocked
                      }
                    </p>
                  </div>

                  <AlertCircle
                    size={
                      16
                    }
                    className="text-red-300"
                  />
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-[8px] font-extrabold uppercase tracking-[0.12em] text-black/30">
                  {
                    t.pricingMode
                  }
                </p>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          isTaxIncluded:
                            0,
                        }),
                      )
                    }
                    className={[
                      "rounded-[16px] border p-3 text-left transition",
                      form.isTaxIncluded ===
                      0
                        ? "border-black bg-black text-white"
                        : "border-black/[0.07] bg-[#f7f7f4]",
                    ].join(
                      " ",
                    )}
                  >
                    <p className="text-[10px] font-extrabold">
                      {
                        t.exclusive
                      }
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          isTaxIncluded:
                            1,
                        }),
                      )
                    }
                    className={[
                      "rounded-[16px] border p-3 text-left transition",
                      form.isTaxIncluded ===
                      1
                        ? "border-black bg-black text-white"
                        : "border-black/[0.07] bg-[#f7f7f4]",
                    ].join(
                      " ",
                    )}
                  >
                    <p className="text-[10px] font-extrabold">
                      {
                        t.inclusive
                      }
                    </p>
                  </button>
                </div>

                {form.isTaxIncluded ===
                  null && (
                  <p className="mt-2 text-[9px] font-bold text-black/30">
                    {
                      t.notConfigured
                    }
                  </p>
                )}
              </div>
            </Panel>

            <section className="rounded-[28px] bg-black p-5 text-white shadow-sm">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-white/30">
                {
                  t.preview
                }
              </p>

              <div className="mt-6 space-y-3">
                <PreviewRow
                  label={
                    t.menuBase
                  }
                  value={
                    rupiah(
                      preview.base,
                    )
                  }
                />

                <PreviewRow
                  label={
                    t.serviceAmount
                  }
                  value={
                    rupiah(
                      preview.service,
                    )
                  }
                />

                <PreviewRow
                  label={
                    t.taxAmount
                  }
                  value={
                    rupiah(
                      preview.tax,
                    )
                  }
                />

                <div className="border-t border-white/10 pt-3">
                  <PreviewRow
                    label={
                      t.customerTotal
                    }
                    value={
                      rupiah(
                        preview.total,
                      )
                    }
                    strong
                  />
                </div>

                <PreviewRow
                  label={
                    t.platformCut
                  }
                  value={`- ${rupiah(
                    preview.platform,
                  )}`}
                  danger
                />

                <div className="rounded-[16px] bg-white/[0.08] p-3">
                  <PreviewRow
                    label={
                      t.merchantNet
                    }
                    value={
                      rupiah(
                        preview.net,
                      )
                    }
                    strong
                  />
                </div>
              </div>
            </section>
          </div>
        )}

        {section ===
          "bank" && (
          <Panel
            title={
              t.bank
            }
            description={
              t.bankDesc
            }
            icon={
              Landmark
            }
          >
            <div className="grid gap-4 md:grid-cols-3">
              <BankSearchSelect
                label={
                  t.bankName
                }
                value={
                  form.bankName
                }
                placeholder={
                  t.chooseBank
                }
                searchPlaceholder={
                  t.searchBank
                }
                emptyLabel={
                  t.bankNotFound
                }
                onChange={(
                  value,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,
                      bankName:
                        value,
                    }),
                  )
                }
              />

              <TextField
                label={
                  t.bankNumber
                }
                value={
                  form.bankNumber
                }
                onChange={(
                  value,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,
                      bankNumber:
                        value,
                    }),
                  )
                }
                mono
              />

              <TextField
                label={
                  t.bankOwner
                }
                value={
                  form.bankOwner
                }
                onChange={(
                  value,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,
                      bankOwner:
                        value.toUpperCase(),
                    }),
                  )
                }
              />
            </div>
          </Panel>
        )}

        {section ===
          "faq" && (
          <Panel
            title={
              t.faq
            }
            description={
              t.faqDesc
            }
            icon={
              HelpCircle
            }
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#efefe9] px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[0.1em] text-black/45">
                <ShieldCheck
                  size={
                    10
                  }
                />

                {
                  t.globalBadge
                }
              </span>

              <button
                type="button"
                onClick={
                  addFaq
                }
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-black px-4 text-[9px] font-extrabold uppercase tracking-[0.08em] text-white"
              >
                <Plus
                  size={
                    13
                  }
                />

                {
                  t.addFaq
                }
              </button>
            </div>

            {form.faq.length ===
            0 ? (
              <EmptyState
                label={
                  t.noFaq
                }
              />
            ) : (
              <div className="space-y-3">
                {form.faq.map(
                  (
                    item,
                    index,
                  ) => (
                    <div
                      key={
                        index
                      }
                      className="rounded-[20px] border border-black/[0.07] bg-[#fafaf7] p-4"
                    >
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            setForm(
                              (
                                current,
                              ) => ({
                                ...current,
                                faq:
                                  current.faq.filter(
                                    (
                                      _,
                                      itemIndex,
                                    ) =>
                                      itemIndex !==
                                      index,
                                  ),
                              }),
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-red-500 ring-1 ring-black/[0.06]"
                        >
                          <Trash2
                            size={
                              13
                            }
                          />
                        </button>
                      </div>

                      <TextField
                        label={
                          t.question
                        }
                        value={
                          item.question
                        }
                        onChange={(
                          value,
                        ) =>
                          setForm(
                            (
                              current,
                            ) => ({
                              ...current,
                              faq:
                                current.faq.map(
                                  (
                                    faq,
                                    faqIndex,
                                  ) =>
                                    faqIndex ===
                                    index
                                      ? {
                                          ...faq,
                                          question:
                                            value,
                                        }
                                      : faq,
                                ),
                            }),
                          )
                        }
                      />

                      <div className="mt-3">
                        <TextArea
                          label={
                            t.answer
                          }
                          value={
                            item.answer
                          }
                          onChange={(
                            value,
                          ) =>
                            setForm(
                              (
                                current,
                              ) => ({
                                ...current,
                                faq:
                                  current.faq.map(
                                    (
                                      faq,
                                      faqIndex,
                                    ) =>
                                      faqIndex ===
                                      index
                                        ? {
                                            ...faq,
                                            answer:
                                              value,
                                          }
                                        : faq,
                                  ),
                              }),
                            )
                          }
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </Panel>
        )}

        {section ===
          "payout" && (
          <PayoutView
            slug={
              slug
            }
            data={
              payout
            }
            loading={
              payoutLoading
            }
            locale={
              locale
            }
            onWithdraw={
              onWithdraw
            }
          />
        )}

        {section ===
          "account" && (
          <Panel
            title={
              t.ownerAccount
            }
            description={
              t.ownerAccountDesc
            }
            icon={
              UserRound
            }
          >
            <div className="grid gap-3 md:grid-cols-3">
              <ReadOnly
                label={
                  t.name
                }
                value={
                  owner.name ||
                  "—"
                }
              />

              <ReadOnly
                label={
                  t.email
                }
                value={
                  owner.email ||
                  "—"
                }
              />

              <ReadOnly
                label={
                  t.role
                }
                value={
                  owner.role ||
                  "—"
                }
              />
            </div>
          </Panel>
        )}

        {![
          "payout",
          "account",
          "overview",
        ].includes(
          section,
        ) && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={
                onSave
              }
              disabled={
                saving
              }
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-black px-5 text-xs font-extrabold text-white disabled:opacity-50"
            >
              {saving ? (
                <Loader2
                  size={
                    14
                  }
                  className="animate-spin"
                />
              ) : (
                <Save
                  size={
                    14
                  }
                />
              )}

              {saving
                ? t.saving
                : t.saveGlobal}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function OutletWorkspace({
  locale,
  branches,
  selectedOutlet,
  setSelectedOutlet,
  outletName,
  form,
  setForm,
  loading,
  saving,
  showPassword,
  setShowPassword,
  onSave,
}: {
  locale:
    Locale;
  branches:
    Branch[];
  selectedOutlet:
    "main" |
    number;
  setSelectedOutlet:
    (
      value:
        "main" |
        number,
    ) => void;
  outletName:
    string;
  form:
    OutletForm;
  setForm:
    React.Dispatch<
      React.SetStateAction<OutletForm>
    >;
  loading:
    boolean;
  saving:
    boolean;
  showPassword:
    boolean;
  setShowPassword:
    React.Dispatch<
      React.SetStateAction<boolean>
    >;
  onSave:
    () => void;
}) {
  const t =
    copy[
      locale
    ];

  const addFacility =
    () => {
      setForm(
        (
          current,
        ) => ({
          ...current,
          facilities: [
            ...current.facilities,
            {
              icon:
                "",
              name:
                "",
              description:
                "",
            },
          ],
        }),
      );
    };

  return (
    <section className="mt-5">
      {/* OUTLET HEADER */}
      <div className="rounded-[28px] border border-black/[0.07] bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_340px] lg:items-center">
          <div>
            <span className="inline-flex rounded-full bg-[#efefe9] px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[0.12em] text-black/45">
              {
                t.outletBadge
              }
            </span>

            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
              {
                t.chooseOutlet
              }
            </h2>

            <p className="mt-2 max-w-2xl text-xs leading-5 text-black/40">
              {
                t.outletNotice
              }
            </p>
          </div>

          <select
            value={
              selectedOutlet
            }
            onChange={(
              event,
            ) => {
              const value =
                event.target.value;

              setSelectedOutlet(
                value ===
                "main"
                  ? "main"
                  : Number(
                      value,
                    ),
              );
            }}
            className="h-12 rounded-2xl border border-black/[0.08] bg-[#f7f7f4] px-4 text-sm font-extrabold outline-none focus:border-black/20"
          >
            <option value="main">
              {
                t.mainOutlet
              }
            </option>

            {branches.map(
              (
                branch,
              ) => (
                <option
                  key={
                    branch.id
                  }
                  value={
                    branch.id
                  }
                >
                  {
                    branch.name
                  }
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      {/* WARNING / CLARITY */}
      <div className="mt-4 flex items-start gap-3 rounded-[20px] border border-blue-100 bg-blue-50 p-4 text-blue-800">
        <ShieldCheck
          size={
            15
          }
          className="mt-0.5 shrink-0"
        />

        <div>
          <p className="text-[10px] font-extrabold">
            {
              t.outletNoticeTitle
            }
          </p>

          <p className="mt-1 text-[9px] leading-4 text-blue-800/65">
            {
              t.outletNotice
            }
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex min-h-[360px] items-center justify-center rounded-[28px] border border-black/[0.07] bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-black/35" />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {/* WIFI */}
          <Panel
            title={`${t.wifi} · ${outletName}`}
            description={
              t.wifiDesc
            }
            icon={
              Wifi
            }
          >
            <div className="space-y-4">
              <TextField
                label={
                  t.ssid
                }
                value={
                  form.wifiSSID
                }
                onChange={(
                  value,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,
                      wifiSSID:
                        value,
                    }),
                  )
                }
              />

              <label className="block">
                <span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.13em] text-black/30">
                  {
                    t.wifiPassword
                  }
                </span>

                <div className="relative">
                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      form.wifiPassword
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          wifiPassword:
                            event.target.value,
                        }),
                      )
                    }
                    className="h-12 w-full rounded-xl border border-black/[0.08] bg-[#fafaf7] px-3 pr-11 text-sm font-semibold outline-none focus:border-black/20"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (
                          current,
                        ) =>
                          !current,
                      )
                    }
                    className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-black/30 hover:bg-black/[0.04]"
                    aria-label={
                      showPassword
                        ? t.hide
                        : t.show
                    }
                  >
                    {showPassword ? (
                      <EyeOff
                        size={
                          14
                        }
                      />
                    ) : (
                      <Eye
                        size={
                          14
                        }
                      />
                    )}
                  </button>
                </div>
              </label>

              <div className="rounded-[20px] bg-black p-4 text-white">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                    <Wifi
                      size={
                        15
                      }
                    />
                  </span>

                  <div className="min-w-0">
                    <p className="text-[8px] font-extrabold uppercase tracking-[0.12em] text-white/30">
                      {
                        outletName
                      }
                    </p>

                    <p className="mt-1 truncate text-lg font-semibold">
                      {
                        form.wifiSSID ||
                        "—"
                      }
                    </p>
                  </div>
                </div>

                <p className="mt-4 font-mono text-sm font-bold tracking-[0.08em] text-white/55">
                  {
                    form.wifiPassword ||
                    "••••••••"
                  }
                </p>
              </div>
            </div>
          </Panel>

          {/* FACILITIES */}
          <Panel
            title={`${t.facilities} · ${outletName}`}
            description={
              t.facilitiesDesc
            }
            icon={
              Sparkles
            }
          >
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={
                  addFacility
                }
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-black px-4 text-[9px] font-extrabold uppercase tracking-[0.08em] text-white"
              >
                <Plus
                  size={
                    13
                  }
                />

                {
                  t.addFacility
                }
              </button>
            </div>

            {form.facilities.length ===
            0 ? (
              <EmptyState
                label={
                  t.noFacilities
                }
              />
            ) : (
              <div className="space-y-3">
                {form.facilities.map(
                  (
                    facility,
                    index,
                  ) => (
                    <div
                      key={
                        index
                      }
                      className="rounded-[20px] border border-black/[0.07] bg-[#fafaf7] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black/35 ring-1 ring-black/[0.06]">
                          <Sparkles
                            size={
                              13
                            }
                          />
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            setForm(
                              (
                                current,
                              ) => ({
                                ...current,
                                facilities:
                                  current.facilities.filter(
                                    (
                                      _,
                                      facilityIndex,
                                    ) =>
                                      facilityIndex !==
                                      index,
                                  ),
                              }),
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-red-500 ring-1 ring-black/[0.06]"
                        >
                          <Trash2
                            size={
                              13
                            }
                          />
                        </button>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <TextField
                          label={
                            t.facilityName
                          }
                          value={
                            facility.name
                          }
                          onChange={(
                            value,
                          ) =>
                            setForm(
                              (
                                current,
                              ) => ({
                                ...current,
                                facilities:
                                  current.facilities.map(
                                    (
                                      item,
                                      itemIndex,
                                    ) =>
                                      itemIndex ===
                                      index
                                        ? {
                                            ...item,
                                            name:
                                              value,
                                          }
                                        : item,
                                  ),
                              }),
                            )
                          }
                        />

                        <label className="block">
                          <span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.13em] text-black/30">
                            {
                              t.facilityIcon
                            }
                          </span>

                          <input
                            list="kaloo-facility-icons"
                            value={
                              facility.icon
                            }
                            onChange={(
                              event,
                            ) =>
                              setForm(
                                (
                                  current,
                                ) => ({
                                  ...current,
                                  facilities:
                                    current.facilities.map(
                                      (
                                        item,
                                        itemIndex,
                                      ) =>
                                        itemIndex ===
                                        index
                                          ? {
                                              ...item,
                                              icon:
                                                event.target.value,
                                            }
                                          : item,
                                    ),
                                }),
                              )
                            }
                            className="h-12 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-sm font-semibold outline-none focus:border-black/20"
                          />
                        </label>
                      </div>

                      <div className="mt-3">
                        <TextField
                          label={
                            t.facilityDescription
                          }
                          value={
                            facility.description
                          }
                          onChange={(
                            value,
                          ) =>
                            setForm(
                              (
                                current,
                              ) => ({
                                ...current,
                                facilities:
                                  current.facilities.map(
                                    (
                                      item,
                                      itemIndex,
                                    ) =>
                                      itemIndex ===
                                      index
                                        ? {
                                            ...item,
                                            description:
                                              value,
                                          }
                                        : item,
                                  ),
                              }),
                            )
                          }
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </Panel>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={
            onSave
          }
          disabled={
            saving ||
            loading
          }
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-black px-5 text-xs font-extrabold text-white disabled:opacity-50"
        >
          {saving ? (
            <Loader2
              size={
                14
              }
              className="animate-spin"
            />
          ) : (
            <Save
              size={
                14
              }
            />
          )}

          {saving
            ? t.saving
            : t.saveOutlet}
        </button>
      </div>

      <datalist id="kaloo-facility-icons">
        {FACILITY_ICONS.map(
          (
            icon,
          ) => (
            <option
              key={
                icon
              }
              value={
                icon
              }
            />
          ),
        )}
      </datalist>
    </section>
  );
}

function WorkspaceCard({
  active,
  icon:
    Icon,
  badge,
  title,
  description,
  onClick,
}: {
  active:
    boolean;
  icon:
    typeof Settings2;
  badge:
    string;
  title:
    string;
  description:
    string;
  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={[
        "group rounded-[26px] border p-5 text-left transition sm:p-6",
        active
          ? "border-black bg-black text-white shadow-[0_18px_45px_rgba(0,0,0,0.10)]"
          : "border-black/[0.07] bg-white text-black shadow-sm hover:-translate-y-0.5 hover:border-black/15",
      ].join(
        " ",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className={[
            "flex h-11 w-11 items-center justify-center rounded-2xl",
            active
              ? "bg-white/10 text-white"
              : "bg-[#f2f2ee] text-black/40",
          ].join(
            " ",
          )}
        >
          <Icon
            size={
              17
            }
          />
        </span>

        <span
          className={[
            "rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[0.12em]",
            active
              ? "bg-white/10 text-white/55"
              : "bg-[#f2f2ee] text-black/35",
          ].join(
            " ",
          )}
        >
          {
            badge
          }
        </span>
      </div>

      <h2 className="mt-6 text-xl font-semibold tracking-[-0.035em]">
        {
          title
        }
      </h2>

      <p
        className={[
          "mt-2 text-[10px] leading-5",
          active
            ? "text-white/40"
            : "text-black/40",
        ].join(
          " ",
        )}
      >
        {
          description
        }
      </p>
    </button>
  );
}

function Panel({
  title,
  description,
  icon:
    Icon,
  children,
}: {
  title:
    string;
  description:
    string;
  icon:
    typeof Settings2;
  children:
    React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-black/[0.07] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f2f2ee] text-black/40">
          <Icon
            size={
              16
            }
          />
        </span>

        <div>
          <h2 className="text-lg font-semibold tracking-[-0.025em]">
            {
              title
            }
          </h2>

          <p className="mt-1 text-[10px] leading-5 text-black/38">
            {
              description
            }
          </p>
        </div>
      </div>

      <div className="mt-5">
        {
          children
        }
      </div>
    </section>
  );
}

function BankSearchSelect({
  label,
  value,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  onChange,
}: {
  label:
    string;
  value:
    string;
  placeholder:
    string;
  searchPlaceholder:
    string;
  emptyLabel:
    string;
  onChange:
    (
      value:
        string,
    ) => void;
}) {
  const [
    open,
    setOpen,
  ] =
    useState(
      false,
    );

  const [
    search,
    setSearch,
  ] =
    useState(
      "",
    );

  const filtered =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        if (
          !query
        ) {
          return [
            ...BANK_OPTIONS,
          ];
        }

        return BANK_OPTIONS.filter(
          (
            bank,
          ) =>
            bank
              .toLowerCase()
              .includes(
                query,
              ),
        );
      },
      [
        search,
      ],
    );

  return (
    <div className="relative">
      <span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.13em] text-black/30">
        {
          label
        }
      </span>

      <button
        type="button"
        onClick={() => {
          setOpen(
            (
              current,
            ) =>
              !current,
          );

          setSearch(
            "",
          );
        }}
        className="flex h-12 w-full items-center justify-between gap-3 rounded-xl border border-black/[0.08] bg-[#fafaf7] px-3 text-left text-sm font-semibold outline-none transition hover:border-black/15"
      >
        <span
          className={
            value
              ? "truncate text-black"
              : "truncate text-black/25"
          }
        >
          {
            value ||
            placeholder
          }
        </span>

        <ChevronRight
          size={
            14
          }
          className={[
            "shrink-0 text-black/25 transition",
            open
              ? "rotate-90"
              : "",
          ].join(
            " ",
          )}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close bank picker"
            onClick={() =>
              setOpen(
                false,
              )
            }
            className="fixed inset-0 z-30 cursor-default"
          />

          <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-[18px] border border-black/[0.08] bg-white shadow-[0_18px_55px_rgba(0,0,0,0.14)]">
            <div className="border-b border-black/[0.06] p-2.5">
              <input
                autoFocus
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
                  searchPlaceholder
                }
                className="h-10 w-full rounded-xl bg-[#f4f4f0] px-3 text-xs font-semibold outline-none placeholder:text-black/25"
              />
            </div>

            <div className="max-h-64 overflow-y-auto p-1.5">
              {filtered.length >
              0 ? (
                filtered.map(
                  (
                    bank,
                  ) => (
                    <button
                      key={
                        bank
                      }
                      type="button"
                      onClick={() => {
                        onChange(
                          bank,
                        );

                        setOpen(
                          false,
                        );

                        setSearch(
                          "",
                        );
                      }}
                      className={[
                        "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition hover:bg-[#f4f4f0]",
                        value ===
                        bank
                          ? "bg-[#f2f2ee]"
                          : "",
                      ].join(
                        " ",
                      )}
                    >
                      <span className="truncate">
                        {
                          bank
                        }
                      </span>

                      {value ===
                        bank && (
                        <Check
                          size={
                            12
                          }
                          className="shrink-0"
                        />
                      )}
                    </button>
                  ),
                )
              ) : (
                <div className="px-3 py-6 text-center text-[10px] font-bold text-black/30">
                  {
                    emptyLabel
                  }
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  disabled =
    false,
  mono =
    false,
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
  disabled?:
    boolean;
  mono?:
    boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.13em] text-black/30">
        {
          label
        }
      </span>

      <input
        value={
          value
        }
        disabled={
          disabled
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        className={[
          "h-12 w-full rounded-xl border border-black/[0.08] bg-[#fafaf7] px-3 text-sm font-semibold outline-none focus:border-black/20 disabled:cursor-not-allowed disabled:bg-black/[0.04] disabled:text-black/35",
          mono
            ? "font-mono"
            : "",
        ].join(
          " ",
        )}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
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
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.13em] text-black/30">
        {
          label
        }
      </span>

      <textarea
        rows={
          4
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
        className="w-full resize-none rounded-xl border border-black/[0.08] bg-[#fafaf7] px-3 py-3 text-sm font-semibold outline-none focus:border-black/20"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
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
  suffix:
    string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.13em] text-black/30">
        {
          label
        }
      </span>

      <div className="relative">
        <input
          type="number"
          min="0"
          step="0.01"
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
          className="h-12 w-full rounded-xl border border-black/[0.08] bg-[#fafaf7] px-3 pr-10 text-sm font-extrabold outline-none focus:border-black/20"
        />

        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-black/25">
          {
            suffix
          }
        </span>
      </div>
    </label>
  );
}

function Toggle({
  checked,
}: {
  checked:
    boolean;
}) {
  return (
    <span
      className={[
        "relative h-7 w-12 shrink-0 rounded-full",
        checked
          ? "bg-black"
          : "bg-black/15",
      ].join(
        " ",
      )}
    >
      <span
        className={[
          "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition",
          checked
            ? "left-6"
            : "left-1",
        ].join(
          " ",
        )}
      />
    </span>
  );
}

function OverviewTile({
  label,
  value,
  good,
}: {
  label:
    string;
  value:
    string;
  good:
    boolean;
}) {
  return (
    <div className="rounded-[16px] bg-white/[0.07] p-3">
      <div className="flex items-center gap-1.5 text-[8px] font-extrabold uppercase tracking-[0.1em] text-white/30">
        {good ? (
          <Check
            size={
              10
            }
          />
        ) : (
          <AlertCircle
            size={
              10
            }
          />
        )}

        {
          label
        }
      </div>

      <p className="mt-2 truncate text-xs font-extrabold text-white/75">
        {
          value
        }
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label:
    string;
  value:
    string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[15px] bg-[#f6f6f2] px-3 py-3">
      <span className="text-[10px] font-bold text-black/40">
        {
          label
        }
      </span>

      <span className="max-w-[55%] truncate text-right text-[10px] font-extrabold">
        {
          value
        }
      </span>
    </div>
  );
}

function PreviewRow({
  label,
  value,
  strong =
    false,
  danger =
    false,
}: {
  label:
    string;
  value:
    string;
  strong?:
    boolean;
  danger?:
    boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span
        className={
          strong
            ? "font-extrabold text-white"
            : danger
              ? "text-red-300"
              : "text-white/45"
        }
      >
        {
          label
        }
      </span>

      <span
        className={
          strong
            ? "font-extrabold text-white"
            : danger
              ? "font-extrabold text-red-300"
              : "font-bold text-white/65"
        }
      >
        {
          value
        }
      </span>
    </div>
  );
}

function EmptyState({
  label,
}: {
  label:
    string;
}) {
  return (
    <div className="flex min-h-[140px] items-center justify-center rounded-[18px] border border-dashed border-black/[0.08] bg-[#fafaf7] px-6 text-center text-[10px] font-bold text-black/30">
      {
        label
      }
    </div>
  );
}

function ReadOnly({
  label,
  value,
}: {
  label:
    string;
  value:
    string;
}) {
  return (
    <div className="rounded-[18px] bg-[#f6f6f2] p-4">
      <p className="text-[8px] font-extrabold uppercase tracking-[0.1em] text-black/25">
        {
          label
        }
      </p>

      <p className="mt-2 break-words text-xs font-extrabold text-black/60">
        {
          value
        }
      </p>
    </div>
  );
}

function PayoutView({
  slug,
  data,
  loading,
  locale,
  onWithdraw,
}: {
  slug:
    string;
  data:
    PayoutData | null;
  loading:
    boolean;
  locale:
    Locale;
  onWithdraw:
    () => void;
}) {
  const t =
    copy[
      locale
    ];

  const p =
    locale ===
    "id"
      ? {
          detailTitle:
            "Detail & Riwayat Pencairan",
          detailDescription:
            "Audit seluruh QRIS lunas: yang belum dicairkan, sedang diproses, sudah approved, maupun rejected.",
          downloadExcel:
            "Unduh Excel",
          downloadCsv:
            "Unduh CSV",
          loadingDetail:
            "Memuat detail pencairan...",
          detailError:
            "Gagal memuat detail pencairan.",
          emptyDetail:
            "Belum ada transaksi QRIS lunas.",
          all:
            "Semua",
          eligible:
            "Belum dicairkan",
          pending:
            "Pending",
          approved:
            "Sudah dicairkan",
          rejected:
            "Rejected",
          cashouted:
            "Cashout legacy",
          orders:
            "Order",
          itemQty:
            "Qty item",
          itemLines:
            "Baris item",
          gross:
            "Gross QRIS",
          fee:
            "Platform fee",
          payout:
            "Nilai payout",
          order:
            "Order",
          outlet:
            "Outlet",
          customer:
            "Customer",
          paidAt:
            "Lunas pada",
          transaction:
            "Transaction ID",
          issuer:
            "Issuer",
          items:
            "Item",
          calculation:
            "Perhitungan",
          subtotal:
            "Subtotal menu",
          discount:
            "Diskon",
          service:
            "Service",
          tax:
            "Pajak",
          grossTransaction:
            "Gross transaksi",
          platformFee:
            "Platform fee",
          netPayout:
            "Nilai payout",
          formulaTitle:
            "Formula pencairan",
          formula:
            "Nilai payout per order = Gross transaksi − Platform fee",
          snapshotInfo:
            "Perhitungan memakai snapshot yang tersimpan pada order. Harga menu saat ini tidak dipakai.",
          quantity:
            "Qty",
          unitPrice:
            "Harga/unit",
          lineTotal:
            "Total item",
          addons:
            "Add-on",
          noAddon:
            "Tanpa add-on",
          generated:
            "Data dibuat",
          cashoutId:
            "Cashout ID",
          cashoutStatus:
            "Status cashout",
          cashoutTime:
            "Waktu cashout",
          batchAmount:
            "Nominal batch",
          batchNote:
            "Nominal batch berasal dari tabel cashouts dan dapat mencakup beberapa order. Karena itu nominal batch tidak dijumlahkan ulang per order.",
          excelError:
            "Gagal membuat file Excel. Pastikan package xlsx sudah terpasang.",
          csvError:
            "Gagal membuat file CSV.",
          exportSuccess:
            "File berhasil dibuat.",
          exportSummary:
            "Ringkasan",
          exportOrders:
            "Payout Orders",
          exportItems:
            "Order Items",
          exportBatches:
            "Cashout Batches",
          noOrdersInFilter:
            "Tidak ada transaksi pada filter ini.",
        }
      : {
          detailTitle:
            "Payout Detail & History",
          detailDescription:
            "Audit all paid QRIS transactions: eligible, pending, approved, and rejected payouts.",
          downloadExcel:
            "Download Excel",
          downloadCsv:
            "Download CSV",
          loadingDetail:
            "Loading payout details...",
          detailError:
            "Failed to load payout details.",
          emptyDetail:
            "No paid QRIS transactions found.",
          all:
            "All",
          eligible:
            "Not paid out",
          pending:
            "Pending",
          approved:
            "Paid out",
          rejected:
            "Rejected",
          cashouted:
            "Legacy cashout",
          orders:
            "Orders",
          itemQty:
            "Item qty",
          itemLines:
            "Item lines",
          gross:
            "QRIS gross",
          fee:
            "Platform fee",
          payout:
            "Payout value",
          order:
            "Order",
          outlet:
            "Outlet",
          customer:
            "Customer",
          paidAt:
            "Paid at",
          transaction:
            "Transaction ID",
          issuer:
            "Issuer",
          items:
            "Items",
          calculation:
            "Calculation",
          subtotal:
            "Menu subtotal",
          discount:
            "Discount",
          service:
            "Service",
          tax:
            "Tax",
          grossTransaction:
            "Transaction gross",
          platformFee:
            "Platform fee",
          netPayout:
            "Payout value",
          formulaTitle:
            "Payout formula",
          formula:
            "Order payout value = Transaction gross − Platform fee",
          snapshotInfo:
            "Calculations use the stored order snapshots. Current menu prices are not used.",
          quantity:
            "Qty",
          unitPrice:
            "Unit price",
          lineTotal:
            "Item total",
          addons:
            "Add-ons",
          noAddon:
            "No add-ons",
          generated:
            "Generated",
          cashoutId:
            "Cashout ID",
          cashoutStatus:
            "Cashout status",
          cashoutTime:
            "Cashout time",
          batchAmount:
            "Batch amount",
          batchNote:
            "The batch amount comes from the cashouts table and may include multiple orders, so it must not be summed repeatedly per order.",
          excelError:
            "Failed to create Excel file. Make sure the xlsx package is installed.",
          csvError:
            "Failed to create CSV file.",
          exportSuccess:
            "File created successfully.",
          exportSummary:
            "Summary",
          exportOrders:
            "Payout Orders",
          exportItems:
            "Order Items",
          exportBatches:
            "Cashout Batches",
          noOrdersInFilter:
            "No transactions in this filter.",
        };

  const [
    detail,
    setDetail,
  ] =
    useState<PayoutDetailData | null>(
      null,
    );

  const [
    detailLoading,
    setDetailLoading,
  ] =
    useState(
      true,
    );

  const [
    detailError,
    setDetailError,
  ] =
    useState(
      "",
    );

  const [
    filter,
    setFilter,
  ] =
    useState<
      "all" |
      PayoutState
    >(
      "all",
    );

  const [
    expandedOrders,
    setExpandedOrders,
  ] =
    useState<Set<number>>(
      new Set(),
    );

  const loadDetail =
    useCallback(
      async () => {
        if (
          !slug
        ) {
          return;
        }

        setDetailLoading(
          true,
        );

        setDetailError(
          "",
        );

        try {
          const response =
            await fetch(
              `/api/pos/payout/details?slug=${encodeURIComponent(
                slug,
              )}`,
              {
                cache:
                  "no-store",
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
                p.detailError,
            );
          }

          setDetail(
            result.data ??
              null,
          );
        } catch (
          error
        ) {
          console.error(
            "[PAYOUT_DETAILS_UI_ERROR]",
            error,
          );

          setDetail(
            null,
          );

          setDetailError(
            error instanceof
              Error
              ? error.message
              : p.detailError,
          );
        } finally {
          setDetailLoading(
            false,
          );
        }
      },
      [
        p.detailError,
        slug,
      ],
    );

  useEffect(() => {
    void loadDetail();
  }, [
    loadDetail,
    data?.totalEligibleQris,
  ]);

  const visibleOrders =
    useMemo(
      () => {
        if (
          !detail
        ) {
          return [];
        }

        if (
          filter ===
          "all"
        ) {
          return detail.orders;
        }

        return detail.orders.filter(
          (
            order,
          ) =>
            order.payoutState ===
            filter,
        );
      },
      [
        detail,
        filter,
      ],
    );

  const visibleSummary =
    useMemo(
      () =>
        visibleOrders.reduce(
          (
            current,
            order,
          ) => ({
            orderCount:
              current.orderCount +
              1,

            itemLineCount:
              current.itemLineCount +
              order.itemLineCount,

            itemQuantity:
              current.itemQuantity +
              order.itemQuantity,

            subtotal:
              current.subtotal +
              order.calculation.subtotal,

            discount:
              current.discount +
              order.calculation.discount,

            service:
              current.service +
              order.calculation.service,

            tax:
              current.tax +
              order.calculation.tax,

            gross:
              current.gross +
              order.calculation.gross,

            platformFee:
              current.platformFee +
              order.calculation.platformFee,

            netPayout:
              current.netPayout +
              order.calculation.netPayout,
          }),
          {
            orderCount:
              0,

            itemLineCount:
              0,

            itemQuantity:
              0,

            subtotal:
              0,

            discount:
              0,

            service:
              0,

            tax:
              0,

            gross:
              0,

            platformFee:
              0,

            netPayout:
              0,
          },
        ),
      [
        visibleOrders,
      ],
    );

  const visibleBatches =
    useMemo(
      () => {
        if (
          !detail
        ) {
          return [];
        }

        const ids =
          new Set(
            visibleOrders
              .map(
                (
                  order,
                ) =>
                  order.cashout.id,
              )
              .filter(
                (
                  id,
                ): id is number =>
                  id !==
                  null,
              ),
          );

        return detail.cashoutBatches.filter(
          (
            batch,
          ) =>
            ids.has(
              batch.id,
            ),
        );
      },
      [
        detail,
        visibleOrders,
      ],
    );

  const filterItems = [
    {
      id:
        "all" as const,
      label:
        p.all,
      count:
        detail?.summary.orderCount ??
        0,
    },
    {
      id:
        "eligible" as const,
      label:
        p.eligible,
      count:
        detail?.statusSummary?.eligible ??
        0,
    },
    {
      id:
        "pending" as const,
      label:
        p.pending,
      count:
        detail?.statusSummary?.pending ??
        0,
    },
    {
      id:
        "approved" as const,
      label:
        p.approved,
      count:
        detail?.statusSummary?.approved ??
        0,
    },
    {
      id:
        "rejected" as const,
      label:
        p.rejected,
      count:
        detail?.statusSummary?.rejected ??
        0,
    },
    {
      id:
        "cashouted" as const,
      label:
        p.cashouted,
      count:
        detail?.statusSummary?.cashouted ??
        0,
    },
  ];

  const toggleOrder =
    (
      orderId:
        number,
    ) => {
      setExpandedOrders(
        (
          current,
        ) => {
          const next =
            new Set(
              current,
            );

          if (
            next.has(
              orderId,
            )
          ) {
            next.delete(
              orderId,
            );
          } else {
            next.add(
              orderId,
            );
          }

          return next;
        },
      );
    };

  const formatDateTime =
    (
      value:
        string |
        Date |
        null |
        undefined,
    ) => {
      if (
        !value
      ) {
        return "—";
      }

      const date =
        value instanceof
          Date
          ? value
          : new Date(
              value,
            );

      if (
        Number.isNaN(
          date.getTime(),
        )
      ) {
        return "—";
      }

      return date.toLocaleString(
        locale ===
          "id"
          ? "id-ID"
          : "en-US",
        {
          dateStyle:
            "medium",
          timeStyle:
            "short",
        },
      );
    };

  const statusLabel =
    (
      state:
        PayoutState,
    ) => {
      return {
        eligible:
          p.eligible,
        pending:
          p.pending,
        approved:
          p.approved,
        rejected:
          p.rejected,
        cashouted:
          p.cashouted,
      }[
        state
      ];
    };

  const addonText =
    (
      addons:
        PayoutDetailAddon[],
    ) => {
      if (
        !addons.length
      ) {
        return p.noAddon;
      }

      return addons
        .map(
          (
            addon,
          ) => {
            const note =
              addon.customerNote
                ? ` (${addon.customerNote})`
                : "";

            return `${addon.name}${note}`;
          },
        )
        .join(
          ", ",
        );
    };

  const makeOrderRows =
    () =>
      visibleOrders.map(
        (
          order,
        ) => ({
          "Order Code":
            order.orderCode,
          "Payout Status":
            statusLabel(
              order.payoutState,
            ),
          "Cashout ID":
            order.cashout.id ??
            "",
          "Cashout Status":
            order.cashout.status ??
            "",
          "Cashout Time":
            formatDateTime(
              order.cashout.timeCashout,
            ),
          "Cashout Batch Amount":
            order.cashout.amount ??
            "",
          Outlet:
            order.branchName,
          Customer:
            order.customerName,
          "Paid At":
            formatDateTime(
              order.paidAt,
            ),
          "Transaction ID":
            order.transactionId ??
            "",
          Issuer:
            order.issuer ??
            "",
          "Item Lines":
            order.itemLineCount,
          "Item Quantity":
            order.itemQuantity,
          Subtotal:
            order.calculation.subtotal,
          Discount:
            order.calculation.discount,
          Service:
            order.calculation.service,
          Tax:
            order.calculation.tax,
          Gross:
            order.calculation.gross,
          "Platform Fee Rate (%)":
            order.calculation.platformFeeRate,
          "Platform Fee":
            order.calculation.platformFee,
          "Net Payout":
            order.calculation.netPayout,
        }),
      );

  const makeItemRows =
    () => {
      const rows: Array<
        Record<
          string,
          string |
          number
        >
      > =
        [];

      for (
        const order of
        visibleOrders
      ) {
        const base = {
          "Order Code":
            order.orderCode,
          "Payout Status":
            statusLabel(
              order.payoutState,
            ),
          "Cashout ID":
            order.cashout.id ??
            "",
          "Cashout Status":
            order.cashout.status ??
            "",
          "Cashout Time":
            formatDateTime(
              order.cashout.timeCashout,
            ),
          Outlet:
            order.branchName,
          Customer:
            order.customerName,
          "Paid At":
            formatDateTime(
              order.paidAt,
            ),
        };

        if (
          order.items.length ===
          0
        ) {
          rows.push({
            ...base,
            Product:
              "",
            Quantity:
              0,
            "Unit Price":
              0,
            "Line Total":
              0,
            "Add-ons":
              "",
            "Order Gross":
              order.calculation.gross,
            "Platform Fee":
              order.calculation.platformFee,
            "Net Payout":
              order.calculation.netPayout,
          });

          continue;
        }

        for (
          const item of
          order.items
        ) {
          rows.push({
            ...base,
            Product:
              item.name,
            Quantity:
              item.quantity,
            "Unit Price":
              item.unitPrice,
            "Line Total":
              item.lineTotal,
            "Add-ons":
              addonText(
                item.addons,
              ),
            "Order Gross":
              order.calculation.gross,
            "Platform Fee":
              order.calculation.platformFee,
            "Net Payout":
              order.calculation.netPayout,
          });
        }
      }

      return rows;
    };

  const makeBatchRows =
    () =>
      visibleBatches.map(
        (
          batch,
        ) => ({
          "Cashout ID":
            batch.id,
          Status:
            batch.status ??
            "",
          "Batch Amount":
            batch.amount ??
            "",
          "Cashout Time":
            formatDateTime(
              batch.timeCashout,
            ),
          "Created At":
            formatDateTime(
              batch.createdAt,
            ),
          "Updated At":
            formatDateTime(
              batch.updatedAt,
            ),
          "Order Count":
            batch.orderCount,
          "Calculated Net Orders":
            batch.calculatedNetOrders,
          "Order Codes":
            batch.orderCodes.join(
              ", ",
            ),
        }),
      );

  const exportCsv =
    () => {
      if (
        visibleOrders.length ===
        0
      ) {
        return;
      }

      try {
        const rows =
          makeItemRows();

        const headers =
          Object.keys(
            rows[
              0
            ],
          );

        const escape =
          (
            value:
              unknown,
          ) =>
            `"${String(
              value ??
                "",
            ).replace(
              /"/g,
              '""',
            )}"`;

        const csv =
          [
            headers
              .map(
                escape,
              )
              .join(
                ",",
              ),

            ...rows.map(
              (
                row,
              ) =>
                headers
                  .map(
                    (
                      header,
                    ) =>
                      escape(
                        row[
                          header
                        ],
                      ),
                  )
                  .join(
                    ",",
                  ),
            ),
          ].join(
            "\r\n",
          );

        const blob =
          new Blob(
            [
              "\ufeff",
              csv,
            ],
            {
              type:
                "text/csv;charset=utf-8;",
            },
          );

        const url =
          URL.createObjectURL(
            blob,
          );

        const link =
          document.createElement(
            "a",
          );

        const date =
          new Date()
            .toISOString()
            .slice(
              0,
              10,
            );

        link.href =
          url;

        link.download =
          `KALOO_Payout_${filter}_${date}.csv`;

        document.body.appendChild(
          link,
        );

        link.click();
        link.remove();

        URL.revokeObjectURL(
          url,
        );

        Toast.fire({
          icon:
            "success",
          title:
            p.exportSuccess,
        });
      } catch (
        error
      ) {
        console.error(
          "[PAYOUT_CSV_EXPORT_ERROR]",
          error,
        );

        Toast.fire({
          icon:
            "error",
          title:
            p.csvError,
        });
      }
    };

  const exportExcel =
    async () => {
      if (
        visibleOrders.length ===
        0
      ) {
        return;
      }

      try {
        const XLSX =
          await import(
            "xlsx"
          );

        const workbook =
          XLSX.utils.book_new();

        const summaryRows = [
          [
            "Metric",
            "Value",
          ],
          [
            p.generated,
            formatDateTime(
              detail?.generatedAt,
            ),
          ],
          [
            "Filter",
            filter ===
              "all"
              ? p.all
              : statusLabel(
                  filter,
                ),
          ],
          [
            p.orders,
            visibleSummary.orderCount,
          ],
          [
            p.itemLines,
            visibleSummary.itemLineCount,
          ],
          [
            p.itemQty,
            visibleSummary.itemQuantity,
          ],
          [
            p.subtotal,
            visibleSummary.subtotal,
          ],
          [
            p.discount,
            visibleSummary.discount,
          ],
          [
            p.service,
            visibleSummary.service,
          ],
          [
            p.tax,
            visibleSummary.tax,
          ],
          [
            p.grossTransaction,
            visibleSummary.gross,
          ],
          [
            p.platformFee,
            visibleSummary.platformFee,
          ],
          [
            p.netPayout,
            visibleSummary.netPayout,
          ],
          [],
          [
            p.formulaTitle,
            p.formula,
          ],
          [
            p.batchNote,
            "",
          ],
        ];

        const summarySheet =
          XLSX.utils.aoa_to_sheet(
            summaryRows,
          );

        summarySheet[
          "!cols"
        ] = [
          {
            wch:
              32,
          },
          {
            wch:
              42,
          },
        ];

        const orderSheet =
          XLSX.utils.json_to_sheet(
            makeOrderRows(),
          );

        const itemSheet =
          XLSX.utils.json_to_sheet(
            makeItemRows(),
          );

        const batchSheet =
          XLSX.utils.json_to_sheet(
            makeBatchRows(),
          );

        orderSheet[
          "!cols"
        ] = Array.from(
          {
            length:
              21,
          },
          () => ({
            wch:
              18,
          }),
        );

        itemSheet[
          "!cols"
        ] = Array.from(
          {
            length:
              16,
          },
          () => ({
            wch:
              20,
          }),
        );

        batchSheet[
          "!cols"
        ] = Array.from(
          {
            length:
              9,
          },
          () => ({
            wch:
              22,
          }),
        );

        XLSX.utils.book_append_sheet(
          workbook,
          summarySheet,
          p.exportSummary.slice(
            0,
            31,
          ),
        );

        XLSX.utils.book_append_sheet(
          workbook,
          orderSheet,
          p.exportOrders.slice(
            0,
            31,
          ),
        );

        XLSX.utils.book_append_sheet(
          workbook,
          itemSheet,
          p.exportItems.slice(
            0,
            31,
          ),
        );

        XLSX.utils.book_append_sheet(
          workbook,
          batchSheet,
          p.exportBatches.slice(
            0,
            31,
          ),
        );

        const date =
          new Date()
            .toISOString()
            .slice(
              0,
              10,
            );

        XLSX.writeFile(
          workbook,
          `KALOO_Payout_${filter}_${date}.xlsx`,
        );

        Toast.fire({
          icon:
            "success",
          title:
            p.exportSuccess,
        });
      } catch (
        error
      ) {
        console.error(
          "[PAYOUT_EXCEL_EXPORT_ERROR]",
          error,
        );

        Toast.fire({
          icon:
            "error",
          title:
            p.excelError,
        });
      }
    };

  if (
    loading
  ) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-black/[0.07] bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-black/35" />
      </div>
    );
  }

  if (
    !data
  ) {
    return (
      <EmptyState
        label={
          t.payoutError
        }
      />
    );
  }

  const periods = [
    [
      t.today,
      data.breakdown?.today,
    ],
    [
      t.week,
      data.breakdown?.week,
    ],
    [
      t.month,
      data.breakdown?.month,
    ],
    [
      t.year,
      data.breakdown?.year,
    ],
  ] as const;

  return (
    <div className="space-y-4">
      {/* CURRENT ELIGIBLE PAYOUT */}
      <section className="rounded-[30px] bg-black p-6 text-white">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-white/30">
              {
                t.payoutReady
              }
            </p>

            <p className="mt-3 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
              {
                rupiah(
                  data.totalEligibleQris,
                )
              }
            </p>

            <p className="mt-3 max-w-2xl text-[10px] leading-5 text-white/40">
              {
                data.withdrawalMessage ??
                ""
              }
            </p>
          </div>

          <button
            type="button"
            disabled={
              !data.canWithdraw
            }
            onClick={
              onWithdraw
            }
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-xs font-extrabold text-black disabled:opacity-35"
          >
            <Wallet
              size={
                14
              }
            />

            {
              t.withdraw
            }
          </button>
        </div>

        <div className="mt-7 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <DarkStat
            icon={
              QrCode
            }
            label={
              t.payoutReady
            }
            value={
              rupiah(
                data.totalEligibleQris,
              )
            }
          />

          <DarkStat
            icon={
              CreditCard
            }
            label={
              t.taxReturned
            }
            value={
              rupiah(
                data.totalTax,
              )
            }
          />

          <DarkStat
            icon={
              CircleDollarSign
            }
            label={
              t.platformDeduction
            }
            value={`- ${rupiah(
              data.totalPlatformFee,
            )}`}
          />

          <DarkStat
            icon={
              Banknote
            }
            label={
              t.cashRecorded
            }
            value={
              rupiah(
                data.totalCash,
              )
            }
          />
        </div>
      </section>

      {/* PERIOD BREAKDOWN */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {periods.map(
          (
            [
              label,
              period,
            ],
          ) => (
            <div
              key={
                label
              }
              className="rounded-[22px] border border-black/[0.07] bg-white p-4 shadow-sm"
            >
              <p className="text-[8px] font-extrabold uppercase tracking-[0.12em] text-black/30">
                {
                  label
                }
              </p>

              <p className="mt-3 text-xl font-semibold">
                {
                  rupiah(
                    period?.net,
                  )
                }
              </p>

              <div className="mt-3 space-y-1.5 border-t border-black/[0.05] pt-3 text-[9px] text-black/40">
                <div className="flex justify-between gap-3">
                  <span>
                    {
                      t.gross
                    }
                  </span>

                  <strong>
                    {
                      rupiah(
                        period?.gross,
                      )
                    }
                  </strong>
                </div>

                <div className="flex justify-between gap-3">
                  <span>
                    {
                      t.orders
                    }
                  </span>

                  <strong>
                    {
                      numberValue(
                        period?.ordersCount ??
                          period?.totalOrders,
                      )
                    }
                  </strong>
                </div>
              </div>
            </div>
          ),
        )}
      </section>

      {/* HISTORY / AUDIT */}
      <section className="overflow-hidden rounded-[28px] border border-black/[0.07] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-black/[0.06] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f2f2ee] text-black/40">
              <ReceiptText
                size={
                  16
                }
              />
            </span>

            <div>
              <h2 className="text-lg font-semibold tracking-[-0.025em]">
                {
                  p.detailTitle
                }
              </h2>

              <p className="mt-1 max-w-2xl text-[10px] leading-5 text-black/38">
                {
                  p.detailDescription
                }
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                visibleOrders.length ===
                0
              }
              onClick={() =>
                void exportExcel()
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-black px-3.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              <FileSpreadsheet
                size={
                  13
                }
              />

              {
                p.downloadExcel
              }
            </button>

            <button
              type="button"
              disabled={
                visibleOrders.length ===
                0
              }
              onClick={
                exportCsv
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-black/[0.08] bg-white px-3.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-black/55 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <FileText
                size={
                  13
                }
              />

              {
                p.downloadCsv
              }
            </button>
          </div>
        </div>

        {detailLoading ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-black/30" />

            <p className="mt-3 text-[10px] font-bold text-black/30">
              {
                p.loadingDetail
              }
            </p>
          </div>
        ) : detailError ? (
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-3 rounded-[18px] border border-red-100 bg-red-50 p-4 text-red-700">
              <AlertCircle
                size={
                  14
                }
                className="mt-0.5 shrink-0"
              />

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold">
                  {
                    detailError
                  }
                </p>

                <button
                  type="button"
                  onClick={() =>
                    void loadDetail()
                  }
                  className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-[8px] font-extrabold uppercase tracking-[0.08em] ring-1 ring-red-200"
                >
                  <RefreshCw
                    size={
                      10
                    }
                  />

                  {
                    t.refresh
                  }
                </button>
              </div>
            </div>
          </div>
        ) : !detail ||
          detail.summary.orderCount ===
            0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              label={
                p.emptyDetail
              }
            />
          </div>
        ) : (
          <>
            {/* STATUS FILTERS */}
            <div className="flex gap-2 overflow-x-auto border-b border-black/[0.06] bg-[#fafaf7] p-3 sm:px-5">
              {filterItems.map(
                (
                  item,
                ) => (
                  <button
                    key={
                      item.id
                    }
                    type="button"
                    onClick={() =>
                      setFilter(
                        item.id,
                      )
                    }
                    className={[
                      "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-[8px] font-extrabold uppercase tracking-[0.07em] transition",
                      filter ===
                      item.id
                        ? "border-black bg-black text-white"
                        : "border-black/[0.07] bg-white text-black/40",
                    ].join(
                      " ",
                    )}
                  >
                    {
                      item.label
                    }

                    <span
                      className={[
                        "rounded-full px-1.5 py-0.5 text-[7px]",
                        filter ===
                        item.id
                          ? "bg-white/15 text-white"
                          : "bg-[#f2f2ee] text-black/40",
                      ].join(
                        " ",
                      )}
                    >
                      {
                        item.count
                      }
                    </span>
                  </button>
                ),
              )}
            </div>

            {visibleOrders.length ===
            0 ? (
              <div className="p-5 sm:p-6">
                <EmptyState
                  label={
                    p.noOrdersInFilter
                  }
                />
              </div>
            ) : (
              <>
                {/* FILTERED SUMMARY */}
                <div className="grid gap-2 border-b border-black/[0.06] bg-[#fafaf7] p-4 sm:grid-cols-2 lg:grid-cols-5 sm:p-5">
                  <AuditMetric
                    label={
                      p.orders
                    }
                    value={String(
                      visibleSummary.orderCount,
                    )}
                  />

                  <AuditMetric
                    label={
                      p.itemQty
                    }
                    value={String(
                      visibleSummary.itemQuantity,
                    )}
                  />

                  <AuditMetric
                    label={
                      p.gross
                    }
                    value={
                      rupiah(
                        visibleSummary.gross,
                      )
                    }
                  />

                  <AuditMetric
                    label={
                      p.fee
                    }
                    value={`- ${rupiah(
                      visibleSummary.platformFee,
                    )}`}
                  />

                  <AuditMetric
                    label={
                      p.payout
                    }
                    value={
                      rupiah(
                        visibleSummary.netPayout,
                      )
                    }
                    strong
                  />
                </div>

                <div className="p-4 sm:p-5">
                  <div className="mb-4 flex items-start gap-2 rounded-[16px] bg-[#f2f2ee] p-3">
                    <CircleDollarSign
                      size={
                        13
                      }
                      className="mt-0.5 shrink-0 text-black/35"
                    />

                    <div>
                      <p className="text-[9px] font-extrabold">
                        {
                          p.formula
                        }
                      </p>

                      <p className="mt-1 text-[8px] leading-4 text-black/35">
                        {
                          p.snapshotInfo
                        }
                      </p>

                      <p className="mt-1 text-[8px] leading-4 text-black/35">
                        {
                          p.batchNote
                        }
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {visibleOrders.map(
                      (
                        order,
                      ) => {
                        const expanded =
                          expandedOrders.has(
                            order.id,
                          );

                        return (
                          <article
                            key={
                              order.id
                            }
                            className="overflow-hidden rounded-[20px] border border-black/[0.07]"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                toggleOrder(
                                  order.id,
                                )
                              }
                              className="grid w-full gap-4 bg-white p-4 text-left transition hover:bg-[#fafaf7] lg:grid-cols-[minmax(0,1.35fr)_120px_105px_120px_120px_auto] lg:items-center"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-xs font-extrabold">
                                    {
                                      order.orderCode
                                    }
                                  </span>

                                  <PayoutStateBadge
                                    state={
                                      order.payoutState
                                    }
                                    label={
                                      statusLabel(
                                        order.payoutState,
                                      )
                                    }
                                  />
                                </div>

                                <p className="mt-1 truncate text-[9px] text-black/35">
                                  {
                                    order.branchName
                                  }{" "}
                                  ·{" "}
                                  {
                                    order.customerName
                                  }{" "}
                                  ·{" "}
                                  {
                                    formatDateTime(
                                      order.paidAt,
                                    )
                                  }
                                </p>
                              </div>

                              <div>
                                <p className="text-[7px] font-extrabold uppercase tracking-[0.1em] text-black/25">
                                  {
                                    p.items
                                  }
                                </p>

                                <p className="mt-1 text-[10px] font-extrabold">
                                  {
                                    order.itemQuantity
                                  }{" "}
                                  qty ·{" "}
                                  {
                                    order.itemLineCount
                                  }
                                </p>
                              </div>

                              <AmountCell
                                label={
                                  p.gross
                                }
                                value={
                                  rupiah(
                                    order.calculation.gross,
                                  )
                                }
                              />

                              <AmountCell
                                label={
                                  p.fee
                                }
                                value={`- ${rupiah(
                                  order.calculation.platformFee,
                                )}`}
                                danger
                              />

                              <AmountCell
                                label={
                                  p.payout
                                }
                                value={
                                  rupiah(
                                    order.calculation.netPayout,
                                  )
                                }
                                strong
                              />

                              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2f2ee] text-black/40 lg:justify-self-end">
                                <ChevronDown
                                  size={
                                    13
                                  }
                                  className={[
                                    "transition",
                                    expanded
                                      ? "rotate-180"
                                      : "",
                                  ].join(
                                    " ",
                                  )}
                                />
                              </span>
                            </button>

                            {expanded && (
                              <div className="border-t border-black/[0.06] bg-[#fafaf7] p-4">
                                <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                  <MetaInfo
                                    label={
                                      p.cashoutId
                                    }
                                    value={
                                      order.cashout.id ===
                                      null
                                        ? "—"
                                        : `#${order.cashout.id}`
                                    }
                                  />

                                  <MetaInfo
                                    label={
                                      p.cashoutStatus
                                    }
                                    value={
                                      order.cashout.status ??
                                      statusLabel(
                                        order.payoutState,
                                      )
                                    }
                                  />

                                  <MetaInfo
                                    label={
                                      p.cashoutTime
                                    }
                                    value={
                                      formatDateTime(
                                        order.cashout.timeCashout,
                                      )
                                    }
                                  />

                                  <MetaInfo
                                    label={
                                      p.batchAmount
                                    }
                                    value={
                                      order.cashout.amount ===
                                      null
                                        ? "—"
                                        : rupiah(
                                            order.cashout.amount,
                                          )
                                    }
                                  />
                                </div>

                                <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
                                  <div>
                                    <div className="mb-3 flex items-center gap-2">
                                      <Package
                                        size={
                                          13
                                        }
                                        className="text-black/30"
                                      />

                                      <p className="text-[8px] font-extrabold uppercase tracking-[0.12em] text-black/30">
                                        {
                                          p.items
                                        }
                                      </p>
                                    </div>

                                    <div className="space-y-2">
                                      {order.items.map(
                                        (
                                          item,
                                        ) => (
                                          <div
                                            key={
                                              item.id
                                            }
                                            className="rounded-[16px] border border-black/[0.06] bg-white p-3"
                                          >
                                            <div className="grid gap-3 sm:grid-cols-[1fr_55px_110px_115px] sm:items-center">
                                              <div className="min-w-0">
                                                <p className="text-[10px] font-extrabold">
                                                  {
                                                    item.name
                                                  }
                                                </p>

                                                <p className="mt-1 text-[8px] leading-4 text-black/35">
                                                  <span className="font-bold">
                                                    {
                                                      p.addons
                                                    }
                                                    :
                                                  </span>{" "}
                                                  {
                                                    addonText(
                                                      item.addons,
                                                    )
                                                  }
                                                </p>
                                              </div>

                                              <SmallValue
                                                label={
                                                  p.quantity
                                                }
                                                value={String(
                                                  item.quantity,
                                                )}
                                              />

                                              <SmallValue
                                                label={
                                                  p.unitPrice
                                                }
                                                value={
                                                  rupiah(
                                                    item.unitPrice,
                                                  )
                                                }
                                              />

                                              <SmallValue
                                                label={
                                                  p.lineTotal
                                                }
                                                value={
                                                  rupiah(
                                                    item.lineTotal,
                                                  )
                                                }
                                                strong
                                              />
                                            </div>
                                          </div>
                                        ),
                                      )}
                                    </div>

                                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                      <MetaInfo
                                        label={
                                          p.transaction
                                        }
                                        value={
                                          order.transactionId ??
                                          "—"
                                        }
                                      />

                                      <MetaInfo
                                        label={
                                          p.issuer
                                        }
                                        value={
                                          order.issuer ??
                                          "—"
                                        }
                                      />

                                      <MetaInfo
                                        label={
                                          p.paidAt
                                        }
                                        value={
                                          formatDateTime(
                                            order.paidAt,
                                          )
                                        }
                                      />
                                    </div>
                                  </div>

                                  <div className="rounded-[20px] bg-black p-4 text-white">
                                    <p className="text-[8px] font-extrabold uppercase tracking-[0.13em] text-white/30">
                                      {
                                        p.calculation
                                      }
                                    </p>

                                    <div className="mt-4 space-y-2.5">
                                      <CalculationRow
                                        label={
                                          p.subtotal
                                        }
                                        value={
                                          rupiah(
                                            order.calculation.subtotal,
                                          )
                                        }
                                      />

                                      <CalculationRow
                                        label={
                                          p.discount
                                        }
                                        value={`- ${rupiah(
                                          order.calculation.discount,
                                        )}`}
                                      />

                                      <CalculationRow
                                        label={
                                          p.service
                                        }
                                        value={
                                          rupiah(
                                            order.calculation.service,
                                          )
                                        }
                                      />

                                      <CalculationRow
                                        label={
                                          p.tax
                                        }
                                        value={
                                          rupiah(
                                            order.calculation.tax,
                                          )
                                        }
                                      />

                                      <div className="border-t border-white/10 pt-2.5">
                                        <CalculationRow
                                          label={
                                            p.grossTransaction
                                          }
                                          value={
                                            rupiah(
                                              order.calculation.gross,
                                            )
                                          }
                                          strong
                                        />
                                      </div>

                                      <CalculationRow
                                        label={`${p.platformFee} (${order.calculation.platformFeeRate}%)`}
                                        value={`- ${rupiah(
                                          order.calculation.platformFee,
                                        )}`}
                                        danger
                                      />

                                      <div className="mt-2 rounded-[14px] bg-white/[0.08] p-3">
                                        <CalculationRow
                                          label={
                                            p.netPayout
                                          }
                                          value={
                                            rupiah(
                                              order.calculation.netPayout,
                                            )
                                          }
                                          strong
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </article>
                        );
                      },
                    )}
                  </div>

                  <p className="mt-4 text-right text-[8px] font-bold text-black/25">
                    {
                      p.generated
                    }
                    :{" "}
                    {
                      formatDateTime(
                        detail.generatedAt,
                      )
                    }
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </section>

      {/* EXISTING WITHDRAWAL HISTORY */}
      <Panel
        title={
          t.withdrawalHistory
        }
        description={
          t.settlement
        }
        icon={
          Wallet
        }
      >
        {!data.withdrawals?.length ? (
          <EmptyState
            label={
              t.noWithdrawals
            }
          />
        ) : (
          <div className="divide-y divide-black/[0.055]">
            {data.withdrawals.map(
              (
                withdrawal,
              ) => (
                <div
                  key={
                    withdrawal.id
                  }
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div>
                    <p className="text-sm font-extrabold">
                      {
                        rupiah(
                          withdrawal.amount,
                        )
                      }
                    </p>

                    <p className="mt-1 text-[9px] text-black/30">
                      {withdrawal.createdAt
                        ? new Date(
                            withdrawal.createdAt,
                          ).toLocaleString(
                            locale ===
                            "id"
                              ? "id-ID"
                              : "en-US",
                          )
                        : "—"}
                    </p>
                  </div>

                  <span className="rounded-full bg-[#f2f2ee] px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[0.08em] text-black/45">
                    {
                      withdrawal.status ??
                      "pending"
                    }
                  </span>
                </div>
              ),
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}

function PayoutStateBadge({
  state,
  label,
}: {
  state:
    PayoutState;
  label:
    string;
}) {
  const className =
    state ===
    "approved"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : state ===
          "pending"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : state ===
            "rejected"
          ? "bg-red-50 text-red-700 ring-red-100"
          : state ===
              "cashouted"
            ? "bg-violet-50 text-violet-700 ring-violet-100"
            : "bg-blue-50 text-blue-700 ring-blue-100";

  return (
    <span
      className={[
        "rounded-full px-2 py-1 text-[7px] font-extrabold uppercase tracking-[0.08em] ring-1",
        className,
      ].join(
        " ",
      )}
    >
      {
        label
      }
    </span>
  );
}

function AuditMetric({
  label,
  value,
  strong =
    false,
}: {
  label:
    string;
  value:
    string;
  strong?:
    boolean;
}) {
  return (
    <div className="rounded-[16px] border border-black/[0.06] bg-white p-3">
      <p className="text-[7px] font-extrabold uppercase tracking-[0.11em] text-black/25">
        {
          label
        }
      </p>

      <p
        className={[
          "mt-1 truncate",
          strong
            ? "text-sm font-extrabold"
            : "text-xs font-bold text-black/55",
        ].join(
          " ",
        )}
      >
        {
          value
        }
      </p>
    </div>
  );
}

function AmountCell({
  label,
  value,
  strong =
    false,
  danger =
    false,
}: {
  label:
    string;
  value:
    string;
  strong?:
    boolean;
  danger?:
    boolean;
}) {
  return (
    <div>
      <p className="text-[7px] font-extrabold uppercase tracking-[0.1em] text-black/25">
        {
          label
        }
      </p>

      <p
        className={[
          "mt-1 text-[10px]",
          strong
            ? "font-extrabold text-black"
            : danger
              ? "font-bold text-red-500"
              : "font-bold text-black/50",
        ].join(
          " ",
        )}
      >
        {
          value
        }
      </p>
    </div>
  );
}

function SmallValue({
  label,
  value,
  strong =
    false,
}: {
  label:
    string;
  value:
    string;
  strong?:
    boolean;
}) {
  return (
    <div>
      <p className="text-[7px] font-extrabold uppercase tracking-[0.09em] text-black/25">
        {
          label
        }
      </p>

      <p
        className={[
          "mt-1 text-[9px]",
          strong
            ? "font-extrabold"
            : "font-bold text-black/50",
        ].join(
          " ",
        )}
      >
        {
          value
        }
      </p>
    </div>
  );
}

function MetaInfo({
  label,
  value,
}: {
  label:
    string;
  value:
    string;
}) {
  return (
    <div className="min-w-0 rounded-[14px] bg-[#f2f2ee] p-3">
      <p className="text-[7px] font-extrabold uppercase tracking-[0.09em] text-black/25">
        {
          label
        }
      </p>

      <p className="mt-1 truncate font-mono text-[8px] font-bold text-black/45">
        {
          value
        }
      </p>
    </div>
  );
}

function CalculationRow({
  label,
  value,
  strong =
    false,
  danger =
    false,
}: {
  label:
    string;
  value:
    string;
  strong?:
    boolean;
  danger?:
    boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-[9px]">
      <span
        className={
          strong
            ? "font-extrabold text-white"
            : danger
              ? "font-bold text-red-300"
              : "text-white/40"
        }
      >
        {
          label
        }
      </span>

      <span
        className={
          strong
            ? "font-extrabold text-white"
            : danger
              ? "font-extrabold text-red-300"
              : "font-bold text-white/65"
        }
      >
        {
          value
        }
      </span>
    </div>
  );
}

function DarkStat({
  icon:
    Icon,
  label,
  value,
}: {
  icon:
    typeof Wallet;
  label:
    string;
  value:
    string;
}) {
  return (
    <div className="rounded-[16px] bg-white/[0.07] p-3">
      <div className="flex items-center gap-1.5 text-[8px] font-extrabold uppercase tracking-[0.1em] text-white/30">
        <Icon
          size={
            10
          }
        />

        {
          label
        }
      </div>

      <p className="mt-2 truncate text-xs font-extrabold text-white/75">
        {
          value
        }
      </p>
    </div>
  );
}
