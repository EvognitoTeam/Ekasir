"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { animate, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Clock3,
  Coffee,
  Gift,
  Package,
  Settings,
  Sofa,
  Store,
  Tag,
  Users,
  BookOpen,
} from "lucide-react";

import { useLanguageStore } from "@/store/language.store";

type Locale = "id" | "en";

type AdminRoute =
  | "sales"
  | "ledger"
  | "menu"
  | "addon"
  | "table"
  | "promos"
  | "branch"
  | "staff"
  | "loyalty"
  | "settings";

type DashboardStats = {
  targetOrderCount: number;
  activeOrdersCount: number;
  depleted: number;
  lowStock: number;
  activePromoCount: number;
};

const copy = {
  id: {
    livePerformance: "Live performance",
    todaySummary: "Ringkasan hari ini",
    yesterdaySummary: "Ringkasan kemarin",
    description:
      "Pantau kondisi outlet dan akses modul pengelolaan dari satu tempat.",
    today: "Hari ini",
    yesterday: "Kemarin",

    totalOrders: "Total Order",
    totalOrdersDesc: "Order pada periode terpilih",
    activeQueue: "Antrean Aktif",
    activeQueueDesc: "Order yang masih berjalan",
    soldOut: "Menu Habis",
    soldOutDesc: "Produk yang tidak tersedia",
    lowStock: "Stok Menipis",
    lowStockDesc: "Perlu perhatian segera",
    activePromo: "Promo Aktif",
    activePromoDesc: "Kampanye yang sedang berjalan",

    pulse: "Operational pulse",
    outletCondition: "Kondisi outlet",
    pulseDescription:
      "Indikator cepat berdasarkan data operasional yang tersedia.",
    queue: "Antrean",
    inventory: "Stok",
    promo: "Promo",
    normal: "Normal",
    active: "Aktif",
    attention: "Perlu perhatian",
    none: "Tidak ada aktif",

    workspace: "Workspace",
    modules: "Modul manajemen",
    modulesDescription:
      "Buka modul yang dibutuhkan untuk mengelola operasional KALOO POS.",
    openModule: "Buka modul",

    module: {
      sales: ["Penjualan", "Analitik & performa"],
      ledger: ["Transaksi", "Riwayat & detail order"],
      menu: ["Katalog Menu", "Produk & kategori"],
      addon: ["Addon Menu", "Opsi & tambahan menu"],
      table: ["Daftar Meja", "Meja, QR & reservasi"],
      promos: ["Promo & Event", "Diskon & kampanye"],
      branch: ["Cabang Outlet", "Lokasi & cabang"],
      staff: ["Staf & PIN", "Akses karyawan"],
      loyalty: ["Loyalty & Points", "Program pelanggan"],
      settings: ["Konfigurasi", "Pajak & sistem"],
    },
  },

  en: {
    livePerformance: "Live performance",
    todaySummary: "Today's overview",
    yesterdaySummary: "Yesterday's overview",
    description:
      "Monitor outlet conditions and access management modules from one place.",
    today: "Today",
    yesterday: "Yesterday",

    totalOrders: "Total Orders",
    totalOrdersDesc: "Orders in the selected period",
    activeQueue: "Active Queue",
    activeQueueDesc: "Orders still in progress",
    soldOut: "Sold Out",
    soldOutDesc: "Products currently unavailable",
    lowStock: "Low Stock",
    lowStockDesc: "Requires immediate attention",
    activePromo: "Active Promos",
    activePromoDesc: "Campaigns currently running",

    pulse: "Operational pulse",
    outletCondition: "Outlet condition",
    pulseDescription:
      "A quick snapshot based on the operational data currently available.",
    queue: "Queue",
    inventory: "Inventory",
    promo: "Promos",
    normal: "Normal",
    active: "Active",
    attention: "Needs attention",
    none: "None active",

    workspace: "Workspace",
    modules: "Management modules",
    modulesDescription:
      "Open the modules you need to manage KALOO POS operations.",
    openModule: "Open module",

    module: {
      sales: ["Sales", "Analytics & performance"],
      ledger: ["Transactions", "Order history & details"],
      menu: ["Menu Catalog", "Products & categories"],
      addon: ["Menu Add-ons", "Options & extras"],
      table: ["Tables", "Tables, QR & reservations"],
      promos: ["Promos & Events", "Discounts & campaigns"],
      branch: ["Outlets", "Locations & branches"],
      staff: ["Staff & PIN", "Employee access"],
      loyalty: ["Loyalty & Points", "Customer program"],
      settings: ["Configuration", "Tax & system"],
    },
  },
} as const;

