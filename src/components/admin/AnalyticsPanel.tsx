import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Award, Clock, DollarSign, ShoppingBag, Minus, ArrowUpRight } from 'lucide-react';
import { useOrderStore } from '../../store/order.store';
import { useSalesReport, TimeFilter } from '../../hooks/useSalesReport';
import { formatPrice } from '../../utils/formatters';

const FILTERS: { label: string; value: TimeFilter }[] = [
  { label: 'Hari Ini', value: 'today' },
  { label: '7 Hari', value: '7days' },
  { label: '30 Hari', value: '30days' },
];

export default function AnalyticsPanel() {
  const [filter, setFilter] = useState<TimeFilter>('today');
  const { orderHistory } = useOrderStore();
  const report = useSalesReport(orderHistory, filter);

  // Only show hours 6:00–23:00 that have data
  const relevantHours = report.hourlyData.filter(h => {
    const hour = parseInt(h.hour);
    return hour >= 6 && hour <= 23;
  });
  const maxOrders = Math.max(...relevantHours.map(h => h.orders), 1);

  const top5 = report.topItems.slice(0, 5);
  const maxQty = Math.max(...top5.map(i => i.quantity), 1);

  return (
    <div className="p-6 space-y-8 pb-40">
      {/* Filter Tabs */}
      <div className="flex gap-2">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-xl text-xs font-label uppercase tracking-widest transition-all ${
              filter === f.value
                ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20'
                : 'bg-white border border-stone-100 text-stone-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total Revenue', value: formatPrice(report.totalRevenue), icon: <DollarSign className="w-4 h-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Transaksi', value: `${report.totalTransactions}x`, icon: <ShoppingBag className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Avg Order', value: formatPrice(report.averageOrderValue), icon: <TrendingUp className="w-4 h-4" />, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Net Profit', value: formatPrice(report.netProfit), icon: report.netProfit >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <Minus className="w-4 h-4" />, color: report.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500', bg: report.netProfit >= 0 ? 'bg-emerald-50' : 'bg-rose-50' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm flex flex-col gap-4">
            <div className={`w-10 h-10 rounded-2xl ${kpi.bg} ${kpi.color} flex items-center justify-center shrink-0 shadow-sm`}>
              {kpi.icon}
            </div>
            <div>
              <p className="text-[9px] font-label uppercase tracking-widest text-stone-400 mb-1">{kpi.label}</p>
              <p className="text-xl font-display font-bold text-stone-800">{report.totalTransactions === 0 ? '—' : kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Top Items */}
      <div className="bg-white rounded-[2rem] border border-stone-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-50 flex items-center gap-3">
          <Award className="w-4 h-4 text-[var(--color-primary)]" />
          <p className="text-xs font-label uppercase tracking-widest text-stone-500 font-bold">Menu Terlaris</p>
        </div>
        <div className="p-5 space-y-4">
          {top5.length === 0 ? (
            <p className="text-center text-stone-300 text-sm py-4 italic">Belum ada data penjualan</p>
          ) : (
            top5.map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="space-y-1.5"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-stone-300 w-4">#{i + 1}</span>
                    <span className="text-sm font-sans text-stone-700 truncate max-w-[170px]">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold text-stone-500">{item.quantity}x</span>
                </div>
                <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[var(--color-primary)] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.quantity / maxQty) * 100}%` }}
                    transition={{ duration: 0.6, delay: i * 0.06 }}
                  />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Peak Hours */}
      <div className="bg-white rounded-[2rem] border border-stone-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-50 flex items-center gap-3">
          <Clock className="w-4 h-4 text-[var(--color-primary)]" />
          <p className="text-xs font-label uppercase tracking-widest text-stone-500 font-bold">Jam Tersibuk</p>
        </div>
        <div className="p-5">
          {relevantHours.every(h => h.orders === 0) ? (
            <p className="text-center text-stone-300 text-sm py-4 italic">Belum ada data order</p>
          ) : (
            <div className="flex items-end gap-1.5 h-24">
              {relevantHours.map((h, i) => {
                const heightPct = maxOrders > 0 ? (h.orders / maxOrders) * 100 : 0;
                const isHot = heightPct > 60;
                return (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      className={`w-full rounded-t-md ${isHot ? 'bg-[var(--color-primary)]' : 'bg-stone-200'}`}
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(heightPct, 4)}%` }}
                      transition={{ duration: 0.5, delay: i * 0.02 }}
                    />
                    {i % 3 === 0 && (
                      <span className="text-[7px] text-stone-300 font-label">{h.hour.replace(':00', '')}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Order Type */}
      <div className="bg-white rounded-[2rem] border border-stone-100 shadow-sm p-5">
        <p className="text-[9px] font-label uppercase tracking-widest text-stone-400 mb-4">Tipe Pesanan</p>
        <div className="flex gap-4">
          {report.orderTypeData.map(ot => (
            <div key={ot.name} className="flex-1 bg-stone-50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-display font-bold">{ot.value}</p>
              <p className="text-[9px] font-label uppercase tracking-widest text-stone-400 mt-1">{ot.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
