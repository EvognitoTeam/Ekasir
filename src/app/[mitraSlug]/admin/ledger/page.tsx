"use client";

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
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Download,
  Filter,
  Hash,
  Loader2,
  Package,
  ReceiptText,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Store,
  Table2,
  Tag,
  X,
  XCircle,
} from "lucide-react";

import type {
  LucideIcon,
} from 'lucide-react';

import {
  useLanguageStore,
} from "@/store/language.store";

import {
  useMenuStore,
} from "@/store/menu.store";

import {
  useOrderStore,
} from "@/store/order.store";

type Locale =
  | "id"
  | "en";

type DateFilter =
  | "all"
  | "today"
  | "7days"
  | "30days";

type PaymentFilter =
  | "all"
  | "paid"
  | "waiting"
  | "expired";

type AnyRecord =
  Record<
    string,
    unknown
  >;

const STATUS_VALUES = [
  "completed",
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "cancelled",
] as const;

const copy = {
  id: {
    eyebrow:
      "Transaction ledger",

    title:
      "Transaksi",

    subtitle:
      "Arsip transaksi lengkap untuk menelusuri pesanan, pembayaran, outlet, dan detail item dalam satu tampilan.",

    refresh:
      "Perbarui",

    refreshing:
      "Memperbarui",

    export:
      "Export TSV",

    search:
      "Cari kode order, meja, pelanggan...",

    filters:
      "Filter",

    clearFilters:
      "Reset filter",

    allTime:
      "Semua waktu",

    today:
      "Hari ini",

    last7Days:
      "7 hari terakhir",

    last30Days:
      "30 hari terakhir",

    allStatuses:
      "Semua status",

    allPayments:
      "Semua pembayaran",

    allBranches:
      "Semua outlet",

    paid:
      "Lunas",

    waiting:
      "Menunggu",

    expired:
      "Expired",

    otherPayment:
      "Lainnya",

    completed:
      "Selesai",

    cancelled:
      "Dibatalkan",

    pending:
      "Pending",

    confirmed:
      "Dikonfirmasi",

    preparing:
      "Diproses",

    ready:
      "Siap",

    records:
      "record",

    paidRevenue:
      "Omzet lunas",

    paidTransactions:
      "Transaksi lunas",

    cancelledTransactions:
      "Dibatalkan",

    filteredRecords:
      "Hasil filter",

    archive:
      "Arsip transaksi",

    archiveDesc:
      "Klik satu transaksi untuk membuka detail item dan total pembayaran.",

    order:
      "Pesanan",

    outlet:
      "Outlet",

    table:
      "Meja",

    status:
      "Status",

    payment:
      "Pembayaran",

    date:
      "Tanggal",

    total:
      "Total",

    detail:
      "Detail pesanan",

    quantity:
      "Qty",

    subtotal:
      "Subtotal",

    totalOrder:
      "Total pesanan",

    noTransactions:
      "Tidak ada transaksi yang cocok dengan filter.",

    loading:
      "Memuat ledger transaksi",

    mainOutlet:
      "Outlet utama",

    unknownTable:
      "Tanpa meja",

    item:
      "Item",

    generalCustomer:
      "Pelanggan umum",

    filterPeriod:
      "Waktu",

    filterStatus:
      "Status",

    filterPayment:
      "Pembayaran",

    filterBranch:
      "Outlet",

    activeFilters:
      "Filter aktif",

    noActiveFilters:
      "Tidak ada filter tambahan",

    paymentCash:
      "Tunai",

    paymentQris:
      "QRIS",

    openDetail:
      "Buka detail",

    closeDetail:
      "Tutup detail",
  },

  en: {
    eyebrow:
      "Transaction ledger",

    title:
      "Transactions",

    subtitle:
      "A complete transaction archive for tracing orders, payments, outlets, and item details in one view.",

    refresh:
      "Refresh",

    refreshing:
      "Refreshing",

    export:
      "Export TSV",

    search:
      "Search order code, table, customer...",

    filters:
      "Filters",

    clearFilters:
      "Reset filters",

    allTime:
      "All time",

    today:
      "Today",

    last7Days:
      "Last 7 days",

    last30Days:
      "Last 30 days",

    allStatuses:
      "All statuses",

    allPayments:
      "All payments",

    allBranches:
      "All outlets",

    paid:
      "Paid",

    waiting:
      "Waiting",

    expired:
      "Expired",

    otherPayment:
      "Other",

    completed:
      "Completed",

    cancelled:
      "Cancelled",

    pending:
      "Pending",

    confirmed:
      "Confirmed",

    preparing:
      "Preparing",

    ready:
      "Ready",

    records:
      "records",

    paidRevenue:
      "Paid revenue",

    paidTransactions:
      "Paid transactions",

    cancelledTransactions:
      "Cancelled",

    filteredRecords:
      "Filtered records",

    archive:
      "Transaction archive",

    archiveDesc:
      "Open a transaction to inspect its items and payment total.",

    order:
      "Order",

    outlet:
      "Outlet",

    table:
      "Table",

    status:
      "Status",

    payment:
      "Payment",

    date:
      "Date",

    total:
      "Total",

    detail:
      "Order details",

    quantity:
      "Qty",

    subtotal:
      "Subtotal",

    totalOrder:
      "Order total",

    noTransactions:
      "No transactions match the current filters.",

    loading:
      "Loading transaction ledger",

    mainOutlet:
      "Main outlet",

    unknownTable:
      "No table",

    item:
      "Item",

    generalCustomer:
      "Walk-in customer",

    filterPeriod:
      "Period",

    filterStatus:
      "Status",

    filterPayment:
      "Payment",

    filterBranch:
      "Outlet",

    activeFilters:
      "Active filters",

    noActiveFilters:
      "No additional filters",

    paymentCash:
      "Cash",

    paymentQris:
      "QRIS",

    openDetail:
      "Open details",

    closeDetail:
      "Close details",
  },
} as const;

