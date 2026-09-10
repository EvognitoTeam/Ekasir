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
  motion,
} from "framer-motion";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  ArrowRight,
  BadgeDollarSign,
  BarChart3,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Loader2,
  Package,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import {
  useLanguageStore,
} from "@/store/language.store";

type Locale = "id" | "en";
type Granularity = "year" | "month" | "day";

type AnalyticsData = {
  branches: Array<{
    id: number;
    name: string;
    slug: string;
  }>;

  summary: {
    revenue: number;
    orders: number;
    averageOrder: number;
    discount: number;
    tax: number;
    service: number;
  };

  trend: Array<{
    period: string;
    revenue: number;
    orders: number;
  }>;

  topProducts: Array<{
    productId: number;
    name: string;
    image?: string | null;
    quantity: number;
    revenue: number;
  }>;

  recentSales: Array<{
    id: number;
    orderCode: string;
    name?: string | null;
    branchId?: number | null;
    branchName?: string | null;
    paymentMethod?: "cash" | "qris" | null;
    total: number;
    createdAt?: string | null;
  }>;
};

const copy = {
  id: {
    eyebrow: "Sales cockpit",
    title: "Penjualan",
    subtitle:
      "Satu ruang kerja untuk membaca omzet, transaksi, produk terlaris, dan aktivitas outlet.",

    refresh: "Perbarui",
    refreshing: "Memperbarui",
    loading: "Memuat data penjualan",
    error: "Gagal memuat data penjualan",

    period: "Periode",
    year: "Tahun",
    month: "Bulan",
    outlet: "Outlet",

    yearly: "Tahunan",
    monthly: "Bulanan",
    daily: "Harian",

    allOutlets: "Semua outlet",
    mainOutlet: "Outlet utama",

    revenue: "Omzet",
    orders: "Transaksi",
    average: "Rata-rata order",
    discount: "Diskon",

    overview: "Ringkasan",
    movement: "Pergerakan omzet",
    movementDesc: "Visualisasi performa penjualan pada periode aktif.",

    finance: "Komposisi finansial",
    tax: "Pajak",
    service: "Layanan",
    netActivity: "Aktivitas bersih",

    ranking: "Ranking produk",
    topProducts: "Produk terlaris",
    topProductsDesc: "Kontributor omzet terbesar pada periode ini.",
    sold: "terjual",
    noProducts: "Belum ada produk terjual.",

    activity: "Aktivitas terbaru",
    recent: "Transaksi terbaru",
    recentDesc: "Transaksi paling baru dari filter yang sedang aktif.",

    order: "Pesanan",
    customer: "Pelanggan",
    branch: "Outlet",
    payment: "Pembayaran",
    time: "Waktu",
    total: "Total",

    generalCustomer: "Pelanggan umum",
    noTransactions: "Belum ada transaksi.",
    noTrend: "Belum ada data tren.",

    cash: "Tunai",
    qris: "QRIS",
    other: "Lainnya",

    selectedPeriod: "Periode aktif",
    selectedOutlet: "Outlet aktif",
  },

  en: {
    eyebrow: "Sales cockpit",
    title: "Sales",
    subtitle:
      "One workspace to read revenue, transactions, top products, and outlet activity.",

    refresh: "Refresh",
    refreshing: "Refreshing",
    loading: "Loading sales data",
    error: "Failed to load sales data",

    period: "Period",
    year: "Year",
    month: "Month",
    outlet: "Outlet",

    yearly: "Yearly",
    monthly: "Monthly",
    daily: "Daily",

    allOutlets: "All outlets",
    mainOutlet: "Main outlet",

    revenue: "Revenue",
    orders: "Transactions",
    average: "Average order",
    discount: "Discount",

    overview: "Overview",
    movement: "Revenue movement",
    movementDesc: "Sales performance visualization for the active period.",

    finance: "Financial composition",
    tax: "Tax",
    service: "Service",
    netActivity: "Net activity",

    ranking: "Product ranking",
    topProducts: "Top products",
    topProductsDesc: "Highest revenue contributors in this period.",
    sold: "sold",
    noProducts: "No products sold yet.",

    activity: "Latest activity",
    recent: "Recent transactions",
    recentDesc: "Latest transactions from the active filters.",

    order: "Order",
    customer: "Customer",
    branch: "Outlet",
    payment: "Payment",
    time: "Time",
    total: "Total",

    generalCustomer: "Walk-in customer",
    noTransactions: "No transactions yet.",
    noTrend: "No trend data yet.",

    cash: "Cash",
    qris: "QRIS",
    other: "Other",

    selectedPeriod: "Active period",
    selectedOutlet: "Active outlet",
  },
} as const;

