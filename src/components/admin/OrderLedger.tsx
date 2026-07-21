'use client';

import { useEffect, useMemo, useState } from 'react';
import { useOrderStore } from '@/store/order.store';
import { useMenuStore } from '@/store/menu.store'; 
import { formatPrice } from '@/utils/formatters';
import {
  Download,
  Table as TableIcon,
  Calendar,
  Hash,
  Tag,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { isSameDay, subDays, isWithinInterval } from 'date-fns';
import { useParams } from 'next/navigation';

type DateFilter = 'all' | 'today' | '7days';

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-600 border-rose-200',
  pending: 'bg-amber-50 text-amber-600 border-amber-200',
  confirmed: 'bg-blue-50 text-blue-600 border-blue-200',
  preparing: 'bg-violet-50 text-violet-600 border-violet-200',
  ready: 'bg-teal-50 text-teal-600 border-teal-200',
};

export default function OrderLedger() {
  const { orderHistory, fetchOrderHistory, loading } = useOrderStore();
  // 🔴 PERBAIKAN: Ambil 'items' (ubah nama jadi menuItems) DAN 'setMenu' dari store
  const { items: menuItems, setMenu } = useMenuStore(); 

  const params = useParams();
  const slug = (params.mitraSlug as string) || "";

  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<number | string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!slug) return;
    
    fetchOrderHistory(slug);
    
    fetch(`/api/products?slug=${slug}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Pastikan selalu mengirimkan array, bukan undefined
          const itemsData = Array.isArray(data.data) ? data.data : (data.data?.items || []);
          const categoriesData = data.data?.categories || [];
          
          setMenu(itemsData, categoriesData);
        }
      });
  }, [slug, fetchOrderHistory, setMenu]);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: 'Selesai',
      cancelled: 'Dibatalkan',
      pending: 'Pending',
      confirmed: 'Dikonfirmasi',
      preparing: 'Diproses',
      ready: 'Siap',
    };
    return labels[status] || status;
  };

  const filtered = useMemo(() => {
    return orderHistory.filter((order) => {
      if (!order.createdAt) return false;

      const date = new Date(order.createdAt);
      const now = new Date();

      const dateOk =
        dateFilter === 'all'
          ? true
          : dateFilter === 'today'
          ? isSameDay(date, now)
          : isWithinInterval(date, {
              start: subDays(now, 7),
              end: now,
            });

      const statusOk = statusFilter === 'all' || order.status === statusFilter;

      return dateOk && statusOk;
    });
  }, [orderHistory, dateFilter, statusFilter]);

  const totalFiltered = filtered
    .filter((order) => String(order.paymentStatus) === '2')
    .reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);

  const exportToTSV = () => {
    if (!filtered.length) return;

    const headers = ['Order ID', 'Kode Order', 'Meja', 'Tanggal', 'Status', 'Total'];
    const rows = filtered.map((order) => [
      order.id,
      order.order_code,
      order.table_name || `Meja ${order.table_number || '-'}`,
      new Date(order.createdAt).toLocaleString('id-ID'),
      order.status,
      order.totalPrice,
    ]);

    const tsv = [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');
    const blob = new Blob(['\uFEFF', tsv], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ledger-${new Date().toISOString().slice(0, 10)}.tsv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="py-16 text-center">Memuat data transaksi...</div>;
  }

  return (
    <div className="w-full space-y-5 pb-10">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-stone-100 shadow-sm flex items-center justify-center text-[#0E5C37]">
            <TableIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-400">Ledger</p>
            <h4 className="text-sm font-black text-stone-900 uppercase tracking-widest">{filtered.length} Records</h4>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setShowFilters((v) => !v)} className="w-10 h-10 rounded-xl border flex items-center justify-center">
            <Filter className="w-4 h-4" />
          </button>
          <button onClick={exportToTSV} disabled={!filtered.length} className="px-5 py-2 bg-[#0E5C37] text-white rounded-xl flex items-center gap-2">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* FILTERS PANEL */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
             <div className="p-4 bg-white border rounded-2xl flex gap-4">
                <select onChange={(e) => setDateFilter(e.target.value as DateFilter)} className="text-xs border p-2 rounded-lg">
                    <option value="all">Semua Waktu</option>
                    <option value="today">Hari Ini</option>
                    <option value="7days">7 Hari Terakhir</option>
                </select>
                <select onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border p-2 rounded-lg">
                    <option value="all">Semua Status</option>
                    {['completed', 'pending', 'confirmed', 'preparing', 'ready', 'cancelled'].map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
                </select>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SUMMARY */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-4 flex justify-between items-center">
        <p className="text-sm text-emerald-700">{filtered.length} transaksi</p>
        <p className="text-xl font-black text-[#0E5C37]">{formatPrice(totalFiltered)}</p>
      </div>

      {/* LIST */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-stone-200 rounded-3xl">Tidak ada transaksi</div>
        ) : (
          filtered.map((order) => (
            <div key={order.id} className="bg-white border rounded-3xl overflow-hidden">
              <button onClick={() => setExpandedId(expandedId === order.id ? null : order.id)} className="w-full p-5 flex items-center justify-between">
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    <span className="font-bold">{order.order_code}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-500 mt-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(order.createdAt).toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 border rounded-md text-[10px] font-bold uppercase ${STATUS_COLORS[order.status] ?? 'bg-stone-50 text-stone-500 border-stone-200'}`}>
                    {getStatusLabel(order.status)}
                  </span>
                  {expandedId === order.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              <AnimatePresence>
                {expandedId === order.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    <div className="border-t p-5 bg-stone-50">
                      <div className="mb-4"><span className="px-3 py-1 bg-white border rounded-lg text-xs">{order.table_name || `Meja ${order.table_number || '-'}`}</span></div>
                      <div className="space-y-2">
                        {order.items?.map((item: any, idx: number) => {
                          // 🔴 PERBAIKAN: Gunakan menuItems, bukan setMenu
                          const product = (menuItems || []).find(
                            (m: any) => String(m.id) === String(item.product_id || item.menuItemId)
                          );
                          
                          return (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>
                                {product ? product.name : `Item #${item.product_id || item.menuItemId}`}
                                <span className="ml-2 font-bold text-stone-500">x{item.quantity}</span>
                              </span>
                              <span>
                                {formatPrice(Number(item.price || 0) * Number(item.quantity || 1))}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="border-t mt-4 pt-4 flex justify-between items-end">
                        <div className="flex items-center gap-2"><Tag className="w-4 h-4" /><span className="text-xs uppercase font-bold">Total</span></div>
                        <span className="text-2xl font-black text-[#0E5C37]">{formatPrice(Number(order.totalPrice || 0))}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>
    </div>
  );
}