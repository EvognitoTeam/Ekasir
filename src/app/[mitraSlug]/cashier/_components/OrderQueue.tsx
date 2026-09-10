'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, ChefHat, Clock3, PackageCheck, Plus, ShoppingBag } from 'lucide-react';

import OrderCard from '@/components/cashier/OrderCard';
import { formatPrice } from '@/utils/formatters';
import { useCashier, orderPaymentStatus } from '../_providers/CashierProvider';

export type OrderQueueMode = 'pending' | 'kitchen' | 'ready' | 'history';

const modeConfig = {
  pending: {
    title: 'Pesanan Baru',
    description: 'Order baru yang menunggu konfirmasi kasir.',
    icon: BellRing,
  },
  kitchen: {
    title: 'Proses Dapur',
    description: 'Pantau order confirmed dan preparing yang sedang dikerjakan.',
    icon: ChefHat,
  },
  ready: {
    title: 'Siap Saji',
    description: 'Order yang sudah siap untuk diserahkan atau disajikan.',
    icon: PackageCheck,
  },
  history: {
    title: 'Riwayat',
    description: 'Order completed dan cancelled.',
    icon: Clock3,
  },
} as const;

export default function OrderQueue({ mode }: { mode: OrderQueueMode }) {
  const router = useRouter();
  const {
    slug,
    role,
    orders,
    orderCounts,
    updateOrderStatus,
    updateOrderNote,
    handlePrintOrder,
  } = useCashier();

  const config = modeConfig[mode];
  const Icon = config.icon;

  const filtered = useMemo(() => {
    return [...orders]
      .filter((order) => {
        if (mode === 'pending') return order.status === 'pending';
        if (mode === 'kitchen') return order.status === 'confirmed' || order.status === 'preparing';
        if (mode === 'ready') return order.status === 'ready';
        return order.status === 'completed' || order.status === 'cancelled';
      })
      .sort((a, b) => {
        const idA = Number(a.id) || 0;
        const idB = Number(b.id) || 0;
        if (idA !== idB) return idB - idA;
        const dateA = new Date(String((a as any).createdAt || (a as any).created_at || 0).replace(' ', 'T')).getTime() || 0;
        const dateB = new Date(String((b as any).createdAt || (b as any).created_at || 0).replace(' ', 'T')).getTime() || 0;
        return dateB - dateA;
      });
  }, [mode, orders]);

  const unpaid = filtered.filter((order) => orderPaymentStatus(order) === '1').length;
  const queueValue = filtered.reduce(
    (sum, order) =>
      sum +
      (Number(
        (order as any).totalAfterDiscount ??
          (order as any).total_after_discount ??
          (order as any).totalPrice ??
          (order as any).total_price ??
          0,
      ) || 0),
    0,
  );

  const quickTabs = [
    ['new-order', 'Baru', orderCounts.pending],
    ['kitchen', 'Dapur', orderCounts.kitchen],
    ['ready', 'Ready', orderCounts.ready],
    ['history', 'Riwayat', orderCounts.history],
  ] as const;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="shrink-0 border-b border-black/[0.06] bg-white px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-black/30">
              <Icon className="h-4 w-4" />
              <p className="text-[9px] font-black uppercase tracking-[.16em]">Order queue</p>
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-[-.05em]">{config.title}</h1>
            <p className="mt-2 text-[10px] leading-5 text-black/40">{config.description}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[420px]">
            <Metric label="Order" value={String(filtered.length)} />
            <Metric label="Belum bayar" value={String(unpaid)} />
            <Metric label="Nilai queue" value={formatPrice(queueValue)} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto">
            {quickTabs.map(([path, label, count]) => {
              const active = path === (mode === 'pending' ? 'new-order' : mode);
              return (
                <button
                  key={path}
                  type="button"
                  onClick={() => router.push(`/${slug}/cashier/${path}`)}
                  className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-[9px] font-black ${
                    active ? 'bg-black text-white' : 'bg-[#f2f2ee] text-black/45'
                  }`}
                >
                  {label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[7px] ${active ? 'bg-white/15' : 'bg-white'}`}>{count}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => router.push(`/${slug}/cashier`)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-black px-4 text-[9px] font-black uppercase tracking-[.08em] text-white"
          >
            <Plus className="h-4 w-4" />
            Buat Pesanan
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {filtered.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-[26px] border border-dashed border-black/15 bg-white">
              <ShoppingBag className="h-7 w-7 text-black/20" />
            </span>
            <h2 className="mt-5 text-xl font-black">Tidak ada order</h2>
            <p className="mt-2 max-w-sm text-xs leading-5 text-black/35">Belum ada pesanan di status ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            <AnimatePresence>
              {filtered.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.16 }}
                  className="min-w-0"
                >
                  <OrderCard
                    order={order}
                    onUpdateStatus={updateOrderStatus}
                    onUpdateNote={updateOrderNote}
                    onPrintOrder={handlePrintOrder}
                    role={role === 'cashier' || role === 'owner' ? 'cashier' : 'cashier'}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f5f5f1] p-3">
      <p className="text-[7px] font-black uppercase tracking-[.11em] text-black/25">{label}</p>
      <p className="mt-1 truncate text-xs font-black">{value}</p>
    </div>
  );
}