function readField(
  value:
    unknown,
  names:
    string[],
): unknown {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return undefined;
  }

  const record =
    value as AnyRecord;

  const normalizedNames =
    new Set(
      names.map(
        (
          name,
        ) =>
          name
            .replace(
              /_/g,
              "",
            )
            .toLowerCase(),
      ),
    );

  for (
    const [
      key,
      fieldValue,
    ] of Object.entries(
      record,
    )
  ) {
    const normalizedKey =
      key
        .replace(
          /_/g,
          "",
        )
        .toLowerCase();

    if (
      normalizedNames.has(
        normalizedKey,
      ) &&
      fieldValue !==
        null &&
      fieldValue !==
        undefined &&
      String(
        fieldValue,
      ).trim() !==
        ""
    ) {
      return fieldValue;
    }
  }

  return undefined;
}

function money(
  value:
    unknown,
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

function number(
  value:
    unknown,
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
  ).format(
    Number.isFinite(
      numeric,
    )
      ? numeric
      : 0,
  );
}

function safeDate(
  value:
    unknown,
): Date | null {
  if (
    !value
  ) {
    return null;
  }

  const date =
    new Date(
      String(
        value,
      ),
    );

  return Number.isNaN(
    date.getTime(),
  )
    ? null
    : date;
}

