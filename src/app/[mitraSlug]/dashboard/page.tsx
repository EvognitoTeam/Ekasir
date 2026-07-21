'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, animate, motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  Clock3,
  Coffee,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  Settings,
  ShieldCheck,
  Sofa,
  Store,
  Tag,
  Users,
  X,
} from 'lucide-react';

const LoadingFallback = () => (
  <div className="flex min-h-64 w-full flex-col items-center justify-center text-stone-400">
    <Loader2 className="mb-3 h-8 w-8 animate-spin text-[var(--color-primary)]" />
    <p className="text-[10px] font-bold uppercase tracking-[0.18em]">Memuat modul</p>
  </div>
);

const MenuEditor = dynamic(() => import('@/components/admin/MenuEditor'), { loading: LoadingFallback });
const OrderLedger = dynamic(() => import('@/components/admin/OrderLedger'), { loading: LoadingFallback });
const SalesHistoryPanel = dynamic(() => import('@/components/admin/SalesHistoryPanel'), { loading: LoadingFallback });
const SystemConfig = dynamic(() => import('@/components/admin/SystemConfig'), { loading: LoadingFallback });
const InventoryPanel = dynamic(() => import('@/components/admin/InventoryPanel'), { loading: LoadingFallback });
const PromoManager = dynamic(() => import('@/components/admin/PromoManager'), { loading: LoadingFallback });
const StaffManager = dynamic(() => import('@/components/admin/StaffManager'), { loading: LoadingFallback });
const TableConfig = dynamic(() => import('@/components/admin/TableConfig'), { loading: LoadingFallback });
const BranchManager = dynamic(() => import('@/components/admin/BranchManager'), { loading: LoadingFallback });

type AdminTab = 'dashboard' | 'sales' | 'menu' | 'ledger' | 'inventory' | 'table' | 'promos' | 'staff' | 'branch' | 'settings';

type NavItem = {
  id: AdminTab;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
};

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Ringkasan',
    items: [
      { id: 'dashboard', label: 'Dashboard', description: 'Ringkasan operasional', icon: LayoutDashboard },
      { id: 'sales', label: 'Riwayat Penjualan', description: 'Grafik dan produk terlaris', icon: BarChart3 },
      { id: 'ledger', label: 'Transaksi', description: 'Status dan detail order', icon: BookOpen },
    ],
  },
  {
    label: 'Operasional',
    items: [
      { id: 'menu', label: 'Katalog Menu', description: 'Produk dan kategori', icon: Coffee },
      { id: 'inventory', label: 'Bahan Baku', description: 'Stok dan peringatan', icon: Package },
      { id: 'table', label: 'Daftar Meja', description: 'Meja dan QR', icon: Sofa },
      { id: 'promos', label: 'Promo & Event', description: 'Diskon dan kampanye', icon: Tag },
    ],
  },
  {
    label: 'Organisasi',
    items: [
      { id: 'branch', label: 'Cabang Outlet', description: 'Lokasi dan cabang', icon: Store },
      { id: 'staff', label: 'Staf & PIN', description: 'Akses karyawan', icon: Users },
      { id: 'settings', label: 'Konfigurasi', description: 'Pajak dan sistem', icon: Settings },
    ],
  },
];

const TITLES: Record<AdminTab, string> = {
  dashboard: 'Dashboard Operasional',
  sales: 'Riwayat Penjualan',
  menu: 'Katalog Menu',
  ledger: 'Ledger Transaksi',
  inventory: 'Bahan Baku',
  table: 'Daftar Meja',
  promos: 'Promo & Event',
  staff: 'Staf & PIN',
  branch: 'Cabang Outlet',
  settings: 'Konfigurasi Sistem',
};

function AnimatedCounter({ value }: { value: number }) {
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    const controls = animate(Number(node.textContent) || 0, value, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate: (current) => {
        node.textContent = Math.round(current).toLocaleString('id-ID');
      },
    });
    return () => controls.stop();
  }, [value]);

  return <span ref={nodeRef}>{value}</span>;
}

