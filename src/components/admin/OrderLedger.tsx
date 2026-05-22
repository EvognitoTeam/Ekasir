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
    link.download = `ledger_${new Date().toISOString().split('T')}.tsv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    // 🔴 Dibuang p-6 karena container parent sudah punya padding. Hanya perlu spasi vertikal.
    <div className="w-full space-y-5 pb-10">
      
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-stone-100 shadow-sm flex items-center justify-center text-[#0E5C37]">
            <TableIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-label uppercase tracking-widest text-stone-400 leading-none mb-1">Ledger</p>
            <h4 className="text-sm font-sans font-black text-stone-900 uppercase tracking-widest leading-none">{filtered.length} Records</h4>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${showFilters ? 'bg-[#0E5C37] text-white border-[#0E5C37] shadow-md' : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'}`}
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            onClick={exportToTSV}
            disabled={filtered.length === 0}
            className="px-5 py-2 bg-[#0E5C37] text-white rounded-xl flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest shadow-md shadow-emerald-900/10 active:scale-95 transition-all disabled:opacity-30 disabled:active:scale-100 hover:bg-emerald-700"
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
            <div className="bg-white border border-stone-200/60 rounded-[1.5rem] p-5 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                {/* Periode */}
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Periode</p>
                  <div className="flex gap-2 flex-wrap">
                    {([['all', 'Semua'], ['today', 'Hari Ini'], ['7days', '7 Hari']] as [DateFilter, string][]).map(([val, label]) => (
                      <button key={val} onClick={() => setDateFilter(val)}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${dateFilter === val ? 'bg-[#0E5C37] text-white shadow-sm' : 'bg-stone-50 text-stone-500 border border-stone-200 hover:bg-stone-100'}`}
                      >{label}</button>
                    ))}
                  </div>
                </div>
                {/* Status */}
                <div className="flex-">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Status</p>
                  <div className="flex gap-2 flex-wrap">
                    {([['all', 'Semua'], ['completed', 'Selesai'], ['cancelled', 'Dibatal'], ['pending', 'Pending']] as [StatusFilter, string][]).map(([val, label]) => (
                      <button key={val} onClick={() => setStatusFilter(val)}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${statusFilter === val ? 'bg-stone-900 text-white shadow-sm' : 'bg-stone-50 text-stone-500 border border-stone-200 hover:bg-stone-100'}`}
                      >{label}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Row */}
      {filtered.length > 0 && (
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-[1.5rem] p-4 lg:px-6 flex justify-between items-center">
          <p className="text-xs font-medium text-emerald-700/70">{filtered.length} transaksi ditampilkan</p>
          <p className="text-lg font-black text-[#0E5C37]">
            {formatPrice(totalFiltered)}
          </p>
        </div>
      )}

      {/* Order List */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-stone-200 rounded-[1.5rem] bg-white/50">
            <p className="text-stone-400 font-medium text-sm">Tidak ada data untuk filter ini.</p>
          </div>
        ) : (
          filtered.map((order, index) => {
            const isExpanded = expandedId === order.id;
            const statusClass = STATUS_COLORS[order.status] || 'bg-stone-50 text-stone-500 border-stone-200';
            
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-white rounded-[1.5rem] border border-stone-100 shadow-sm overflow-hidden hover:border-stone-200 transition-colors"
              >
                {/* Header Row (Tampil sebaris di layar Desktop) */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  className="w-full p-4 lg:px-6 lg:py-5 flex items-center justify-between hover:bg-stone-50/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 text-left">
                    {/* ID Pesanan */}
                    <div className="flex items-center gap-2 w-32">
                      <Hash className="w-3.5 h-3.5 text-[#0E5C37]" />
                      <span className="text-sm font-black text-stone-900">{order.id}</span>
                    </div>
                    {/* Tanggal */}
                    <div className="flex items-center gap-2 text-stone-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        {new Date(order.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-3 py-1 border rounded-md text-[9px] font-bold uppercase tracking-widest ${statusClass}`}>
                      {order.status}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center">
                       {isExpanded ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                    </div>
                  </div>
                </button>

                {/* Expanded Detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden bg-stone-50/30"
                    >
                      <div className="px-4 lg:px-6 pb-5 pt-3 border-t border-stone-100">
                        {/* Info Meja & Tipe Pesanan */}
                        <div className="flex gap-2 mb-4">
                          <div className="bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-500 shadow-sm">
                            Meja {order.tableId}
                          </div>
                          {order.orderType && (
                            <div className="bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-500 shadow-sm">
                              {order.orderType === 'takeaway' ? 'Take Away' : 'Dine In'}
                            </div>
                          )}
                        </div>
                        
                        {/* Breakdown Item */}
                        <div className="space-y-2.5">
                          {order.items.map((item, i) => {
                            const product = menuItems.find(m => m.id === item.menuItemId);
                            return (
                              <div key={i} className="flex justify-between items-center text-xs">
                                <span className="text-stone-600 font-medium">
                                  {product?.name || 'Unknown'} 
                                  {item.quantity > 1 && <span className="ml-2 px-1.5 py-0.5 bg-stone-200 text-stone-600 rounded text-[10px] font-bold">x{item.quantity}</span>}
                                </span>
                                <span className="font-bold text-stone-800">{product ? formatPrice(product.basePrice * item.quantity) : ''}</span>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Ringkasan Biaya */}
                        <div className="border-t border-stone-200/60 mt-4 pt-3 space-y-2">
                          <div className="flex justify-between text-xs text-stone-500">
                            <span>Subtotal</span><span className="font-medium">{formatPrice(order.subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-stone-500">
                            <span>Pajak</span><span className="font-medium">{formatPrice(order.tax)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-stone-500">
                            <span>Service Charge</span><span className="font-medium">{formatPrice(order.serviceCharge)}</span>
                          </div>
                          <div className="flex justify-between items-end pt-3 border-t border-stone-200 mt-2">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Tag className="w-3.5 h-3.5 text-stone-400" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Total Transaksi</span>
                            </div>
                            <span className="text-xl md:text-2xl font-black text-[#0E5C37]">{formatPrice(order.totalPrice)}</span>
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