function formatDateTime(
  value:
    unknown,
  locale:
    Locale,
) {
  const date =
    safeDate(
      value,
    );

  if (
    !date
  ) {
    return "-";
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

function getPaymentStatus(
  order:
    unknown,
): "paid" | "waiting" | "expired" | "other" {
  const raw =
    String(
      readField(
        order,
        [
          "paymentStatus",
          "payment_status",
        ],
      ) ??
        "",
    )
      .trim()
      .toLowerCase();

  if (
    raw ===
      "2" ||
    raw ===
      "paid"
  ) {
    return "paid";
  }

  if (
    raw ===
      "1" ||
    raw ===
      "waiting" ||
    raw ===
      "pending"
  ) {
    return "waiting";
  }

  if (
    raw ===
      "3" ||
    raw ===
      "expired"
  ) {
    return "expired";
  }

  return "other";
}

function getPaymentMethod(
  order:
    unknown,
): string {
  return String(
    readField(
      order,
      [
        "paymentMethod",
        "payment_method",
      ],
    ) ??
      "",
  )
    .trim()
    .toLowerCase();
}

function getBranchName(
  order:
    unknown,
): string {
  return String(
    readField(
      order,
      [
        "branchName",
        "branch_name",
      ],
    ) ??
      "",
  ).trim();
}

function getTableName(
  order:
    unknown,
  unknownLabel:
    string,
) {
  const explicit =
    readField(
      order,
      [
        "table_name",
        "tableName",
      ],
    );

  if (
    explicit
  ) {
    return String(
      explicit,
    );
  }

  const tableNumber =
    readField(
      order,
      [
        "table_number",
        "tableNumber",
      ],
    );

  if (
    tableNumber
  ) {
    return `Meja ${tableNumber}`;
  }

  return unknownLabel;
}

function getOrderCode(
  order:
    unknown,
) {
  return String(
    readField(
      order,
      [
        "order_code",
        "orderCode",
      ],
    ) ??
      readField(
        order,
        [
          "id",
        ],
      ) ??
      "-",
  );
}

function getCustomerName(
  order:
    unknown,
  fallback:
    string,
) {
  const value =
    readField(
      order,
      [
        "customerName",
        "customer_name",
        "name",
      ],
    );

  return value
    ? String(
        value,
      )
    : fallback;
}

function getTotal(
  order:
    unknown,
) {
  const value =
    readField(
      order,
      [
        "totalPrice",
        "total_price",
        "total_after_discount",
        "totalAfterDiscount",
        "total",
      ],
    );

  const numeric =
    Number(
      value ??
        0,
    );

  return Number.isFinite(
    numeric,
  )
    ? numeric
    : 0;
}

function getCreatedAt(
  order:
    unknown,
) {
  return readField(
    order,
    [
      "createdAt",
      "created_at",
    ],
  );
}

function getStatus(
  order:
    unknown,
) {
  return String(
    readField(
      order,
      [
        "status",
      ],
    ) ??
      "",
  ).toLowerCase();
}

function withinDateFilter(
  value:
    unknown,
  filter:
    DateFilter,
) {
  if (
    filter ===
    "all"
  ) {
    return true;
  }

  const date =
    safeDate(
      value,
    );

  if (
    !date
  ) {
    return false;
  }

  const now =
    new Date();

  if (
    filter ===
    "today"
  ) {
    return (
      date.getFullYear() ===
        now.getFullYear() &&
      date.getMonth() ===
        now.getMonth() &&
      date.getDate() ===
        now.getDate()
    );
  }

  const days =
    filter ===
    "7days"
      ? 7
      : 30;

  const threshold =
    new Date(
      now,
    );

  threshold.setDate(
    threshold.getDate() -
      days,
  );

  return (
    date >=
      threshold &&
    date <=
      now
  );
}

function getStatusLabel(
  status:
    string,
  locale:
    Locale,
) {
  const t =
    copy[locale];

  const labels:
    Record<
      string,
      string
    > = {
      completed:
        t.completed,
      cancelled:
        t.cancelled,
      pending:
        t.pending,
      confirmed:
        t.confirmed,
      preparing:
        t.preparing,
      ready:
        t.ready,
    };

  return labels[
    status
  ] ??
    status;
}

export default function AdminLedgerPage() {
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

  const {
    orderHistory,
    fetchOrderHistory,
    loading,
  } =
    useOrderStore();

  const {
    items:
      menuItems,
    setMenu,
  } =
    useMenuStore();

  const [
    search,
    setSearch,
  ] =
    useState(
      "",
    );

  const [
    dateFilter,
    setDateFilter,
  ] =
    useState<DateFilter>(
      "all",
    );

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState(
      "all",
    );

  const [
    paymentFilter,
    setPaymentFilter,
  ] =
    useState<PaymentFilter>(
      "all",
    );

  const [
    branchFilter,
    setBranchFilter,
  ] =
    useState(
      "all",
    );

  const [
    expandedId,
    setExpandedId,
  ] =
    useState<
      string |
      number |
      null
    >(
      null,
    );

  const [
    showFilters,
    setShowFilters,
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

  useEffect(() => {
    if (
      !slug
    ) {
      return;
    }

    void fetchOrderHistory(
      slug,
    );

    const controller =
      new AbortController();

    fetch(
      `/api/products?slug=${encodeURIComponent(
        slug,
      )}`,
      {
        signal:
          controller.signal,
        cache:
          "no-store",
        credentials:
          "include",
      },
    )
      .then(
        (
          response,
        ) =>
          response.json(),
      )
      .then(
        (
          data,
        ) => {
          if (
            !data.success
          ) {
            return;
          }

          const itemsData =
            Array.isArray(
              data.data,
            )
              ? data.data
              : data.data
                  ?.items ??
                [];

          const categoriesData =
            data.data
              ?.categories ??
            [];

          setMenu(
            itemsData,
            categoriesData,
          );
        },
      )
      .catch(
        (
          error,
        ) => {
          if (
            error instanceof
              DOMException &&
            error.name ===
              "AbortError"
          ) {
            return;
          }

          console.error(
            "[LEDGER_PRODUCTS_ERROR]",
            error,
          );
        },
      );

    return () =>
      controller.abort();
  }, [
    fetchOrderHistory,
    setMenu,
    slug,
  ]);

  const branches =
    useMemo(
      () => {
        const values =
          new Set<string>();

        for (
          const order of
          orderHistory
        ) {
          const branchName =
            getBranchName(
              order,
            );

          if (
            branchName
          ) {
            values.add(
              branchName,
            );
          }
        }

        return Array.from(
          values,
        ).sort(
          (
            a,
            b,
          ) =>
            a.localeCompare(
              b,
            ),
        );
      },
      [
        orderHistory,
      ],
    );

  const filtered =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        return orderHistory.filter(
          (
            order,
          ) => {
            const createdAt =
              getCreatedAt(
                order,
              );

            if (
              !withinDateFilter(
                createdAt,
                dateFilter,
              )
            ) {
              return false;
            }

            const status =
              getStatus(
                order,
              );

            if (
              statusFilter !==
                "all" &&
              status !==
                statusFilter
            ) {
              return false;
            }

            const paymentStatus =
              getPaymentStatus(
                order,
              );

            if (
              paymentFilter !==
                "all" &&
              paymentStatus !==
                paymentFilter
            ) {
              return false;
            }

            const branchName =
              getBranchName(
                order,
              );

            if (
              branchFilter !==
                "all" &&
              branchName !==
                branchFilter
            ) {
              return false;
            }

            if (
              !query
            ) {
              return true;
            }

            const haystack =
              [
                getOrderCode(
                  order,
                ),
                getTableName(
                  order,
                  "",
                ),
                getCustomerName(
                  order,
                  "",
                ),
                branchName,
                getPaymentMethod(
                  order,
                ),
                status,
              ]
                .join(
                  " ",
                )
                .toLowerCase();

            return haystack.includes(
              query,
            );
          },
        );
      },
      [
        branchFilter,
        dateFilter,
        orderHistory,
        paymentFilter,
        search,
        statusFilter,
      ],
    );

  const paidOrders =
    useMemo(
      () =>
        filtered.filter(
          (
            order,
          ) =>
            getPaymentStatus(
              order,
            ) ===
            "paid",
        ),
      [
        filtered,
      ],
    );

  const paidRevenue =
    useMemo(
      () =>
        paidOrders.reduce(
          (
            sum,
            order,
          ) =>
            sum +
            getTotal(
              order,
            ),
          0,
        ),
      [
        paidOrders,
      ],
    );

  const cancelledCount =
    useMemo(
      () =>
        filtered.filter(
          (
            order,
          ) =>
            getStatus(
              order,
            ) ===
            "cancelled",
        ).length,
      [
        filtered,
      ],
    );

  const activeFilterCount =
    [
      dateFilter !==
        "all",
      statusFilter !==
        "all",
      paymentFilter !==
        "all",
      branchFilter !==
        "all",
    ].filter(
      Boolean,
    ).length;

  const clearFilters =
    () => {
      setDateFilter(
        "all",
      );
      setStatusFilter(
        "all",
      );
      setPaymentFilter(
        "all",
      );
      setBranchFilter(
        "all",
      );
      setSearch(
        "",
      );
    };

  const handleRefresh =
    async () => {
      if (
        refreshing ||
        !slug
      ) {
        return;
      }

      setRefreshing(
        true,
      );

      try {
        await fetchOrderHistory(
          slug,
        );
      } finally {
        setRefreshing(
          false,
        );
      }
    };

  const exportToTSV =
    () => {
      if (
        !filtered.length
      ) {
        return;
      }

      const headers =
        [
          "Order ID",
          "Kode Order",
          "Outlet",
          "Meja",
          "Tanggal",
          "Status",
          "Payment Status",
          "Payment Method",
          "Total",
        ];

      const rows =
        filtered.map(
          (
            order,
          ) => [
            String(
              readField(
                order,
                [
                  "id",
                ],
              ) ??
                "",
            ),
            getOrderCode(
              order,
            ),
            getBranchName(
              order,
            ) ||
              t.mainOutlet,
            getTableName(
              order,
              t.unknownTable,
            ),
            formatDateTime(
              getCreatedAt(
                order,
              ),
              locale,
            ),
            getStatus(
              order,
            ),
            getPaymentStatus(
              order,
            ),
            getPaymentMethod(
              order,
            ),
            String(
              getTotal(
                order,
              ),
            ),
          ],
        );

      const tsv =
        [
          headers.join(
            "\t",
          ),
          ...rows.map(
            (
              row,
            ) =>
              row.join(
                "\t",
              ),
          ),
        ].join(
          "\n",
        );

      const blob =
        new Blob(
          [
            "\uFEFF",
            tsv,
          ],
          {
            type:
              "text/tab-separated-values;charset=utf-8;",
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

      link.href =
        url;

      link.download =
        `ledger-${new Date()
          .toISOString()
          .slice(
            0,
            10,
          )}.tsv`;

      document.body.appendChild(
        link,
      );

      link.click();
      link.remove();

      URL.revokeObjectURL(
        url,
      );
    };

  if (
    loading &&
    !orderHistory.length
  ) {
    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-black/[0.08] bg-white shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>

        <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.18em] text-black/30">
          {
            t.loading
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* PAGE HEADER */}
      <section className="flex flex-col gap-5 border-b border-black/[0.08] pb-7 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-black/30">
            <ReceiptText
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
            onClick={
              handleRefresh
            }
            disabled={
              refreshing
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-black/[0.08] bg-white px-4 text-xs font-extrabold shadow-sm transition hover:border-black/20 disabled:opacity-50"
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
              exportToTSV
            }
            disabled={
              !filtered.length
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-4 text-xs font-extrabold text-white transition hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Download
              size={
                14
              }
            />

            {
              t.export
            }
          </button>
        </div>
      </section>

      {/* SUMMARY */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={
            CircleDollarSign
          }
          label={
            t.paidRevenue
          }
          value={
            money(
              paidRevenue,
              locale,
            )
          }
          dark
        />

        <SummaryCard
          icon={
            CheckCircle2
          }
          label={
            t.paidTransactions
          }
          value={
            number(
              paidOrders.length,
              locale,
            )
          }
        />

        <SummaryCard
          icon={
            XCircle
          }
          label={
            t.cancelledTransactions
          }
          value={
            number(
              cancelledCount,
              locale,
            )
          }
        />

        <SummaryCard
          icon={
            ReceiptText
          }
          label={
            t.filteredRecords
          }
          value={
            number(
              filtered.length,
              locale,
            )
          }
        />
      </section>

      {/* SEARCH + FILTER */}
      <section className="rounded-[24px] border border-black/[0.08] bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
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
              className="h-11 w-full rounded-xl border border-black/[0.08] bg-[#fafaf8] pl-10 pr-4 text-xs font-semibold text-black outline-none transition placeholder:text-black/25 focus:border-black/20 focus:bg-white"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              setShowFilters(
                (
                  current,
                ) =>
                  !current,
              )
            }
            className={[
              "inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-extrabold transition",
              showFilters ||
              activeFilterCount >
                0
                ? "border-black bg-black text-white"
                : "border-black/[0.08] bg-white text-black/55 hover:border-black/20",
            ].join(
              " ",
            )}
          >
            <SlidersHorizontal
              size={
                14
              }
            />

            {
              t.filters
            }

            {activeFilterCount >
              0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[9px] font-extrabold text-black">
                {
                  activeFilterCount
                }
              </span>
            )}
          </button>

          {(activeFilterCount >
            0 ||
            search) && (
            <button
              type="button"
              onClick={
                clearFilters
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-black/[0.08] bg-white px-4 text-xs font-extrabold text-black/45 transition hover:text-black"
            >
              <X
                size={
                  14
                }
              />

              {
                t.clearFilters
              }
            </button>
          )}
        </div>

        <AnimatePresence
          initial={
            false
          }
        >
          {showFilters && (
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
              <div className="mt-4 grid gap-3 border-t border-black/[0.07] pt-4 md:grid-cols-2 xl:grid-cols-4">
                <SelectField
                  icon={
                    CalendarDays
                  }
                  label={
                    t.filterPeriod
                  }
                  value={
                    dateFilter
                  }
                  onChange={(
                    value,
                  ) =>
                    setDateFilter(
                      value as DateFilter,
                    )
                  }
                >
                  <option value="all">
                    {
                      t.allTime
                    }
                  </option>

                  <option value="today">
                    {
                      t.today
                    }
                  </option>

                  <option value="7days">
                    {
                      t.last7Days
                    }
                  </option>

                  <option value="30days">
                    {
                      t.last30Days
                    }
                  </option>
                </SelectField>

                <SelectField
                  icon={
                    Filter
                  }
                  label={
                    t.filterStatus
                  }
                  value={
                    statusFilter
                  }
                  onChange={
                    setStatusFilter
                  }
                >
                  <option value="all">
                    {
                      t.allStatuses
                    }
                  </option>

                  {STATUS_VALUES.map(
                    (
                      status,
                    ) => (
                      <option
                        key={
                          status
                        }
                        value={
                          status
                        }
                      >
                        {
                          getStatusLabel(
                            status,
                            locale,
                          )
                        }
                      </option>
                    ),
                  )}
                </SelectField>

                <SelectField
                  icon={
                    CreditCard
                  }
                  label={
                    t.filterPayment
                  }
                  value={
                    paymentFilter
                  }
                  onChange={(
                    value,
                  ) =>
                    setPaymentFilter(
                      value as PaymentFilter,
                    )
                  }
                >
                  <option value="all">
                    {
                      t.allPayments
                    }
                  </option>

                  <option value="paid">
                    {
                      t.paid
                    }
                  </option>

                  <option value="waiting">
                    {
                      t.waiting
                    }
                  </option>

                  <option value="expired">
                    {
                      t.expired
                    }
                  </option>
                </SelectField>

                <SelectField
                  icon={
                    Store
                  }
                  label={
                    t.filterBranch
                  }
                  value={
                    branchFilter
                  }
                  onChange={
                    setBranchFilter
                  }
                >
                  <option value="all">
                    {
                      t.allBranches
                    }
                  </option>

                  {branches.map(
                    (
                      branchName,
                    ) => (
                      <option
                        key={
                          branchName
                        }
                        value={
                          branchName
                        }
                      >
                        {
                          branchName
                        }
                      </option>
                    ),
                  )}
                </SelectField>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* LEDGER */}
      <section className="overflow-hidden rounded-[26px] border border-black/[0.08] bg-white">
        <div className="flex flex-col gap-3 border-b border-black/[0.08] px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-black/30">
              {
                t.archive
              }
            </p>

            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
              {
                number(
                  filtered.length,
                  locale,
                )
              }{" "}
              {
                t.records
              }
            </h3>

            <p className="mt-1 text-xs leading-5 text-black/35">
              {
                t.archiveDesc
              }
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-[#f4f4f0] px-3 py-2 text-[10px] font-extrabold text-black/40">
            <Filter
              size={
                12
              }
            />

            {activeFilterCount >
              0
              ? `${t.activeFilters}: ${activeFilterCount}`
              : t.noActiveFilters}
          </div>
        </div>

        {filtered.length ===
        0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f3f3ef] text-black/25">
              <ReceiptText
                size={
                  18
                }
              />
            </div>

            <p className="mt-4 max-w-sm text-sm font-semibold text-black/35">
              {
                t.noTransactions
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.06]">
            {filtered.map(
              (
                order,
                index,
              ) => {
                const orderId =
                  (
                    readField(
                      order,
                      [
                        "id",
                      ],
                    ) ??
                    index
                  ) as
                    | string
                    | number;

                const isExpanded =
                  expandedId ===
                  orderId;

                const status =
                  getStatus(
                    order,
                  );

                const paymentStatus =
                  getPaymentStatus(
                    order,
                  );

                const paymentMethod =
                  getPaymentMethod(
                    order,
                  );

                const branchName =
                  getBranchName(
                    order,
                  ) ||
                  t.mainOutlet;

                const tableName =
                  getTableName(
                    order,
                    t.unknownTable,
                  );

                const total =
                  getTotal(
                    order,
                  );

                const items =
                  Array.isArray(
                    readField(
                      order,
                      [
                        "items",
                      ],
                    ),
                  )
                    ? (
                        readField(
                          order,
                          [
                            "items",
                          ],
                        ) as unknown[]
                      )
                    : [];

                return (
                  <motion.article
                    key={
                      String(
                        orderId,
                      )
                    }
                    initial={{
                      opacity:
                        0,
                    }}
                    animate={{
                      opacity:
                        1,
                    }}
                    transition={{
                      delay:
                        Math.min(
                          index *
                            0.01,
                          0.12,
                        ),
                    }}
                    className={[
                      "transition",
                      isExpanded
                        ? "bg-[#fafaf8]"
                        : "bg-white hover:bg-[#fcfcfa]",
                    ].join(
                      " ",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(
                          isExpanded
                            ? null
                            : orderId,
                        )
                      }
                      className="grid w-full gap-4 px-5 py-5 text-left sm:px-6 xl:grid-cols-[minmax(180px,1.3fr)_minmax(120px,0.8fr)_minmax(110px,0.7fr)_minmax(130px,0.8fr)_minmax(150px,0.9fr)_auto] xl:items-center"
                    >
                      {/* ORDER */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-black text-white">
                            <Hash
                              size={
                                13
                              }
                            />
                          </span>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-extrabold text-black">
                              {
                                getOrderCode(
                                  order,
                                )
                              }
                            </p>

                            <p className="mt-0.5 truncate text-[10px] text-black/30">
                              {
                                getCustomerName(
                                  order,
                                  t.generalCustomer,
                                )
                              }
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* OUTLET / TABLE */}
                      <div className="flex min-w-0 items-center gap-2 text-xs font-bold text-black/45">
                        <Store
                          size={
                            13
                          }
                          className="shrink-0 text-black/25"
                        />

                        <span className="truncate">
                          {
                            branchName
                          }
                        </span>
                      </div>

                      <div className="flex min-w-0 items-center gap-2 text-xs font-bold text-black/45">
                        <Table2
                          size={
                            13
                          }
                          className="shrink-0 text-black/25"
                        />

                        <span className="truncate">
                          {
                            tableName
                          }
                        </span>
                      </div>

                      {/* BADGES */}
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          status={
                            status
                          }
                          locale={
                            locale
                          }
                        />

                        <PaymentBadge
                          status={
                            paymentStatus
                          }
                          method={
                            paymentMethod
                          }
                          locale={
                            locale
                          }
                        />
                      </div>

                      {/* DATE */}
                      <div className="flex items-center gap-2 text-xs text-black/35">
                        <Clock3
                          size={
                            13
                          }
                          className="shrink-0"
                        />

                        <span>
                          {
                            formatDateTime(
                              getCreatedAt(
                                order,
                              ),
                              locale,
                            )
                          }
                        </span>
                      </div>

                      {/* TOTAL */}
                      <div className="flex items-center justify-between gap-4 xl:justify-end">
                        <p className="whitespace-nowrap text-sm font-extrabold text-black">
                          {
                            money(
                              total,
                              locale,
                            )
                          }
                        </p>

                        <motion.span
                          animate={{
                            rotate:
                              isExpanded
                                ? 180
                                : 0,
                          }}
                          transition={{
                            duration:
                              0.18,
                          }}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white text-black/35"
                          aria-label={
                            isExpanded
                              ? t.closeDetail
                              : t.openDetail
                          }
                        >
                          <ChevronDown
                            size={
                              14
                            }
                          />
                        </motion.span>
                      </div>
                    </button>

                    <AnimatePresence
                      initial={
                        false
                      }
                    >
                      {isExpanded && (
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
                          transition={{
                            height: {
                              duration:
                                0.22,
                            },
                            opacity: {
                              duration:
                                0.15,
                            },
                          }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-black/[0.07] px-5 pb-5 pt-4 sm:px-6">
                            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                              {/* ITEMS */}
                              <div className="rounded-[20px] border border-black/[0.07] bg-white">
                                <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3.5">
                                  <div className="flex items-center gap-2">
                                    <Package
                                      size={
                                        14
                                      }
                                      className="text-black/35"
                                    />

                                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-black/40">
                                      {
                                        t.detail
                                      }
                                    </p>
                                  </div>

                                  <span className="text-[10px] font-bold text-black/30">
                                    {
                                      number(
                                        items.length,
                                        locale,
                                      )
                                    }{" "}
                                    {
                                      t.item
                                    }
                                  </span>
                                </div>

                                {items.length ? (
                                  <div className="divide-y divide-black/[0.05]">
                                    {items.map(
                                      (
                                        item,
                                        itemIndex,
                                      ) => {
                                        const productId =
                                          readField(
                                            item,
                                            [
                                              "product_id",
                                              "productId",
                                              "menuItemId",
                                              "menu_item_id",
                                            ],
                                          );

                                        const product =
                                          (
                                            menuItems ??
                                            []
                                          ).find(
                                            (
                                              menuItem:
                                                AnyRecord,
                                            ) =>
                                              String(
                                                readField(
                                                  menuItem,
                                                  [
                                                    "id",
                                                  ],
                                                ) ??
                                                  "",
                                              ) ===
                                              String(
                                                productId ??
                                                  "",
                                              ),
                                          );

                                        const productName =
                                          String(
                                            readField(
                                              product,
                                              [
                                                "name",
                                              ],
                                            ) ??
                                              readField(
                                                item,
                                                [
                                                  "name",
                                                  "product_name",
                                                  "productName",
                                                ],
                                              ) ??
                                              `${t.item} #${productId ?? itemIndex + 1}`,
                                          );

                                        const quantity =
                                          Number(
                                            readField(
                                              item,
                                              [
                                                "quantity",
                                                "qty",
                                              ],
                                            ) ??
                                              1,
                                          );

                                        const price =
                                          Number(
                                            readField(
                                              item,
                                              [
                                                "price",
                                                "unitPrice",
                                                "unit_price",
                                              ],
                                            ) ??
                                              0,
                                          );

                                        const safeQty =
                                          Number.isFinite(
                                            quantity,
                                          )
                                            ? quantity
                                            : 1;

                                        const safePrice =
                                          Number.isFinite(
                                            price,
                                          )
                                            ? price
                                            : 0;

                                        return (
                                          <div
                                            key={
                                              itemIndex
                                            }
                                            className="grid gap-3 px-4 py-3.5 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                                          >
                                            <p className="min-w-0 truncate text-xs font-extrabold text-black/70">
                                              {
                                                productName
                                              }
                                            </p>

                                            <span className="w-fit rounded-lg bg-[#f3f3ef] px-2 py-1 text-[10px] font-extrabold text-black/45">
                                              x
                                              {
                                                number(
                                                  safeQty,
                                                  locale,
                                                )
                                              }
                                            </span>

                                            <p className="text-xs font-extrabold text-black">
                                              {
                                                money(
                                                  safePrice *
                                                    safeQty,
                                                  locale,
                                                )
                                              }
                                            </p>
                                          </div>
                                        );
                                      },
                                    )}
                                  </div>
                                ) : (
                                  <div className="px-4 py-8 text-center text-xs text-black/30">
                                    -
                                  </div>
                                )}
                              </div>

                              {/* TOTAL BOX */}
                              <aside className="rounded-[20px] bg-black p-5 text-white">
                                <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-white/35">
                                  {
                                    t.totalOrder
                                  }
                                </p>

                                <p className="mt-2 break-words text-2xl font-semibold tracking-[-0.045em]">
                                  {
                                    money(
                                      total,
                                      locale,
                                    )
                                  }
                                </p>

                                <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
                                  <DetailLine
                                    icon={
                                      Store
                                    }
                                    label={
                                      t.outlet
                                    }
                                    value={
                                      branchName
                                    }
                                  />

                                  <DetailLine
                                    icon={
                                      Table2
                                    }
                                    label={
                                      t.table
                                    }
                                    value={
                                      tableName
                                    }
                                  />

                                  <DetailLine
                                    icon={
                                      CreditCard
                                    }
                                    label={
                                      t.payment
                                    }
                                    value={
                                      paymentMethod ===
                                      "qris"
                                        ? t.paymentQris
                                        : paymentMethod ===
                                          "cash"
                                          ? t.paymentCash
                                          : paymentMethod ||
                                            t.otherPayment
                                    }
                                  />

                                  <DetailLine
                                    icon={
                                      CalendarDays
                                    }
                                    label={
                                      t.date
                                    }
                                    value={
                                      formatDateTime(
                                        getCreatedAt(
                                          order,
                                        ),
                                        locale,
                                      )
                                    }
                                  />
                                </div>
                              </aside>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.article>
                );
              },
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  icon:
    Icon,
  label,
  value,
  dark = false,
}: {
  icon: LucideIcon;
  label:
    string;
  value:
    string;
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
            ? "bg-white/10 text-white/70"
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
          "mt-6 text-[9px] font-extrabold uppercase tracking-[0.15em]",
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

      <p className="mt-1 truncate text-xl font-semibold tracking-[-0.04em] sm:text-2xl">
        {
          value
        }
      </p>
    </div>
  );
}

function SelectField({
  icon:
    Icon,
  label,
  value,
  onChange,
  children,
}: {
  icon:
    React.ComponentType<{
      size?: number;
      className?: string;
    }>;
  label:
    string;
  value:
    string;
  onChange:
    (
      value:
        string,
    ) => void;
  children:
    React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.15em] text-black/30">
        <Icon
          size={
            11
          }
        />

        {
          label
        }
      </span>

      <span className="relative block">
        <select
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
          className="h-11 w-full appearance-none rounded-xl border border-black/[0.08] bg-[#fafaf8] px-3 pr-9 text-xs font-extrabold text-black/60 outline-none transition focus:border-black/20 focus:bg-white"
        >
          {
            children
          }
        </select>

        <ChevronDown
          size={
            14
          }
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/25"
        />
      </span>
    </label>
  );
}

function StatusBadge({
  status,
  locale,
}: {
  status:
    string;
  locale:
    Locale;
}) {
  const statusClass =
    status ===
    "completed"
      ? "border-black/10 bg-black text-white"
      : status ===
        "cancelled"
        ? "border-red-200 bg-red-50 text-red-600"
        : status ===
          "ready"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : status ===
            "preparing"
            ? "border-violet-200 bg-violet-50 text-violet-700"
            : status ===
              "confirmed"
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : status ===
                "pending"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-black/[0.08] bg-white text-black/45";

  return (
    <span
      className={[
        "inline-flex rounded-full border px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.06em]",
        statusClass,
      ].join(
        " ",
      )}
    >
      {
        getStatusLabel(
          status,
          locale,
        )
      }
    </span>
  );
}

function PaymentBadge({
  status,
  method,
  locale,
}: {
  status:
    "paid" |
    "waiting" |
    "expired" |
    "other";
  method:
    string;
  locale:
    Locale;
}) {
  const t =
    copy[locale];

  const statusLabel =
    status ===
    "paid"
      ? t.paid
      : status ===
        "waiting"
        ? t.waiting
        : status ===
          "expired"
          ? t.expired
          : t.otherPayment;

  const methodLabel =
    method ===
    "qris"
      ? t.paymentQris
      : method ===
        "cash"
        ? t.paymentCash
        : method;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-2.5 py-1 text-[9px] font-extrabold text-black/45">
      <CreditCard
        size={
          10
        }
      />

      {
        statusLabel
      }

      {methodLabel && (
        <span className="text-black/25">
          ·{" "}
          {
            methodLabel
          }
        </span>
      )}
    </span>
  );
}

function DetailLine({
  icon:
    Icon,
  label,
  value,
}: {
  icon:
    React.ComponentType<{
      size?: number;
      className?: string;
    }>;
  label:
    string;
  value:
    string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/50">
        <Icon
          size={
            12
          }
        />
      </div>

      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/30">
          {
            label
          }
        </p>

        <p className="mt-0.5 break-words text-[11px] font-extrabold text-white/75">
          {
            value
          }
        </p>
      </div>
    </div>
  );
}
