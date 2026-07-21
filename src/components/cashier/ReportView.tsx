import { useState, useEffect, useMemo } from 'react';
import { Order } from '@/types/menu';
import { useSalesReport, TimeFilter } from '@/hooks/useSalesReport';
import { useStockReport } from '@/hooks/useStockReport';
import { ReportExporter } from '@/utils/ReportExporter';
import { formatPrice } from '@/utils/formatters';
import {
  Download, TrendingUp, TrendingDown, AlertTriangle, Sparkles,
  Coffee, ShoppingBag, Users, Zap, ChevronDown, FileText, ArrowLeft
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface ReportViewProps {
  orders: Order[];
  isCafeOpen?: boolean;
  onToggleStatus?: () => void;
  onNavigateToStock?: () => void;
}

// ── Animated Counter ──
function AnimatedNumber({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 800;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      current = Math.min(current + increment, value);
      setDisplay(Math.round(current));
      if (step >= steps) { setDisplay(value); clearInterval(timer); }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);
  return <>{prefix}{display.toLocaleString('id-ID')}</>;
}

// ── Business Pulse Generator ──
function generateInsights(salesReport: any, stockReport: any): string[] {
  const insights: string[] = [];
  const { totalRevenue, totalTransactions, topItems, orderTypeData, averageOrderValue } = salesReport;

  if (totalTransactions === 0) {
    insights.push('Belum ada transaksi hari ini. Saatnya mempersiapkan operasional.');
    return insights;
  }

  if (totalRevenue > 500000) insights.push('Performa pendapatan hari ini sangat kuat 💪');
  else if (totalRevenue > 0) insights.push('Pendapatan mulai masuk. Pantau terus trennya.');

  if (topItems.length > 0) {
    const top = topItems[0];
    insights.push(`${top.name} mendominasi penjualan dengan ${top.quantity} pesanan`);
  }

  const dineIn = orderTypeData.find((t: any) => t.name === 'Dine In')?.value || 0;
  const takeAway = orderTypeData.find((t: any) => t.name === 'Take Away')?.value || 0;
  if (dineIn > takeAway * 2) insights.push('Mayoritas pelanggan memilih dine-in hari ini');
  if (takeAway > dineIn) insights.push('Take-away mendominasi — pertimbangkan optimasi packaging');
  if (takeAway === 0 && totalTransactions > 0) insights.push('Belum ada aktivitas take-away hari ini');

  if (averageOrderValue > 50000) insights.push(`Rata-rata spend per customer: ${formatPrice(averageOrderValue)}`);

  if (stockReport.outOfStockItems.length > 0) {
    insights.push(`⚠ ${stockReport.outOfStockItems.length} item kehabisan stok — perlu restock segera`);
  }
  if (stockReport.lowStockItems.length > 0) {
    insights.push(`${stockReport.lowStockItems.length} item stok menipis — monitor sebelum habis`);
  }

  return insights.slice(0, 4);
}

// ── Daily Narrative ──
function generateNarrative(salesReport: any): string {
  const { totalRevenue, totalTransactions, topItems, orderTypeData } = salesReport;
  if (totalTransactions === 0) return 'Hari ini belum ada aktivitas penjualan. Dashboard akan memperbarui otomatis saat pesanan pertama masuk.';

  const topName = topItems[0]?.name || 'menu favorit';
  const dineIn = orderTypeData.find((t: any) => t.name === 'Dine In')?.value || 0;
  const total = totalTransactions;
  const dinePercent = total > 0 ? Math.round((dineIn / total) * 100) : 0;

  return `Performa hari ini ${totalRevenue > 500000 ? 'lebih kuat dari rata-rata' : 'dalam tahap awal'}. Sebagian besar pelanggan memilih dine-in (${dinePercent}%), dengan ${topName} sebagai kontributor utama pendapatan.`;
}

export default function ReportView({ orders, isCafeOpen = true, onToggleStatus, onNavigateToStock }: ReportViewProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [showExport, setShowExport] = useState(false);

  const salesReport = useSalesReport(orders, timeFilter);
  const stockReport = useStockReport();

  const insights = useMemo(() => generateInsights(salesReport, stockReport), [salesReport, stockReport]);
  const narrative = useMemo(() => generateNarrative(salesReport), [salesReport]);

  // Chart data — only show hours 7-23 for cleanliness
  const chartData = useMemo(() => {
    return salesReport.hourlyData
      .filter((_: any, i: number) => i >= 7 && i <= 23)
      .map((d: any) => ({ ...d, hour: d.hour.replace(':00', '') }));
  }, [salesReport.hourlyData]);

  const maxOrders = Math.max(...chartData.map((d: any) => d.orders), 1);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Selamat Pagi' : now.getHours() < 17 ? 'Selamat Siang' : 'Selamat Malam';
  const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const dineIn = salesReport.orderTypeData.find((t: any) => t.name === 'Dine In')?.value || 0;
  const takeAway = salesReport.orderTypeData.find((t: any) => t.name === 'Take Away')?.value || 0;
  const dinePercent = salesReport.totalTransactions > 0 ? Math.round((dineIn / salesReport.totalTransactions) * 100) : 0;
  const takePercent = salesReport.totalTransactions > 0 ? Math.round((takeAway / salesReport.totalTransactions) * 100) : 0;

  return (
    <div
      className="flex flex-col gap-0 font-sans min-h-full pb-16"
      style={{
        background: 'linear-gradient(180deg, var(--color-surface) 0%, var(--color-surface-container-low) 100%)',
      }}
    >

      {/* ─── 1. HEADER ─── */}
      <div className="px-6 pt-6 pb-5" style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px)' }}>
        {/* Top row: greeting + time + back */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-stone-500 font-medium">{greeting}</p>
            <h1 className="text-2xl font-display font-bold text-stone-900 mt-0.5 tracking-tight">Business Cockpit</h1>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="text-right flex flex-col items-end gap-1">
              <span className="text-xs font-mono text-stone-400">{timeString}</span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
                <span className="text-[9px] uppercase tracking-widest text-stone-400 font-bold">Live</span>
              </div>
            </div>
            <a
              href="/"
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/50 hover:bg-white/80 transition-all text-stone-400 active:scale-95"
              title="Kembali ke Menu"
            >
              <ArrowLeft className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Store Status Card */}
        {onToggleStatus && (
          <button
            onClick={onToggleStatus}
            className="mt-4 w-full p-4 rounded-2xl flex items-center justify-between transition-all active:scale-[0.98]"
            style={{
              background: isCafeOpen
                ? 'linear-gradient(135deg, rgba(14,92,55,0.06) 0%, rgba(14,92,55,0.02) 100%)'
                : 'linear-gradient(135deg, rgba(120,113,108,0.06) 0%, rgba(120,113,108,0.02) 100%)',
              border: isCafeOpen
                ? '1px solid rgba(14,92,55,0.18)'
                : '1px solid rgba(120,113,108,0.18)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-5 h-5">
                <div className={`w-3 h-3 rounded-full ${
                  isCafeOpen ? 'bg-[var(--color-primary)]' : 'bg-stone-400'
                }`} />
                {isCafeOpen && (
                  <div className="absolute inset-0 m-auto w-3 h-3 rounded-full bg-[var(--color-primary)] animate-ping opacity-40" />
                )}
              </div>
              <span className={`text-sm font-semibold ${
                isCafeOpen ? 'text-[var(--color-primary)]' : 'text-stone-500'
              }`}>
                {isCafeOpen ? 'Kafe Sedang Buka' : 'Kafe Sedang Tutup'}
              </span>
            </div>
            <span className={`px-3.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors ${
              isCafeOpen
                ? 'bg-rose-50 text-rose-600 border border-rose-200/60'
                : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20'
            }`}>
              {isCafeOpen ? 'Tutup Kafe' : 'Buka Kafe'}
            </span>
          </button>
        )}

        {/* Time filter pills */}
        <div className="flex gap-2 mt-4">
          {([['today', 'Hari Ini'], ['7days', '7 Hari'], ['30days', '30 Hari']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTimeFilter(key)}
              className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all ${
                timeFilter === key
                  ? 'bg-stone-900 text-white shadow-lg shadow-stone-900/20'
                  : 'text-stone-500 hover:bg-white/60'
              }`}
              style={timeFilter !== key ? { background: 'rgba(255,255,255,0.5)' } : {}}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── 2. HERO FINANCIAL OVERVIEW ─── */}
      <div className="mx-5 mt-2 p-7 rounded-[28px] relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-container) 60%, #072a1a 100%)',
        boxShadow: '0 20px 60px -12px rgba(14,92,55,0.40)'
      }}>
        {/* Subtle gradient orbs */}
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)' }} />

        <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-100/70 font-bold">Laba Bersih (Net Profit)</p>
        <p className={`text-4xl font-display font-bold mt-2 tracking-tight ${salesReport.netProfit >= 0 ? 'text-white' : 'text-rose-300'}`}>
          <AnimatedNumber value={salesReport.netProfit} prefix="Rp " />
        </p>

        <div className="flex items-center gap-6 mt-6 pt-5 border-t border-white/10">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-emerald-100/60 font-bold mb-1">Pendapatan</p>
            <p className="text-sm font-bold text-white"><AnimatedNumber value={salesReport.totalRevenue} prefix="Rp " /></p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-widest text-emerald-100/60 font-bold mb-1">Pengeluaran</p>
            <p className="text-sm font-bold text-rose-200"><AnimatedNumber value={salesReport.totalExpenses} prefix="Rp " /></p>
          </div>
          
          {salesReport.totalTransactions > 0 && (
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
                <TrendingUp className="w-3.5 h-3.5 text-white/80" />
              </div>
              <span className="text-xs text-white/80 font-medium">{salesReport.totalTransactions} Transaksi</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── 3. DAILY NARRATIVE ─── */}
      <div className="mx-5 mt-5 p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-2 mb-2.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Ringkasan Harian</span>
        </div>
        <p className="text-sm text-stone-600 leading-relaxed">{narrative}</p>
      </div>

      {/* ─── 4. KPI GRID ─── */}
      <div className="px-5 mt-5 grid grid-cols-2 gap-3">
        {[
          { label: 'Transaksi', value: salesReport.totalTransactions.toString(), icon: ShoppingBag, color: 'text-[var(--color-primary)]', bg: 'bg-[var(--color-primary)]/8' },
          { label: 'Avg. Spend', value: formatPrice(salesReport.averageOrderValue), icon: Users, color: 'text-[var(--color-tertiary)]', bg: 'bg-[var(--color-tertiary)]/8' },
          { label: 'Dibatalkan', value: salesReport.cancelCount.toString(), icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-500/8' },
          { label: 'Take Away', value: `${takePercent}%`, icon: Coffee, color: 'text-[var(--color-on-surface-variant)]', bg: 'bg-[var(--color-surface-container-high)]' },
        ].map((kpi) => (
          <div key={kpi.label} className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.4)' }}>
            <div className={`w-8 h-8 rounded-xl ${kpi.bg} flex items-center justify-center mb-3`}>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <p className="text-xl font-bold text-stone-800 tracking-tight">{kpi.value}</p>
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* ─── 5. BUSINESS PULSE ─── */}
      {insights.length > 0 && (
        <div className="mx-5 mt-6">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Zap className="w-4 h-4 text-[var(--color-primary)]" />
            <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Business Pulse</span>
          </div>
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-3 p-3.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(8px)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0" />
                <p className="text-sm text-stone-600 leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 6. PEAK HOURS BAR CHART ─── */}
      <div className="mx-5 mt-6 p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.4)' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Aktivitas Per Jam</p>
            <p className="text-xs text-stone-500 mt-0.5">Distribusi pesanan hari ini</p>
          </div>
        </div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="20%">
              <XAxis dataKey="hour" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: '#a8a29e' }} />
              <YAxis hide />
              <Tooltip
                cursor={false}
                contentStyle={{
                  borderRadius: '16px',
                  border: 'none',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(8px)',
                  padding: '8px 14px',
                  fontSize: '12px'
                }}
                formatter={(value: any) => [`${value} pesanan`, '']}
                labelFormatter={(label: any) => `Jam ${label}:00`}
              />
              <Bar dataKey="orders" radius={[6, 6, 2, 2]} maxBarSize={24}>
                {chartData.map((_: any, i: number) => (
                  <Cell
                    key={i}
                    fill={chartData[i].orders === maxOrders && maxOrders > 0
                      ? 'var(--color-primary)'
                      : chartData[i].orders > 0
                        ? 'rgba(120,113,108,0.25)'
                        : 'rgba(214,211,209,0.3)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── 7. ORDER TYPE SPLIT ─── */}
      <div className="mx-5 mt-5 p-5 rounded-2xl flex items-center gap-5" style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)' }}>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-1">Dine In</p>
          <p className="text-2xl font-bold text-stone-800">{dineIn}</p>
          <div className="mt-2 h-1.5 rounded-full bg-stone-200/60 overflow-hidden">
            <div className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-700" style={{ width: `${dinePercent}%` }} />
          </div>
          <p className="text-xs text-stone-400 mt-1">{dinePercent}%</p>
        </div>
        <div className="w-px h-14 bg-stone-200/60" />
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-1">Take Away</p>
          <p className="text-2xl font-bold text-stone-800">{takeAway}</p>
          <div className="mt-2 h-1.5 rounded-full bg-stone-200/60 overflow-hidden">
            <div className="h-full rounded-full bg-[var(--color-on-surface-variant)] transition-all duration-700" style={{ width: `${takePercent}%` }} />
          </div>
          <p className="text-xs text-stone-400 mt-1">{takePercent}%</p>
        </div>
      </div>

      {/* ─── 8. TOP PERFORMERS ─── */}
      {salesReport.topItems.length > 0 && (
        <div className="mx-5 mt-6">
          <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-3 px-1">Top Performer</p>
          <div className="space-y-2.5">
            {salesReport.topItems.slice(0, 5).map((item: any, idx: number) => {
              const maxQty = salesReport.topItems[0]?.quantity || 1;
              const barWidth = Math.max((item.quantity / maxQty) * 100, 8);
              return (
                <div key={idx} className="p-4 rounded-2xl relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.4)' }}>
                  {/* Progress bar behind */}
                  <div className="absolute inset-y-0 left-0 opacity-[0.07] rounded-2xl transition-all duration-700" style={{ width: `${barWidth}%`, background: 'var(--color-primary)' }} />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-stone-300 w-5 shrink-0">#{idx + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-stone-800 truncate">{item.name}</p>
                        <p className="text-xs text-stone-400">{item.quantity} terjual</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-stone-700 shrink-0 ml-3">{formatPrice(item.revenue)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 9. INVENTORY RISK ─── */}
      {(stockReport.outOfStockItems.length > 0 || stockReport.lowStockItems.length > 0) && (
        <div className="mx-5 mt-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Peringatan Inventori</span>
            </div>
            {onNavigateToStock && (
              <button 
                onClick={onNavigateToStock}
                className="text-[10px] uppercase tracking-widest text-[var(--color-primary)] font-bold hover:underline"
              >
                Kelola Stok
              </button>
            )}
          </div>
          <div className="space-y-2.5">
            {stockReport.outOfStockItems.map((item: any, i: number) => (
              <div key={`o-${i}`} className="p-4 rounded-2xl flex items-center justify-between" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}>
                <div>
                  <p className="text-sm font-bold text-stone-800">{item.name}</p>
                  <p className="text-xs text-red-500 mt-0.5 font-medium">Stok habis — butuh restock</p>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider">Habis</div>
              </div>
            ))}
            {stockReport.lowStockItems.map((item: any, i: number) => (
              <div key={`l-${i}`} className="p-4 rounded-2xl flex items-center justify-between" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
                <div>
                  <p className="text-sm font-bold text-stone-800">{item.name}</p>
                  <p className="text-xs text-amber-600 mt-0.5 font-medium">Sisa {item.currentStock} unit</p>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider">Menipis</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 10. EXPORT ACTIONS ─── */}
      <div className="mx-5 mt-8 mb-4">
        <button
          onClick={() => setShowExport(!showExport)}
          className="w-full flex items-center justify-between p-4 rounded-2xl text-sm font-bold text-stone-600 transition-all active:scale-[0.98]"
          style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(8px)' }}
        >
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4" />
            <span>Export Laporan</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${showExport ? 'rotate-180' : ''}`} />
        </button>
        {showExport && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => ReportExporter.exportSalesReportPDF(salesReport)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-white text-xs font-bold uppercase tracking-widest active:scale-[0.98] transition-all shadow-lg" style={{ background: 'var(--color-primary)', boxShadow: '0 10px 30px -10px rgba(14,92,55,0.3)' }}
            >
              <Download className="w-4 h-4" /> PDF
            </button>
            <button
              onClick={() => ReportExporter.exportSalesReportCSV(salesReport)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-stone-700 text-xs font-bold uppercase tracking-widest active:scale-[0.98] transition-all"
              style={{ background: 'rgba(255,255,255,0.7)' }}
            >
              <Download className="w-4 h-4" /> CSV
            </button>
            <button
              onClick={() => ReportExporter.exportStockReportPDF(stockReport.stockData)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-stone-700 text-xs font-bold uppercase tracking-widest active:scale-[0.98] transition-all"
              style={{ background: 'rgba(255,255,255,0.7)' }}
            >
              <Download className="w-4 h-4" /> Stok
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
