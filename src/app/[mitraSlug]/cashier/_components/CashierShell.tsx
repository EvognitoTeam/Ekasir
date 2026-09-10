'use client';

import { type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Armchair,
  BellRing,
  CalendarDays,
  ChefHat,
  Clock3,
  LogOut,
  Package,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Store,
} from 'lucide-react';

import { formatPrice } from '@/utils/formatters';
import CashierLogin from './CashierLogin';
import CashPaymentModal from './CashPaymentModal';
import PrinterSettingsModal from './PrinterSettingsModal';
import { useCashier } from '../_providers/CashierProvider';

export default function CashierShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    slug,
    isBooting,
    isAuthenticated,
    role,
    staffName,
    storeName,
    orderCounts,
    todayOrderCount,
    todayRevenue,
    notification,
    fetchOrders,
    logout,
    selectedPrinter,
    setShowPrinterModal,
  } = useCashier();

  if (isBooting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7f4]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-black/15 border-t-black" />
          <p className="mt-4 text-[9px] font-black uppercase tracking-[.18em] text-black/30">Menyiapkan kasir</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <CashierLogin />;

  const base = `/${slug}/cashier`;
  const nav = [
    { href: base, label: 'New Sale', icon: Plus, exact: true, count: null, primary: true },
    { href: `${base}/new-order`, label: 'Pesanan Baru', icon: BellRing, count: orderCounts.pending },
    { href: `${base}/kitchen`, label: 'Proses Dapur', icon: ChefHat, count: orderCounts.kitchen },
    { href: `${base}/ready`, label: 'Siap Saji', icon: ReceiptText, count: orderCounts.ready },
    { href: `${base}/history`, label: 'Riwayat', icon: Clock3, count: orderCounts.history },
    { href: `${base}/tables`, label: 'Meja', icon: Armchair, count: null },
    { href: `${base}/reservations`, label: 'Reservasi', icon: CalendarDays, count: null },
    { href: `${base}/stock`, label: 'Stok', icon: Package, count: null },
  ];

  const isActive = (item: (typeof nav)[number]) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#f7f7f4] text-black">
      <aside className="hidden w-[96px] shrink-0 flex-col border-r border-black/[0.07] bg-white lg:flex">
        <div className="flex h-[76px] items-center justify-center border-b border-black/[0.06]">
          <button type="button" onClick={() => router.push(base)} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white">
            <Store className="h-5 w-5" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2.5">
          {nav.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <div key={item.href} className={index === 1 || index === 5 ? 'pt-3' : ''}>
                <button
                  type="button"
                  onClick={() => router.push(item.href)}
                  className={`relative flex min-h-[62px] w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 transition ${
                    item.primary
                      ? active
                        ? 'bg-black text-white'
                        : 'bg-black text-white hover:bg-black/85'
                      : active
                        ? 'bg-[#ecece7] text-black'
                        : 'text-black/35 hover:bg-[#f5f5f1] hover:text-black'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <span className="max-w-full truncate text-[8px] font-black leading-3">{item.label}</span>
                  {typeof item.count === 'number' && item.count > 0 && (
                    <span className={`absolute right-2 top-2 min-w-4 rounded-full px-1 text-[7px] font-black ${active ? 'bg-black text-white' : 'bg-black text-white'}`}>
                      {item.count}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-black/[0.06] p-2.5">
          <button
            type="button"
            onClick={() => setShowPrinterModal(true)}
            className="relative flex min-h-[58px] w-full flex-col items-center justify-center gap-1 rounded-2xl bg-[#f5f5f1] text-black/45"
          >
            <Printer className="h-4 w-4" />
            <span className="text-[8px] font-black">Printer</span>
            <span className={`absolute right-2 top-2 h-2 w-2 rounded-full ${selectedPrinter ? 'bg-emerald-500' : 'bg-black/15'}`} />
          </button>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[76px] shrink-0 items-center justify-between gap-3 border-b border-black/[0.07] bg-white px-4 sm:px-5 lg:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-black tracking-[-.02em]">{storeName}</p>
              <span className="hidden rounded-full bg-[#f2f2ee] px-2 py-1 text-[7px] font-black uppercase tracking-[.1em] text-black/35 sm:inline">Cashier</span>
            </div>
            <p className="mt-1 truncate text-[9px] font-bold text-black/30">{staffName || 'Staff'} · {role}</p>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <TopMetric label="Today" value={`${todayOrderCount} order`} />
            <TopMetric label="Revenue" value={formatPrice(todayRevenue)} />
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void fetchOrders()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f2f2ee]" title="Refresh order">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setShowPrinterModal(true)} className="flex h-10 items-center gap-2 rounded-xl bg-[#f2f2ee] px-3 text-[9px] font-black">
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Printer</span>
            </button>
            <button type="button" onClick={() => void logout()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600" title="Akhiri sesi">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="border-b border-black/[0.06] bg-white px-3 py-2 lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => router.push(item.href)}
                  className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-[9px] font-black ${
                    active ? 'bg-black text-white' : 'bg-[#f2f2ee] text-black/45'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                  {typeof item.count === 'number' && item.count > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[7px] ${active ? 'bg-white/15' : 'bg-white'}`}>{item.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </section>

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            className="fixed left-1/2 top-5 z-[900] flex -translate-x-1/2 items-center gap-2 rounded-full bg-black px-4 py-2.5 text-[10px] font-black text-white shadow-2xl"
          >
            <BellRing className="h-4 w-4" />
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      <CashPaymentModal />
      <PrinterSettingsModal />
    </div>
  );
}

function TopMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f5f5f1] px-3 py-2">
      <p className="text-[7px] font-black uppercase tracking-[.1em] text-black/25">{label}</p>
      <p className="mt-0.5 text-[9px] font-black">{value}</p>
    </div>
  );
}