function formatCurrency(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US").format(value);
}

function formatCompact(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value: string | null | undefined, locale: Locale) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTrendLabel(
  period: string,
  granularity: Granularity,
  locale: Locale,
) {
  const localeCode =
    locale === "id"
      ? "id-ID"
      : "en-US";

  const rawPeriod =
    String(period ?? "").trim();

  if (!rawPeriod) {
    return "-";
  }

  if (
    granularity ===
    "year"
  ) {
    const parsedYear =
      Number.parseInt(
        rawPeriod.slice(0, 4),
        10,
      );

    return Number.isFinite(
      parsedYear,
    )
      ? String(parsedYear)
      : rawPeriod;
  }

  if (
    granularity ===
    "month"
  ) {
    /*
     * Mendukung:
     * 2026-09
     * 2026-09-01
     * dan format yang setidaknya diawali YYYY-MM.
     */
    const match =
      rawPeriod.match(
        /^(\d{4})-(\d{1,2})/,
      );

    if (!match) {
      return rawPeriod;
    }

    const parsedYear =
      Number.parseInt(
        match[1],
        10,
      );

    const parsedMonth =
      Number.parseInt(
        match[2],
        10,
      );

    if (
      !Number.isFinite(
        parsedYear,
      ) ||
      !Number.isFinite(
        parsedMonth,
      ) ||
      parsedMonth < 1 ||
      parsedMonth > 12
    ) {
      return rawPeriod;
    }

    const date =
      new Date(
        parsedYear,
        parsedMonth - 1,
        1,
      );

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return rawPeriod;
    }

    return new Intl.DateTimeFormat(
      localeCode,
      {
        month:
          "short",
      },
    ).format(
      date,
    );
  }

  /*
   * Daily.
   * Hindari langsung mem-format Invalid Date.
   */
  const dailyMatch =
    rawPeriod.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})/,
    );

  if (!dailyMatch) {
    return rawPeriod;
  }

  const parsedYear =
    Number.parseInt(
      dailyMatch[1],
      10,
    );

  const parsedMonth =
    Number.parseInt(
      dailyMatch[2],
      10,
    );

  const parsedDay =
    Number.parseInt(
      dailyMatch[3],
      10,
    );

  if (
    !Number.isFinite(
      parsedYear,
    ) ||
    !Number.isFinite(
      parsedMonth,
    ) ||
    !Number.isFinite(
      parsedDay,
    ) ||
    parsedMonth < 1 ||
    parsedMonth > 12 ||
    parsedDay < 1 ||
    parsedDay > 31
  ) {
    return rawPeriod;
  }

  const date =
    new Date(
      parsedYear,
      parsedMonth - 1,
      parsedDay,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return rawPeriod;
  }

  return new Intl.DateTimeFormat(
    localeCode,
    {
      day:
        "2-digit",
      month:
        "short",
    },
  ).format(
    date,
  );
}