const MODULES: Array<{
  id: AdminRoute;
  icon: LucideIcon;
}> = [
  { id: "sales", icon: BarChart3 },
  { id: "ledger", icon: BookOpen },
  { id: "menu", icon: Coffee },
  { id: "addon", icon: Package },
  { id: "table", icon: Sofa },
  { id: "promos", icon: Tag },
  { id: "branch", icon: Store },
  { id: "staff", icon: Users },
  { id: "loyalty", icon: Gift },
  { id: "settings", icon: Settings },
];

function AnimatedCounter({
  value,
  locale,
}: {
  value: number;
  locale: Locale;
}) {
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const controls = animate(
      Number(node.textContent?.replace(/\D/g, "")) || 0,
      value,
      {
        duration: 0.7,
        ease: "easeOut",
        onUpdate: (current) => {
          node.textContent = Math.round(current).toLocaleString(
            locale === "id" ? "id-ID" : "en-US",
          );
        },
      },
    );

    return () => controls.stop();
  }, [locale, value]);

  return (
    <span ref={nodeRef}>
      {value.toLocaleString(locale === "id" ? "id-ID" : "en-US")}
    </span>
  );
}

export default function AdminDashboardPage() {
  const params = useParams<{ mitraSlug: string }>();
  const router = useRouter();

  const slug = String(params.mitraSlug ?? "");
  const locale = useLanguageStore((state) => state.locale) as Locale;
  const t = copy[locale];

  const [overviewDate, setOverviewDate] = useState<"today" | "yesterday">(
    "today",
  );

  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<DashboardStats>({
    targetOrderCount: 0,
    activeOrdersCount: 0,
    depleted: 0,
    lowStock: 0,
    activePromoCount: 0,
  });

  useEffect(() => {
    if (!slug) return;

    const controller = new AbortController();

    setLoading(true);

    fetch(
      `/api/pos/dashboard?slug=${encodeURIComponent(
        slug,
      )}&date=${overviewDate}`,
      {
        signal: controller.signal,
        cache: "no-store",
        credentials: "include",
      },
    )
      .then((response) => response.json())
      .then((result) => {
        if (!result.success || !result.data) return;

        setStats({
          targetOrderCount: Number(result.data.targetOrderCount ?? 0),
          activeOrdersCount: Number(result.data.activeOrdersCount ?? 0),
          depleted: Number(result.data.depleted ?? 0),
          lowStock: Number(result.data.lowStock ?? 0),
          activePromoCount: Number(result.data.activePromoCount ?? 0),
        });
      })
      .catch((error) => {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error("[ADMIN_DASHBOARD_ERROR]", error);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [overviewDate, slug]);

  const statCards = useMemo(
    () => [
      {
        label: t.totalOrders,
        description: t.totalOrdersDesc,
        value: stats.targetOrderCount,
        icon: BarChart3,
        route: "sales" as AdminRoute,
      },
      {
        label: t.activeQueue,
        description: t.activeQueueDesc,
        value: stats.activeOrdersCount,
        icon: Clock3,
        route: "ledger" as AdminRoute,
      },
      {
        label: t.soldOut,
        description: t.soldOutDesc,
        value: stats.depleted,
        icon: Coffee,
        route: "menu" as AdminRoute,
      },
      {
        label: t.lowStock,
        description: t.lowStockDesc,
        value: stats.lowStock,
        icon: Package,
        route: "menu" as AdminRoute,
      },
      {
        label: t.activePromo,
        description: t.activePromoDesc,
        value: stats.activePromoCount,
        icon: Tag,
        route: "promos" as AdminRoute,
      },
    ],
    [stats, t],
  );

  const navigateTo = (route: AdminRoute) => {
    router.push(`/${slug}/admin/${route}`);
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-black/[0.08] bg-black text-white">
        <div className="grid xl:grid-cols-[1fr_360px]">
          <div className="px-6 py-7 sm:px-8 sm:py-9 lg:px-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-white/55">
                {t.livePerformance}
              </span>

              <span className="rounded-full border border-white/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">
                KALOO POS
              </span>
            </div>

            <h2 className="mt-7 max-w-3xl text-4xl font-semibold leading-[0.96] tracking-[-0.05em] sm:text-5xl">
              {overviewDate === "today"
                ? t.todaySummary
                : t.yesterdaySummary}
            </h2>

            <p className="mt-5 max-w-2xl text-sm leading-6 text-white/50">
              {t.description}
            </p>

            <div className="mt-8 inline-flex rounded-full border border-white/10 bg-white/[0.06] p-1">
              <button
                type="button"
                onClick={() => setOverviewDate("today")}
                className={[
                  "rounded-full px-4 py-2 text-xs font-extrabold transition",
                  overviewDate === "today"
                    ? "bg-white text-black"
                    : "text-white/45 hover:text-white",
                ].join(" ")}
              >
                {t.today}
              </button>

              <button
                type="button"
                onClick={() => setOverviewDate("yesterday")}
                className={[
                  "rounded-full px-4 py-2 text-xs font-extrabold transition",
                  overviewDate === "yesterday"
                    ? "bg-white text-black"
                    : "text-white/45 hover:text-white",
                ].join(" ")}
              >
                {t.yesterday}
              </button>
            </div>
          </div>

          <div className="border-t border-white/10 bg-white/[0.04] p-6 xl:border-l xl:border-t-0">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-white/30">
              {t.pulse}
            </p>

            <h3 className="mt-2 text-lg font-extrabold">
              {t.outletCondition}
            </h3>

            <p className="mt-2 text-xs leading-5 text-white/40">
              {t.pulseDescription}
            </p>

            <div className="mt-6 space-y-2">
              <PulseRow
                label={t.queue}
                value={stats.activeOrdersCount}
                state={stats.activeOrdersCount > 0 ? t.active : t.normal}
              />

              <PulseRow
                label={t.inventory}
                value={stats.lowStock + stats.depleted}
                state={
                  stats.lowStock + stats.depleted > 0
                    ? t.attention
                    : t.normal
                }
              />

              <PulseRow
                label={t.promo}
                value={stats.activePromoCount}
                state={stats.activePromoCount > 0 ? t.active : t.none}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <button
              type="button"
              key={card.label}
              onClick={() => navigateTo(card.route)}
              className="group min-w-0 rounded-[24px] border border-black/[0.08] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-black/15 hover:shadow-[0_12px_35px_rgba(0,0,0,0.05)] sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f2f2ee] text-black/55">
                  <Icon size={17} strokeWidth={1.8} />
                </span>

                <ArrowUpRight
                  size={14}
                  className="text-black/20 transition group-hover:text-black/55"
                />
              </div>

              <p className="mt-6 text-[9px] font-extrabold uppercase tracking-[0.15em] text-black/35">
                {card.label}
              </p>

              <p className="mt-1 text-3xl font-semibold tracking-[-0.045em]">
                {loading ? (
                  <span className="inline-block h-8 w-12 animate-pulse rounded-lg bg-black/[0.06]" />
                ) : (
                  <AnimatedCounter value={card.value} locale={locale} />
                )}
              </p>

              <p className="mt-2 hidden text-[10px] leading-4 text-black/35 sm:block">
                {card.description}
              </p>
            </button>
          );
        })}
      </section>

      <section className="rounded-[28px] border border-black/[0.08] bg-white p-5 sm:p-6 lg:p-7">
        <div className="border-b border-black/[0.08] pb-5">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-black/30">
            {t.workspace}
          </p>

          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
            {t.modules}
          </h3>

          <p className="mt-2 max-w-xl text-xs leading-5 text-black/40">
            {t.modulesDescription}
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {MODULES.map((item) => {
            const Icon = item.icon;
            const [label, description] = t.module[item.id];

            return (
              <motion.button
                type="button"
                key={item.id}
                whileHover={{ y: -2 }}
                onClick={() => navigateTo(item.id)}
                className="group flex min-w-0 items-center gap-4 rounded-[22px] border border-black/[0.08] bg-[#fafaf8] p-4 text-left transition hover:border-black/15 hover:bg-white hover:shadow-[0_12px_32px_rgba(0,0,0,0.045)]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-black/[0.08] bg-white text-black/50 transition group-hover:bg-black group-hover:text-white">
                  <Icon size={18} strokeWidth={1.8} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold">
                    {label}
                  </span>

                  <span className="mt-1 block truncate text-[10px] text-black/35">
                    {description}
                  </span>
                </span>

                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white text-black/25 transition group-hover:text-black">
                  <ArrowRight size={13} />
                </span>
              </motion.button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function PulseRow({
  label,
  value,
  state,
}: {
  label: string;
  value: number;
  state: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
      <div>
        <p className="text-[10px] font-bold text-white/45">
          {label}
        </p>

        <p className="mt-0.5 text-xs font-extrabold text-white/75">
          {state}
        </p>
      </div>

      <span className="text-2xl font-semibold tracking-[-0.04em] text-white">
        {value}
      </span>
    </div>
  );
}
