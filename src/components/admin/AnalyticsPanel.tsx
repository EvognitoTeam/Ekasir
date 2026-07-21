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
    // 🔴 1. Wrapper dilebarkan agar fill-container dan jarak (padding/margin) disesuaikan
    <div className="w-full space-y-6 pb-10">
      
      {/* 🔴 2. Filter Tabs (Dibuat lebih modern) */}
      <div className="flex gap-2 p-1 bg-white border border-stone-200/60 rounded-xl w-fit shadow-sm">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
              filter === f.value
                ? 'bg-[#0E5C37] text-white shadow-md'
                : 'bg-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 🔴 3. KPI Cards: Diubah menjadi 4 kolom di layar besar (lg:grid-cols-4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: formatPrice(report.totalRevenue), icon: <DollarSign className="w-5 h-5" />, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Transaksi', value: `${report.totalTransactions}x`, icon: <ShoppingBag className="w-5 h-5" />, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Avg Order', value: formatPrice(report.averageOrderValue), icon: <TrendingUp className="w-5 h-5" />, color: 'text-violet-700', bg: 'bg-violet-50' },
          { label: 'Net Profit', value: formatPrice(report.netProfit), icon: report.netProfit >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <Minus className="w-5 h-5" />, color: report.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600', bg: report.netProfit >= 0 ? 'bg-emerald-50' : 'bg-rose-50' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white p-5 lg:p-6 rounded-[1.5rem] border border-stone-100 shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-xl ${kpi.bg} ${kpi.color} flex items-center justify-center shrink-0 shadow-inner`}>
              {kpi.icon}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-0.5">{kpi.label}</p>
              <p className="text-xl md:text-2xl font-black text-stone-900 tracking-tight">{report.totalTransactions === 0 ? '—' : kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 🔴 4. Grid untuk Konten Bawah (Membelah layar jadi 2 kolom di Desktop: Kiri Top Items, Kanan Grafik Jam + Tipe Pesanan) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* KOLOM KIRI: Top Items */}
        <div className="bg-white rounded-[1.5rem] border border-stone-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-stone-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Award className="w-4 h-4 text-[#0E5C37]" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Menu Terlaris</p>
          </div>
          <div className="p-6 space-y-5 flex-1">
            {top5.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                 <p className="text-center text-stone-400 text-sm italic">Belum ada data penjualan</p>
              </div>
            ) : (
              top5.map((item, i) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-stone-300 w-4">#{i + 1}</span>
                      <span className="text-sm font-bold text-stone-700 truncate max-w-[200px]">{item.name}</span>
                    </div>
                    <span className="text-xs font-black text-stone-500">{item.quantity}x</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-[#0E5C37] rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.quantity / maxQty) * 100}%` }}
                      transition={{ duration: 0.8, delay: i * 0.05, ease: "easeOut" }}
                    />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* KOLOM KANAN: Berisi Jam Tersibuk & Tipe Pesanan */}
        <div className="flex flex-col gap-4">
          
          {/* Jam Tersibuk */}
          <div className="bg-white rounded-[1.5rem] border border-stone-100 shadow-sm overflow-hidden flex-1">
            <div className="p-5 border-b border-stone-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                 <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Jam Tersibuk</p>
            </div>
            <div className="p-6">
              {relevantHours.every(h => h.orders === 0) ? (
                <div className="h-24 flex items-center justify-center">
                   <p className="text-center text-stone-400 text-sm italic">Belum ada data order</p>
                </div>
              ) : (
                <div className="flex items-end gap-1.5 h-32 pt-4">
                  {relevantHours.map((h, i) => {
                    const heightPct = maxOrders > 0 ? (h.orders / maxOrders) * 100 : 0;
                    const isHot = heightPct > 60;
                    return (
                      <div key={h.hour} className="flex-1 flex flex-col items-center gap-2 relative group">
                        <motion.div
                          className={`w-full rounded-t-md transition-colors ${isHot ? 'bg-[#0E5C37]' : 'bg-stone-200 group-hover:bg-stone-300'}`}
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(heightPct, 4)}%` }}
                          transition={{ duration: 0.6, delay: i * 0.03 }}
                        />
                        {/* Tooltip jumlah order saat hover */}
                        <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-stone-800 text-white text-[9px] font-bold px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                          {h.orders} order
                        </div>
                        {i % 3 === 0 && (
                          <span className="text-[9px] text-stone-400 font-bold">{h.hour.replace(':00', '')}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Tipe Pesanan */}
          <div className="bg-white rounded-[1.5rem] border border-stone-100 shadow-sm p-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-4 pl-1">Proporsi Tipe Pesanan</p>
            <div className="flex gap-4">
              {report.orderTypeData.map(ot => (
                <div key={ot.name} className="flex-1 bg-stone-50 border border-stone-100 rounded-[1rem] p-4 text-center hover:bg-stone-100 transition-colors">
                  <p className="text-3xl font-black text-stone-800 tracking-tight">{ot.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mt-1">{ot.name}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}