export default function AdminSalesPage() {
  const params = useParams<{ mitraSlug: string }>();
  const slug = String(params.mitraSlug ?? "");

  const locale = useLanguageStore((state) => state.locale) as Locale;
  const t = copy[locale];

  const now = useMemo(() => new Date(), []);

  const [granularity, setGranularity] = useState<Granularity>("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [branch, setBranch] = useState("all");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const years = useMemo(
    () =>
      Array.from(
        { length: 7 },
        (_, index) => now.getFullYear() - index,
      ),
    [now],
  );

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        value: index + 1,
        label: new Intl.DateTimeFormat(
          locale === "id" ? "id-ID" : "en-US",
          { month: "long" },
        ).format(new Date(2026, index, 1)),
      })),
    [locale],
  );

  useEffect(() => {
    if (!slug) return;

    const controller = new AbortController();

    setLoading(true);
    setError("");

    const search = new URLSearchParams({
      slug,
      granularity,
      year: String(year),
      month: String(month),
      branch,
    });

    fetch(`/api/pos/sales-analytics?${search.toString()}`, {
      signal: controller.signal,
      cache: "no-store",
      credentials: "include",
    })
      .then(async (response) => {
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || t.error);
        }

        return result.data as AnalyticsData;
      })
      .then((result) => {
        setData(result);
      })
      .catch((fetchError) => {
        if (
          fetchError instanceof DOMException &&
          fetchError.name === "AbortError"
        ) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : t.error,
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [
    branch,
    granularity,
    month,
    refreshKey,
    slug,
    t.error,
    year,
  ]);

  const summary = data?.summary ?? {
    revenue: 0,
    orders: 0,
    averageOrder: 0,
    discount: 0,
    tax: 0,
    service: 0,
  };

  const chartData = useMemo(
    () =>
      (data?.trend ?? []).map((item) => ({
        ...item,
        label: formatTrendLabel(
          item.period,
          granularity,
          locale,
        ),
      })),
    [data?.trend, granularity, locale],
  );

  const highestProductRevenue = Math.max(
    ...(data?.topProducts ?? []).map((item) => item.revenue),
    1,
  );

  const selectedOutlet =
    branch === "all"
      ? t.allOutlets
      : branch === "main"
        ? t.mainOutlet
        : data?.branches.find(
              (item) => String(item.id) === branch,
            )?.name ?? t.allOutlets;

  const activePeriod =
    granularity === "year"
      ? String(year)
      : granularity === "month"
        ? String(year)
        : `${months[month - 1]?.label ?? ""} ${year}`;

  if (loading && !data) {
    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-black/[0.08] bg-white shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>

        <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.18em] text-black/30">
          {t.loading}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* HEADER */}
      <section className="grid gap-6 border-b border-black/[0.08] pb-7 xl:grid-cols-[1fr_auto] xl:items-end">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-black/30">
            <Sparkles size={13} />
            {t.eyebrow}
          </div>

          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
            {t.title}
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/40">
            {t.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRefreshKey((value) => value + 1)}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl border border-black/[0.08] bg-white px-4 text-xs font-extrabold shadow-sm transition hover:border-black/20 disabled:opacity-50 xl:self-auto"
        >
          <RefreshCw
            size={14}
            className={loading ? "animate-spin" : ""}
          />

          {loading ? t.refreshing : t.refresh}
        </button>
      </section>

      {/* CONTROL BAR */}
      <section className="grid gap-3 rounded-[22px] border border-black/[0.08] bg-white p-4 lg:grid-cols-[1.3fr_0.65fr_0.65fr_1fr]">
        <div>
          <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.16em] text-black/30">
            {t.period}
          </p>

          <div className="grid grid-cols-3 rounded-xl bg-[#f3f3ef] p-1">
            {(
              [
                ["year", t.yearly],
                ["month", t.monthly],
                ["day", t.daily],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setGranularity(value)}
                className={[
                  "h-9 rounded-lg text-[11px] font-extrabold transition",
                  granularity === value
                    ? "bg-white text-black shadow-sm"
                    : "text-black/35 hover:text-black",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <SelectField
          label={t.year}
          value={String(year)}
          onChange={(value) => setYear(Number(value))}
        >
          {years.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </SelectField>

        <SelectField
          label={t.month}
          value={String(month)}
          onChange={(value) => setMonth(Number(value))}
          disabled={granularity === "year"}
        >
          {months.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </SelectField>

        <SelectField
          label={t.outlet}
          value={branch}
          onChange={setBranch}
        >
          <option value="all">{t.allOutlets}</option>
          <option value="main">{t.mainOutlet}</option>

          {data?.branches.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </SelectField>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {/* COCKPIT */}
      <section className="grid gap-5 2xl:grid-cols-[270px_minmax(0,1fr)_300px]">
        {/* LEFT METRICS */}
        <aside className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-1">
          <MiniMetric
            icon={CircleDollarSign}
            label={t.revenue}
            value={formatCurrency(summary.revenue, locale)}
            meta={selectedOutlet}
            dark
          />

          <MiniMetric
            icon={ReceiptText}
            label={t.orders}
            value={formatNumber(summary.orders, locale)}
            meta={activePeriod}
          />

          <MiniMetric
            icon={TrendingUp}
            label={t.average}
            value={formatCurrency(summary.averageOrder, locale)}
            meta={t.selectedPeriod}
          />

          <MiniMetric
            icon={ShoppingBag}
            label={t.discount}
            value={formatCurrency(summary.discount, locale)}
            meta={activePeriod}
          />
        </aside>

        {/* CENTER CHART */}
        <div className="rounded-[26px] border border-black/[0.08] bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-black/30">
                {t.overview}
              </p>

              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                {t.movement}
              </h3>

              <p className="mt-1 text-xs leading-5 text-black/35">
                {t.movementDesc}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-[#f4f4f0] px-3 py-2 text-[10px] font-extrabold text-black/40">
              <CalendarDays size={13} />
              {activePeriod}
            </div>
          </div>

          <div className="mt-6 h-[350px] w-full">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{
                    top: 8,
                    right: 8,
                    left: -12,
                    bottom: 0,
                  }}
                >
                  <defs>
                    <linearGradient
                      id="salesAreaSoft"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#111111"
                        stopOpacity={0.13}
                      />

                      <stop
                        offset="100%"
                        stopColor="#111111"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    vertical={false}
                    stroke="#eeeeea"
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#8d8d86",
                      fontSize: 10,
                    }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#8d8d86",
                      fontSize: 10,
                    }}
                    tickFormatter={(value) =>
                      formatCompact(Number(value), locale)
                    }
                  />

                  <Tooltip
                    cursor={{
                      stroke: "#d8d8d2",
                    }}
                    contentStyle={{
                      borderRadius: 14,
                      border: "1px solid #e5e5df",
                      boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
                    }}
                    formatter={(value) => [
                      formatCurrency(Number(value), locale),
                      t.revenue,
                    ]}
                  />

                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#111111"
                    strokeWidth={2.4}
                    fill="url(#salesAreaSoft)"
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: "#111111",
                      stroke: "#fff",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-[18px] border border-dashed border-black/[0.08] bg-[#fafaf8]">
                <BarChart3 className="text-black/20" size={22} />

                <p className="mt-3 text-xs text-black/35">
                  {t.noTrend}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT FINANCE */}
        <aside className="rounded-[26px] border border-black/[0.08] bg-[#f0f0eb] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-black/30">
                {t.finance}
              </p>

              <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em]">
                {t.netActivity}
              </h3>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm">
              <BadgeDollarSign size={17} className="text-black/50" />
            </div>
          </div>

          <div className="mt-6 rounded-[20px] bg-white p-4 shadow-sm">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-black/30">
              {t.revenue}
            </p>

            <p className="mt-2 break-words text-2xl font-semibold tracking-[-0.045em]">
              {formatCurrency(summary.revenue, locale)}
            </p>
          </div>

          <div className="mt-3 space-y-2">
            <FinanceItem
              icon={WalletCards}
              label={t.tax}
              value={formatCurrency(summary.tax, locale)}
            />

            <FinanceItem
              icon={Store}
              label={t.service}
              value={formatCurrency(summary.service, locale)}
            />

            <FinanceItem
              icon={ShoppingBag}
              label={t.discount}
              value={formatCurrency(summary.discount, locale)}
            />
          </div>
        </aside>
      </section>

      {/* PRODUCTS */}
      <section className="rounded-[26px] border border-black/[0.08] bg-white p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-black/30">
              {t.ranking}
            </p>

            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
              {t.topProducts}
            </h3>

            <p className="mt-1 text-xs leading-5 text-black/35">
              {t.topProductsDesc}
            </p>
          </div>

          <Package size={18} className="mt-1 text-black/20" />
        </div>

        {data?.topProducts.length ? (
          <div className="mt-6 grid gap-3 lg:grid-cols-2">
            {data.topProducts.map((product, index) => {
              const percent = Math.max(
                6,
                Math.round(
                  (product.revenue / highestProductRevenue) * 100,
                ),
              );

              return (
                <motion.div
                  key={product.productId}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: Math.min(index * 0.03, 0.15),
                  }}
                  className="rounded-[18px] border border-black/[0.07] bg-[#fafaf8] p-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-xs font-extrabold text-white">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold">
                            {product.name}
                          </p>

                          <p className="mt-1 text-[10px] text-black/35">
                            {formatNumber(product.quantity, locale)} {t.sold}
                          </p>
                        </div>

                        <p className="whitespace-nowrap text-xs font-extrabold">
                          {formatCurrency(product.revenue, locale)}
                        </p>
                      </div>

                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{
                            duration: 0.45,
                            ease: "easeOut",
                          }}
                          className="h-full rounded-full bg-black"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-[18px] border border-dashed border-black/[0.08] bg-[#fafaf8] py-12 text-center text-xs text-black/35">
            {t.noProducts}
          </div>
        )}
      </section>

      {/* RECENT */}
      <section className="overflow-hidden rounded-[26px] border border-black/[0.08] bg-white">
        <div className="flex items-start justify-between border-b border-black/[0.08] px-5 py-5 sm:px-6">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-black/30">
              {t.activity}
            </p>

            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
              {t.recent}
            </h3>

            <p className="mt-1 text-xs text-black/35">
              {t.recentDesc}
            </p>
          </div>

          <Clock3 size={17} className="mt-1 text-black/20" />
        </div>

        {/* mobile */}
        <div className="divide-y divide-black/[0.06] lg:hidden">
          {data?.recentSales.length ? (
            data.recentSales.map((sale) => (
              <div key={sale.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold">
                      {sale.orderCode}
                    </p>

                    <p className="mt-1 truncate text-xs text-black/35">
                      {sale.name || t.generalCustomer}
                    </p>
                  </div>

                  <p className="whitespace-nowrap text-sm font-extrabold">
                    {formatCurrency(sale.total, locale)}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <PaymentBadge
                    method={sale.paymentMethod}
                    locale={locale}
                  />

                  <span className="rounded-full bg-[#f3f3ef] px-2.5 py-1 text-[10px] font-bold text-black/40">
                    {sale.branchName || t.mainOutlet}
                  </span>

                  <span className="text-[10px] font-bold text-black/30">
                    {formatDate(sale.createdAt, locale)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-12 text-center text-xs text-black/35">
              {t.noTransactions}
            </div>
          )}
        </div>

        {/* desktop */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-full text-left">
            <thead className="bg-[#fafaf8]">
              <tr className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-black/30">
                <th className="px-6 py-3.5">{t.order}</th>
                <th className="px-5 py-3.5">{t.customer}</th>
                <th className="px-5 py-3.5">{t.branch}</th>
                <th className="px-5 py-3.5">{t.payment}</th>
                <th className="px-5 py-3.5">{t.time}</th>
                <th className="px-6 py-3.5 text-right">{t.total}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-black/[0.06]">
              {data?.recentSales.length ? (
                data.recentSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="text-xs text-black/50 transition hover:bg-[#fafaf8]"
                  >
                    <td className="px-6 py-4 font-extrabold text-black">
                      {sale.orderCode}
                    </td>

                    <td className="px-5 py-4">
                      {sale.name || t.generalCustomer}
                    </td>

                    <td className="px-5 py-4">
                      {sale.branchName || t.mainOutlet}
                    </td>

                    <td className="px-5 py-4">
                      <PaymentBadge
                        method={sale.paymentMethod}
                        locale={locale}
                      />
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      {formatDate(sale.createdAt, locale)}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-right font-extrabold text-black">
                      {formatCurrency(sale.total, locale)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-14 text-center text-xs text-black/35"
                  >
                    {t.noTransactions}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.16em] text-black/30">
        {label}
      </span>

      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-11 w-full appearance-none rounded-xl border border-black/[0.08] bg-white px-3 pr-9 text-xs font-extrabold text-black/65 outline-none transition focus:border-black/25 disabled:cursor-not-allowed disabled:bg-[#f4f4f0] disabled:text-black/25"
        >
          {children}
        </select>

        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/25"
        />
      </span>
    </label>
  );
}

function MiniMetric({
  icon: Icon,
  label,
  value,
  meta,
  dark = false,
}: {
  icon: React.ComponentType<{
    size?: number;
    className?: string;
  }>;
  label: string;
  value: string;
  meta: string;
  dark?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-[22px] border p-5",
        dark
          ? "border-black bg-black text-white"
          : "border-black/[0.08] bg-white text-black",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <div
          className={[
            "flex h-9 w-9 items-center justify-center rounded-xl",
            dark
              ? "bg-white/10 text-white/70"
              : "bg-[#f3f3ef] text-black/45",
          ].join(" ")}
        >
          <Icon size={15} />
        </div>

        <ArrowRight
          size={13}
          className={dark ? "text-white/20" : "text-black/15"}
        />
      </div>

      <p
        className={[
          "mt-6 text-[9px] font-extrabold uppercase tracking-[0.15em]",
          dark ? "text-white/35" : "text-black/30",
        ].join(" ")}
      >
        {label}
      </p>

      <p className="mt-1 truncate text-xl font-semibold tracking-[-0.04em]">
        {value}
      </p>

      <p
        className={[
          "mt-2 truncate text-[10px] font-bold",
          dark ? "text-white/30" : "text-black/30",
        ].join(" ")}
      >
        {meta}
      </p>
    </div>
  );
}

function FinanceItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{
    size?: number;
    className?: string;
  }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-white p-3.5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3f3ef] text-black/45">
          <Icon size={15} />
        </div>

        <span className="text-xs font-bold text-black/45">
          {label}
        </span>
      </div>

      <span className="text-xs font-extrabold">
        {value}
      </span>
    </div>
  );
}

function PaymentBadge({
  method,
  locale,
}: {
  method: "cash" | "qris" | null | undefined;
  locale: Locale;
}) {
  const t = copy[locale];

  const label =
    method === "cash"
      ? t.cash
      : method === "qris"
        ? t.qris
        : t.other;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-2.5 py-1 text-[10px] font-extrabold text-black/50">
      <CreditCard size={11} />
      {label}
    </span>
  );
}