export default function AdminDashboardPage() {
  const params = useParams<{ mitraSlug: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const slug = params.mitraSlug;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [overviewDate, setOverviewDate] = useState<'today' | 'yesterday'>('today');
  const [currentTime, setCurrentTime] = useState('');
  const [dashboardStats, setDashboardStats] = useState({
    targetOrderCount: 0,
    activeOrdersCount: 0,
    depleted: 0,
    lowStock: 0,
    activePromoCount: 0,
  });

  const routeInfo = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    const adminIndex = segments.indexOf('admin');
    const branchSlug = adminIndex === 2 ? segments[1] : undefined;
    const rawTab = adminIndex >= 0 ? segments[adminIndex + 1] : 'dashboard';
    const allowed: AdminTab[] = ['dashboard', 'sales', 'menu', 'ledger', 'inventory', 'table', 'promos', 'staff', 'branch', 'settings'];
    const activeTab = allowed.includes(rawTab as AdminTab) ? (rawTab as AdminTab) : 'dashboard';
    const basePath = branchSlug ? `/${slug}/${branchSlug}/admin` : `/${slug}/admin`;
    const customerBase = branchSlug ? `/${slug}/${branchSlug}` : `/${slug}`;
    return { activeTab, basePath, customerBase, branchSlug };
  }, [pathname, slug]);

  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(
        new Date().toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB',
      );
    };
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (routeInfo.activeTab !== 'dashboard') return;
    const controller = new AbortController();

    fetch(`/api/pos/dashboard?slug=${encodeURIComponent(slug)}&date=${overviewDate}`, {
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((result) => {
        if (!result.success || !result.data) return;
        setDashboardStats({
          targetOrderCount: Number(result.data.targetOrderCount || 0),
          activeOrdersCount: Number(result.data.activeOrdersCount || 0),
          depleted: Number(result.data.depleted || 0),
          lowStock: Number(result.data.lowStock || 0),
          activePromoCount: Number(result.data.activePromoCount || 0),
        });
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Gagal mengambil ringkasan dashboard:', error);
      });

    return () => controller.abort();
  }, [slug, overviewDate, routeInfo.activeTab]);

  const navigateTo = (tab: AdminTab) => {
    setSidebarOpen(false);
    router.push(`${routeInfo.basePath}/${tab}`);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    document.cookie = 'ekasir_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.replace('/login');
    router.refresh();
  };

  const renderContent = () => {
    switch (routeInfo.activeTab) {
      case 'sales': return <SalesHistoryPanel />;
      case 'menu': return <MenuEditor />;
      case 'ledger': return <OrderLedger />;
      case 'inventory': return <InventoryPanel />;
      case 'table': return <TableConfig />;
      case 'promos': return <PromoManager />;
      case 'staff': return <StaffManager />;
      case 'branch': return <BranchManager />;
      case 'settings': return <SystemConfig />;
      default:
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">Live performance</p>
                <h2 className="font-display text-2xl font-black tracking-tight text-stone-900">Ringkasan hari ini</h2>
                <p className="mt-1 text-sm text-stone-500">Pantau kondisi outlet dan akses modul pengelolaan.</p>
              </div>
              <select
                value={overviewDate}
                onChange={(event) => setOverviewDate(event.target.value as 'today' | 'yesterday')}
                className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 outline-none focus:border-[var(--color-primary)]"
              >
                <option value="today">Hari ini</option>
                <option value="yesterday">Kemarin</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {([
                ['Total Order', dashboardStats.targetOrderCount, BarChart3],
                ['Antrean Aktif', dashboardStats.activeOrdersCount, Clock3],
                ['Menu Habis', dashboardStats.depleted, Coffee],
                ['Stok Menipis', dashboardStats.lowStock, Package],
                ['Promo Aktif', dashboardStats.activePromoCount, Tag],
              ] satisfies Array<[string, number, LucideIcon]>).map(([label, value, Icon]) => (
                <div key={String(label)} className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm">
                  <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400">{String(label)}</p>
                  <p className="mt-1 font-display text-2xl font-black text-stone-900"><AnimatedCounter value={Number(value)} /></p>
                </div>
              ))}
            </div>

            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">Workspace</p>
                  <h3 className="font-display text-xl font-black text-stone-900">Modul manajemen</h3>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {NAV_GROUPS.flatMap((group) => group.items).filter((item) => item.id !== 'dashboard').map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigateTo(item.id)}
                      className="group flex items-center gap-4 rounded-2xl border border-stone-200/80 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-[var(--color-primary)] transition group-hover:bg-[var(--color-primary)] group-hover:text-white">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-sm font-black text-stone-900">{item.label}</span>
                        <span className="mt-0.5 block truncate text-xs text-stone-500">{item.description}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-stone-300" />
                    </button>
                  );
                })}
              </div>
            </section>
          </motion.div>
        );
    }
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#f7f6f3] font-body text-stone-900">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.button
            aria-label="Tutup sidebar"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] md:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[270px] flex-col border-r border-stone-200 bg-white transition-transform duration-300 md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center justify-between border-b border-stone-100 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white shadow-sm"><Store className="h-4 w-4" /></div>
            <div>
              <p className="font-display text-xs font-black uppercase tracking-[0.12em] text-stone-900">EKASIR Admin</p>
              <p className="text-[10px] font-medium text-stone-400">Pusat kendali outlet</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 md:hidden"><X className="h-4 w-4" /></button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4 border-b border-stone-100 pb-4 last:border-0">
              <p className="mb-1.5 px-2 text-[9px] font-bold uppercase tracking-[0.18em] text-stone-400">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = routeInfo.activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigateTo(item.id)}
                      className={`relative flex w-full items-center justify-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? 'bg-stone-100 text-stone-950' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'}`}
                    >
                      {active && <span className="absolute left-0 h-5 w-[3px] rounded-r bg-[var(--color-primary)]" />}
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-[var(--color-primary)] text-white' : 'bg-stone-100 text-stone-500'}`}><Icon className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-xs font-bold">{item.label}</span>
                        <span className="block truncate text-[10px] text-stone-400">{item.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-2 border-t border-stone-100 p-3">
          <button onClick={() => router.push(`${routeInfo.customerBase}/menu`)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"><PanelLeftClose className="h-4 w-4" />Lihat menu customer</button>
          <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100"><LogOut className="h-4 w-4" />Keluar</button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 md:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="rounded-lg border border-stone-200 p-2 text-stone-600 md:hidden"><Menu className="h-4 w-4" /></button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-stone-400"><ShieldCheck className="h-3 w-3 text-emerald-600" />Administrator <ChevronRight className="h-3 w-3" /> {TITLES[routeInfo.activeTab]}</div>
              <h1 className="truncate font-display text-base font-black text-stone-900">{TITLES[routeInfo.activeTab]}</h1>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-lg bg-stone-100 px-3 py-2 font-mono text-[10px] font-bold text-stone-500 sm:flex"><Clock3 className="h-3.5 w-3.5" />{currentTime}</div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-7">
          <div className="mx-auto max-w-[1440px]">
            <AnimatePresence mode="wait">
              <motion.div key={routeInfo.activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
