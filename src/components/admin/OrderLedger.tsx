import { useState } from 'react';
import { useOrderStore } from '../../store/order.store';
import { useMenuStore } from '../../store/menu.store';
import { formatPrice } from '../../utils/formatters';
import { Download, Table as TableIcon, Calendar, Hash, Tag, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { isSameDay, subDays, isWithinInterval } from 'date-fns';

type DateFilter = 'all' | 'today' | '7days';
type StatusFilter = 'all' | 'completed' | 'cancelled' | 'pending';

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-600 border-rose-200',
  pending: 'bg-amber-50 text-amber-600 border-amber-200',
  confirmed: 'bg-blue-50 text-blue-600 border-blue-200',
  preparing: 'bg-violet-50 text-violet-600 border-violet-200',
  ready: 'bg-teal-50 text-teal-600 border-teal-200',
};

export default function OrderLedger() {
  const { orderHistory } = useOrderStore();
  const { items: menuItems } = useMenuStore();
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = orderHistory.filter(o => {
    const date = new Date(o.createdAt);
    const now = new Date();
    const dateOk =
      dateFilter === 'all' ? true :
      dateFilter === 'today' ? isSameDay(date, now) :
      isWithinInterval(date, { start: subDays(now, 7), end: now });
    const statusOk = statusFilter === 'all' || o.status === statusFilter;
    return dateOk && statusOk;
  });

  const totalFiltered = filtered
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + o.totalPrice, 0);

  const exportToTSV = () => {
    if (filtered.length === 0) return;
    const headers = ['Order ID', 'Table', 'Timestamp', 'Status', 'Items', 'Total'];
    const rows = filtered.map(order => {
      const itemBreakdown = order.items.map(item => {
        const product = menuItems.find(m => m.id === item.menuItemId);
        return `${product?.name || 'Unknown'} (x${item.quantity})`;
      }).join('; ');
      return [order.id, `T-${order.tableId}`, new Date(order.createdAt).toLocaleString('id-ID'), order.status, itemBreakdown, order.totalPrice];
    });
    const tsvContent = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const blob = new Blob(['\uFEFF', tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ledger_${new Date().toISOString().split('T')[0]}.tsv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 pb-40">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-[var(--color-primary)]">
            <TableIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-label uppercase tracking-widest text-stone-400">Ledger</p>
            <h4 className="text-sm font-sans font-bold text-stone-900 uppercase tracking-widest">{filtered.length} Records</h4>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${showFilters ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-white border-stone-100 text-stone-400'}`}
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            onClick={exportToTSV}
            disabled={filtered.length === 0}
            className="px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl flex items-center gap-2 font-label text-[10px] uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 active:scale-95 transition-all disabled:opacity-30"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-stone-100 rounded-2xl p-4 space-y-4">
              <div>
                <p className="text-[9px] font-label uppercase tracking-widest text-stone-400 mb-2">Periode</p>
                <div className="flex gap-2 flex-wrap">
                  {([['all', 'Semua'], ['today', 'Hari Ini'], ['7days', '7 Hari']] as [DateFilter, string][]).map(([val, label]) => (
                    <button key={val} onClick={() => setDateFilter(val)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-label uppercase tracking-widest transition-all ${dateFilter === val ? 'bg-[var(--color-primary)] text-white' : 'bg-stone-50 text-stone-400 border border-stone-100'}`}
                    >{label}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[9px] font-label uppercase tracking-widest text-stone-400 mb-2">Status</p>
                <div className="flex gap-2 flex-wrap">
                  {([['all', 'Semua'], ['completed', 'Selesai'], ['cancelled', 'Dibatal'], ['pending', 'Pending']] as [StatusFilter, string][]).map(([val, label]) => (
                    <button key={val} onClick={() => setStatusFilter(val)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-label uppercase tracking-widest transition-all ${statusFilter === val ? 'bg-stone-900 text-white' : 'bg-stone-50 text-stone-400 border border-stone-100'}`}
                    >{label}</button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Row */}
      {filtered.length > 0 && (
        <div className="bg-stone-50 border border-stone-100 rounded-2xl p-4 flex justify-between items-center">
          <p className="text-xs text-stone-500">{filtered.length} transaksi ditampilkan</p>
          <p className="text-sm font-bold text-[var(--color-primary)]">
            {formatPrice(totalFiltered)}
          </p>
        </div>
      )}

      {/* Order List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-stone-100 rounded-[2rem]">
            <p className="text-stone-300 font-display italic">Tidak ada data untuk filter ini.</p>
          </div>
        ) : (
          filtered.map((order, index) => {
            const isExpanded = expandedId === order.id;
            const statusClass = STATUS_COLORS[order.status] || 'bg-stone-50 text-stone-400 border-stone-100';
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="bg-white rounded-[2rem] border border-stone-100 shadow-sm overflow-hidden"
              >
                {/* Header Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  className="w-full p-6 flex items-center justify-between hover:bg-stone-50/50 transition-colors"
                >
                  <div className="space-y-1 text-left">
                    <div className="flex items-center gap-2">
                      <Hash className="w-3 h-3 text-[var(--color-primary)]" />
                      <span className="text-xs font-sans font-bold text-stone-900">{order.id}</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-40">
                      <Calendar className="w-3 h-3" />
                      <span className="text-[10px] font-label uppercase tracking-widest">
                        {new Date(order.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 border rounded-full text-[9px] font-label uppercase tracking-widest ${statusClass}`}>
                      {order.status}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-stone-300" /> : <ChevronDown className="w-4 h-4 text-stone-300" />}
                  </div>
                </button>

                {/* Expanded Detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 space-y-5 border-t border-stone-50 pt-5">
                        <div className="flex gap-3">
                          <div className="bg-stone-50 rounded-xl px-3 py-1.5 text-[10px] font-label uppercase tracking-widest text-stone-500">
                            Meja {order.tableId}
                          </div>
                          {order.orderType && (
                            <div className="bg-stone-50 rounded-xl px-3 py-1.5 text-[10px] font-label uppercase tracking-widest text-stone-500">
                              {order.orderType === 'takeaway' ? 'Take Away' : 'Dine In'}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          {order.items.map((item, i) => {
                            const product = menuItems.find(m => m.id === item.menuItemId);
                            return (
                              <div key={i} className="flex justify-between text-xs font-sans">
                                <span className="text-stone-600 italic">{product?.name || 'Unknown'} {item.quantity > 1 && <span className="font-bold not-italic text-stone-400">x{item.quantity}</span>}</span>
                                <span className="font-bold text-stone-800">{product ? formatPrice(product.basePrice * item.quantity) : ''}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="border-t border-stone-50 pt-3 space-y-1.5">
                          <div className="flex justify-between text-xs text-stone-400">
                            <span>Subtotal</span><span>{formatPrice(order.subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-stone-400">
                            <span>Pajak</span><span>{formatPrice(order.tax)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-stone-400">
                            <span>Service Charge</span><span>{formatPrice(order.serviceCharge)}</span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-stone-100">
                            <div className="flex items-center gap-1.5">
                              <Tag className="w-3 h-3 opacity-30" />
                              <span className="text-[10px] font-label uppercase tracking-widest opacity-40">Total</span>
                            </div>
                            <span className="text-xl font-display text-[var(--color-primary)] font-bold">{formatPrice(order.totalPrice)}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
