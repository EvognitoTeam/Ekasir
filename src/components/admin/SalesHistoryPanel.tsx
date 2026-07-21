'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Loader2,
  Package,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  Store,
  TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Granularity = 'year' | 'month' | 'day';

type AnalyticsData = {
  branches: Array<{ id: number; name: string; slug: string }>;
  summary: {
    revenue: number;
    orders: number;
    averageOrder: number;
    discount: number;
    tax: number;
    service: number;
  };
  trend: Array<{ period: string; revenue: number; orders: number }>;
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
    paymentMethod?: 'cash' | 'qris' | null;
    total: number;
    createdAt?: string | null;
  }>;
};

const rupiah = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);

const compact = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

function labelPeriod(period: string, granularity: Granularity) {
  if (granularity === 'year') return period;
  if (granularity === 'month') {
    const [year, month] = period.split('-').map(Number);
    return new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(year, month - 1, 1));
  }
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(new Date(`${period}T00:00:00`));
}

export default function SalesHistoryPanel() {
  const now = new Date();
  const [granularity, setGranularity] = useState<Granularity>('month');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [branch, setBranch] = useState('all');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    const params = new URLSearchParams({
      granularity,
      year: String(year),
      month: String(month),
      branch,
    });

    fetch(`/api/pos/sales-analytics?${params.toString()}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Gagal memuat penjualan');
        return result.data as AnalyticsData;
      })
      .then(setData)
      .catch((fetchError) => {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return;
        setError(fetchError instanceof Error ? fetchError.message : 'Gagal memuat penjualan');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [granularity, year, month, branch, refreshKey]);

  const chartData = useMemo(
    () => (data?.trend || []).map((item) => ({ ...item, label: labelPeriod(item.period, granularity) })),
    [data?.trend, granularity],
  );

  const years = Array.from({ length: 7 }, (_, index) => now.getFullYear() - index);
  const months = Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(2026, index, 1)),
  }));

  if (loading && !data) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-stone-200 bg-white">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-[var(--color-primary)]" />
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-400">Memuat riwayat penjualan</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <section className="overflow-hidden rounded-[2rem] bg-stone-950 p-6 text-white md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="h-[2px] w-8 bg-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-300">Sales intelligence</span>
            </div>
            <h2 className="font-display text-3xl font-black tracking-tight md:text-4xl">Riwayat Penjualan.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-400">
              Analisis omzet, volume transaksi, performa produk, dan kontribusi setiap outlet dalam satu laporan.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setRefreshKey((value) => value + 1)}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Perbarui data
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm md:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <FilterSelect label="Periode" value={granularity} onChange={(value) => setGranularity(value as Granularity)}>
            <option value="year">Per tahun</option>
            <option value="month">Per bulan</option>
            <option value="day">Per hari</option>
          </FilterSelect>

          <FilterSelect label="Tahun" value={String(year)} onChange={(value) => setYear(Number(value))}>
            {years.map((item) => <option key={item} value={item}>{item}</option>)}
          </FilterSelect>

          <FilterSelect label="Bulan" value={String(month)} onChange={(value) => setMonth(Number(value))} disabled={granularity !== 'day'}>
            {months.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </FilterSelect>

          <FilterSelect label="Cabang" value={branch} onChange={setBranch}>
            <option value="all">Semua cabang</option>
            <option value="main">Outlet utama</option>
            {data?.branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </FilterSelect>

          <div className="flex items-end">
            <div className="flex h-11 w-full items-center gap-2 rounded-xl bg-stone-100 px-4 text-xs font-semibold text-stone-500">
              <CalendarDays className="h-4 w-4" />
              {granularity === 'year' ? `${year - 4}–${year}` : granularity === 'month' ? `Tahun ${year}` : `${months[month - 1].label} ${year}`}
            </div>
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard icon={CircleDollarSign} label="Total omzet" value={rupiah(data?.summary.revenue || 0)} />
        <MetricCard icon={ReceiptText} label="Transaksi selesai" value={(data?.summary.orders || 0).toLocaleString('id-ID')} />
        <MetricCard icon={TrendingUp} label="Rata-rata order" value={rupiah(data?.summary.averageOrder || 0)} />
        <MetricCard icon={ShoppingBag} label="Total diskon" value={rupiah(data?.summary.discount || 0)} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">Revenue trend</p>
              <h3 className="mt-1 font-display text-xl font-black text-stone-900">Grafik penjualan</h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><BarChart3 className="h-5 w-5" /></div>
          </div>

          <div className="h-[340px] w-full">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => rupiah(Number(value))} contentStyle={{ borderRadius: 14, borderColor: '#e7e5e4' }} />
                  <Line type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-stone-200 text-sm text-stone-400">Belum ada transaksi pada periode ini.</div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">Best sellers</p>
            <h3 className="mt-1 font-display text-xl font-black text-stone-900">Produk paling laris</h3>
          </div>

          <div className="space-y-3">
            {data?.topProducts.length ? data.topProducts.map((product, index) => (
              <motion.div key={product.productId} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }} className="flex items-center gap-3 rounded-2xl bg-stone-50 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-900 font-display text-sm font-black text-white">{index + 1}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-stone-800">{product.name}</p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400">{product.quantity} item terjual</p>
                </div>
                <p className="text-xs font-black text-emerald-700">{rupiah(product.revenue)}</p>
              </motion.div>
            )) : <div className="py-12 text-center text-sm text-stone-400"><Package className="mx-auto mb-3 h-8 w-8" />Belum ada produk terjual.</div>}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-5 md:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">Sales ledger</p>
            <h3 className="mt-1 font-display text-xl font-black text-stone-900">Detail transaksi terbaru</h3>
          </div>
          <Store className="h-5 w-5 text-stone-300" />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-stone-50 text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400">
              <tr>
                <th className="px-5 py-3">Pesanan</th>
                <th className="px-5 py-3">Outlet</th>
                <th className="px-5 py-3">Pembayaran</th>
                <th className="px-5 py-3">Waktu</th>
                <th className="px-5 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {data?.recentSales.length ? data.recentSales.map((sale) => (
                <tr key={sale.id} className="text-xs text-stone-600 hover:bg-stone-50/70">
                  <td className="px-5 py-4"><p className="font-bold text-stone-900">{sale.orderCode}</p><p className="mt-0.5 text-[10px] text-stone-400">{sale.name || 'Pelanggan umum'}</p></td>
                  <td className="px-5 py-4 font-semibold">{sale.branchName || 'Outlet Utama'}</td>
                  <td className="px-5 py-4"><span className="rounded-lg bg-stone-100 px-2 py-1 text-[9px] font-bold uppercase">{sale.paymentMethod || '-'}</span></td>
                  <td className="whitespace-nowrap px-5 py-4">{sale.createdAt ? new Date(sale.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-right font-black text-stone-900">{rupiah(sale.total)}</td>
                </tr>
              )) : <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-stone-400">Belum ada riwayat transaksi.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function FilterSelect({ label, value, onChange, children, disabled = false }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400">{label}</span>
      <span className="relative block">
        <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="h-11 w-full appearance-none rounded-xl border border-stone-200 bg-white px-3 pr-9 text-xs font-bold text-stone-700 outline-none focus:border-[var(--color-primary)] disabled:bg-stone-100 disabled:text-stone-400">
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
      </span>
    </label>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof ReceiptText; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-600"><Icon className="h-4 w-4" /></div>
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400">{label}</p>
      <p className="mt-1 truncate font-display text-xl font-black text-stone-900 md:text-2xl">{value}</p>
    </div>
  );
}
