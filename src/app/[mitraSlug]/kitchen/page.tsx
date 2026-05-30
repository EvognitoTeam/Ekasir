"use client";

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, RefreshCw, BellRing, Loader2, ChefHat, History, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import KitchenTicket from '@/components/kitchen/KitchenTicket'; 
import { Order } from '@/types/menu'; 

interface Props {
  onLogout: () => void;
  staffName: string;
}

export default function KitchenDisplay({ onLogout, staffName }: Props) {
  const params = useParams();
  const slug = (params.mitraSlug as string) || (params.slug as string) || "";

  // ─── STATE MANAGEMENT ───
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // ─── DATA FETCHING & POLLING ───
  const fetchOrders = async (silent = false) => {
    if (!slug) return;
    if (!silent) setIsRefetching(true);
    
    try {
      // 🔴 1. KEMBALIKAN KE API HISTORY BAWAAN YANG UDAH TERBUKTI JALAN DI KASIR
      const res = await fetch(`/api/pos/kitchen/orders?slug=${slug}`);
      const result = await res.json();
      
      if (result.success && Array.isArray(result.data)) {
        setOrders(prev => {
           // Logika Notifikasi Lonceng
           if (prev.length > 0) {
             const oldConfirmed = prev.filter(o => o.status === 'confirmed').length;
             const newConfirmed = result.data.filter((o: any) => o.status === 'confirmed').length;
             
             if (newConfirmed > oldConfirmed) {
               setNotification('Pesanan baru masuk ke dapur!');
               setTimeout(() => setNotification(null), 5000);
             }
           }
           return result.data;
        });
      }
    } catch (e) {
      console.error("Gagal load pesanan dapur:", e);
    } finally {
      setLoading(false);
      setIsRefetching(false);
    }
  };

  // Initial Fetch & Auto-Refresh (Polling tiap 3 detik)
  useEffect(() => {
    fetchOrders(); 
    const interval = setInterval(() => {
      fetchOrders(true); 
    }, 3000); 
    
    return () => clearInterval(interval);
  }, [slug]);

  // ─── UPDATE STATUS PESANAN ───
  const executeUpdate = async (orderId: string, newStatus: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    
    try {
      // 🔴 2. KEMBALIKAN JUGA API UPDATE-NYA KE HISTORY
      await fetch(`/api/orders/history?slug=${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus })
      });
    } catch (e) {
      console.error("Gagal update status dapur:", e);
      fetchOrders(true); 
    }
  };

  // ─── FILTERING LOGIC ───
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (activeTab === 'active') {
        // 🔴 FILTER DIPERBAIKI: Hanya tampilkan pesanan yang sudah dibayar/di-ACC (confirmed) dan sedang dimasak (preparing)
        return o.status === 'confirmed' || o.status === 'preparing';
      } else {
        // Tab History: Tampilkan yang sudah siap, selesai, atau batal
        return o.status === 'ready' || o.status === 'completed' || o.status === 'cancelled';
      }
    }).sort((a, b) => {
      // Urutkan: Yang paling lama dibuat, muncul paling awal (FIFO)
      const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
      const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
      
      // Khusus history, yang terbaru yang di atas (LIFO)
      if (activeTab === 'history') return dateB - dateA;
      
      return dateA - dateB;
    });
  }, [orders, activeTab]);

  return (
    <div className="min-h-screen bg-[#f0ede9] font-sans flex justify-center w-full">
      <div className="w-full max-w-7xl h-screen bg-[#f6f3ee] flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* ─── NOTIFIKASI ─── */}
        <AnimatePresence>
          {notification && (
            <motion.div 
              initial={{ opacity: 0, y: -50 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-bold tracking-wide"
            >
              <BellRing className="w-5 h-5 animate-bounce" /> 
              {notification}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── HEADER ─── */}
        <header className="bg-white px-6 py-4 border-b border-stone-200 flex justify-between items-center shrink-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-0.5">Kitchen Display System</p>
              <h1 className="text-xl font-black text-stone-800 tracking-tight leading-none">
                Stasiun Dapur <span className="text-amber-500">&bull;</span> {staffName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => fetchOrders()} 
              title="Refresh Data" 
              className="w-10 h-10 rounded-xl bg-stone-50 border border-stone-200 text-stone-500 flex items-center justify-center hover:bg-stone-100 hover:text-stone-800 transition-all active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
            </button>
            <button 
              onClick={onLogout} 
              title="Keluar" 
              className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center hover:bg-red-100 hover:text-red-700 transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ─── TABS ─── */}
        <div className="px-6 py-3 bg-white border-b border-stone-200 flex gap-3 shrink-0">
          <button 
            onClick={() => setActiveTab('active')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              activeTab === 'active' 
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' 
                : 'bg-stone-50 text-stone-400 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Flame className="w-4 h-4" /> 
            Pesanan Aktif
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              activeTab === 'history' 
                ? 'bg-stone-800 text-white shadow-md shadow-stone-800/20' 
                : 'bg-stone-50 text-stone-400 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <History className="w-4 h-4" />
            Riwayat
          </button>
        </div>

        {/* ─── MAIN CONTENT ─── */}
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading && orders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-70">
               <Loader2 className="animate-spin w-10 h-10 text-amber-500 mb-4" />
               <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Memuat Tiket Dapur...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-60">
              <div className="w-20 h-20 rounded-3xl bg-white border-2 border-dashed border-stone-300 flex items-center justify-center mb-6 shadow-sm">
                {activeTab === 'active' ? <ChefHat className="w-10 h-10 text-stone-300" /> : <History className="w-10 h-10 text-stone-300" />}
              </div>
              <h2 className="text-lg font-black text-stone-800 tracking-tight mb-2">
                {activeTab === 'active' ? 'Dapur Sedang Kosong' : 'Belum Ada Riwayat'}
              </h2>
              <p className="text-sm text-stone-500 max-w-xs text-center leading-relaxed">
                {activeTab === 'active' 
                  ? 'Belum ada tiket pesanan masuk ke antrean. Waktunya bernapas sejenak!' 
                  : 'Pesanan yang telah selesai atau dibatalkan akan muncul di sini.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
              <AnimatePresence>
                {filteredOrders.map(order => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                  >
                    <KitchenTicket 
                      order={order} 
                      onUpdateStatus={executeUpdate} 
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}