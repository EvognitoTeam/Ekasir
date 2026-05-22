"use client";

import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Settings,
  Package,
  FileText,
  TrendingUp,
  ChevronRight,
  ShieldCheck,
  Menu as MenuIcon,
  BarChart2,
  AlertTriangle,
  DollarSign,
  ShoppingBag,
} from 'lucide-react';
import MenuEditor from '../../../components/admin/MenuEditor';
import OrderLedger from '../../../components/admin/OrderLedger';
import SystemConfig from '../../../components/admin/SystemConfig';
import AnalyticsPanel from '../../../components/admin/AnalyticsPanel';
import InventoryPanel from '../../../components/admin/InventoryPanel';
import { useOrderStore } from '../../../store/order.store';
import { useMenuStore } from '../../../store/menu.store';
import { useInventoryStore } from '../../../store/inventory.store';
import { isSameDay, subDays } from 'date-fns';


interface Props {
  onBack: () => void;
}

type AdminTab = 'overview' | 'menu' | 'ledger' | 'config' | 'analytics' | 'inventory';

const formatIDR = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
    .format(n)
    .replace(/\s/g, '');

export default function AdminDashboardView({ onBack }: Props) {
  const params = useParams();
  const slug = (params.mitraSlug as string) || "";

  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [overviewDate, setOverviewDate] = useState<'today' | 'yesterday'>('today');
  const scrollRef = useRef<HTMLDivElement>(null);

  const navigateTo = (tab: AdminTab) => {
    setActiveTab(tab);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (activeTab === 'overview') {
      // Jika di Overview, pulangkan ke halaman toko (slug)
      router.push(`/${slug}`); 
    } else {
      // Jika di tab lain, kembali ke Overview
      navigateTo('overview');
    }
  };

  const { orderHistory } = useOrderStore();
  const { items: menuItems } = useMenuStore();
  const { materials } = useInventoryStore();

  const stats = useMemo(() => {
    const targetDate = overviewDate === 'today' ? new Date() : subDays(new Date(), 1);
    
    // Filter orders berdasarkan tanggal target
    const targetOrders = orderHistory.filter(o => 
      o.createdAt && isSameDay(new Date(o.createdAt), targetDate)
    );

    // Hitung Revenue (Prioritaskan totalAfterDiscount)
    const targetRevenue = targetOrders
      .filter(o => o.status === 'confirmed')
      .reduce((sum, o) => sum + (Number(o.totalAfterDiscount) || Number(o.totalPrice) || 0), 0);
    
    // Hitung Order Count
    const targetOrderCount = targetOrders.length;
    
    // Hitung Menu Nonaktif (Sold Out)
    const depleted = menuItems.filter(m => !m.isAvailable || Number(m.stock) <= 0).length;
    
    // Hitung Stok Menipis
    const lowStock = materials.filter(m => Number(m.stock) <= Number(m.lowStockThreshold)).length;

    return { targetRevenue, targetOrderCount, depleted, lowStock };
  }, [orderHistory, menuItems, materials, overviewDate]); // Data akan ter-update otomatis jika store ini berubah

  const targetDate = overviewDate === 'today' ? new Date() : subDays(new Date(), 1);
  const targetOrders = orderHistory.filter(o => isSameDay(new Date(o.createdAt), targetDate));
  const targetRevenue = targetOrders
    .filter(o => o.status === 'confirmed')
    .reduce((sum, o) => sum + (o.totalAfterDiscount || o.totalPrice), 0);
  
  const targetOrderCount = targetOrders.length;
  const depleted = menuItems.filter(m => !m.isAvailable).length;
  const lowStock = materials.filter(m => m.stock <= m.lowStockThreshold).length;



  return (
    <div className="flex flex-col h-full min-h-screen bg-[#f8f9fa] font-sans antialiased text-stone-900 w-full overflow-hidden">
      
      {/* 🔴 HEADER YANG SUPER COMPACT (PADDING DIPERKECIL, FLEX SEBARIS) */}
      <header className="bg-white border-b border-stone-100 px-6 sm:px-12 lg:px-24 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          
          {/* Bagian Kiri: Tombol Back + Judul Sebaris */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-50 border border-stone-100 hover:bg-stone-200 transition-all active:scale-95 shadow-sm shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-stone-600" />
            </button>
            <h1 className="text-2xl md:text-3xl font-display font-black tracking-tight text-stone-900 leading-none">
              {activeTab === 'overview' && <>System <span className="text-[#0E5C37]">Hub.</span></>}
              {activeTab === 'menu' && <>Menu <span className="text-[#0E5C37]">Editor.</span></>}
              {activeTab === 'ledger' && <>Order <span className="text-[#0E5C37]">Ledger.</span></>}
              {activeTab === 'config' && <>System <span className="text-[#0E5C37]">Config.</span></>}
              {activeTab === 'analytics' && <>Business <span className="text-[#0E5C37]">Analytics.</span></>}
              {activeTab === 'inventory' && <>Raw <span className="text-[#0E5C37]">Materials.</span></>}
            </h1>
          </div>

          {/* Bagian Kanan: Indikator Sistem */}
          <div className="text-right flex flex-col items-end">
            <div className="flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0E5C37]" />
              <p className="text-[11px] font-bold text-stone-900 uppercase tracking-widest leading-none">Master Terminal</p>
            </div>
            {activeTab === 'overview' ? (
              <span className="text-[9px] uppercase tracking-[0.3em] text-[#0E5C37] font-bold block leading-none">Admin Protocol</span>
            ) : (
              <div className="px-3 py-1 bg-stone-50 border border-stone-100 rounded-full flex items-center gap-1.5 shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] uppercase tracking-widest text-stone-500 font-bold leading-none">Live Sync</span>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Content Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar px-6 sm:px-12 lg:px-24">
        {/* 🔴 PADDING ATAS (pt-6) DIPERKECIL AGAR KONTEN NAIK */}
        <div className="max-w-7xl mx-auto w-full h-full pt-6 pb-24">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6" // 🔴 JARAK ANTAR BLOK DIPERKECIL
              >
                {/* Date Toggle */}
                <div className="flex bg-white p-1 rounded-full w-fit border border-stone-200/40 shadow-sm">
                  <button
                    onClick={() => setOverviewDate('yesterday')}
                    className={`px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                      overviewDate === 'yesterday' ? 'bg-[#0E5C37] text-white shadow-md' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    Kemarin
                  </button>
                  <button
                    onClick={() => setOverviewDate('today')}
                    className={`px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                      overviewDate === 'today' ? 'bg-[#0E5C37] text-white shadow-md' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    Hari Ini
                  </button>
                </div>

                {/* Grid Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <button 
                    onClick={() => navigateTo('ledger')}
                    className="bg-white p-5 rounded-[1.5rem] border border-stone-100 shadow-sm flex flex-col items-start justify-center gap-3 text-left hover:border-emerald-200 hover:shadow-md transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 transition-all shadow-inner">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Total Revenue</p>
                      <p className="text-xl md:text-2xl font-black tracking-tight">
                        {stats.targetRevenue > 0 ? formatIDR(stats.targetRevenue) : '—'}
                      </p>
                    </div>
                  </button>

                  <button 
                    onClick={() => navigateTo('ledger')}
                    className="bg-white p-5 rounded-[1.5rem] border border-stone-100 shadow-sm flex flex-col items-start justify-center gap-3 text-left hover:border-blue-200 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 transition-all shadow-inner">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Orders Confirmed</p>
                      <p className="text-xl md:text-2xl font-black tracking-tight">{stats.targetOrderCount} Order</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => navigateTo('menu')}
                    className="bg-white p-5 rounded-[1.5rem] border border-stone-100 shadow-sm flex flex-col items-start justify-center gap-3 text-left hover:border-rose-200 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 transition-all shadow-inner">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Menu Nonaktif</p>
                      <p className="text-xl md:text-2xl font-black tracking-tight">{stats.depleted} Item</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => navigateTo('inventory')}
                    className={`bg-white p-5 rounded-[1.5rem] border shadow-sm flex flex-col items-start justify-center gap-3 text-left transition-all ${stats.lowStock > 0 ? 'border-amber-200 bg-amber-50/10' : 'border-stone-100'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${stats.lowStock > 0 ? 'bg-amber-100 text-amber-600 animate-pulse' : 'bg-stone-50 text-stone-400'}`}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Stok Menipis</p>
                      <p className={`text-xl md:text-2xl font-black tracking-tight ${stats.lowStock > 0 ? 'text-amber-600' : ''}`}>{stats.lowStock} Bahan</p>
                    </div>
                  </button>
                </div>

                {/* 🔴 MANAGEMENT CARDS: Padding dikurangi jadi p-5. Layoutnya dibuat mendatar (flex-row) */}
                <div className="space-y-4 pt-2 border-t border-stone-200/50">
                  <div className="flex items-center gap-3 pl-2">
                     <div className="w-8 h-1 bg-[#0E5C37] rounded-full" />
                     <p className="text-[11px] uppercase tracking-[0.3em] text-stone-500 font-bold">Management Protocols</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {([
                      { tab: 'analytics', icon: <BarChart2 className="w-6 h-6" />, title: 'Business Analytics', desc: 'Tren penjualan, top item & jam sibuk' },
                      { tab: 'menu', icon: <MenuIcon className="w-6 h-6" />, title: 'Menu Editor', desc: 'Atur ketersediaan & harga menu' },
                      { tab: 'ledger', icon: <FileText className="w-6 h-6" />, title: 'Order Ledger', desc: 'Riwayat & filter transaksi' },
                      { tab: 'inventory', icon: <Package className="w-6 h-6" />, title: 'Raw Materials', desc: 'Pantau stok & pengeluaran' },
                      { tab: 'config', icon: <Settings className="w-6 h-6" />, title: 'System Config', desc: 'Pajak, service charge & operasional' },
                    ] as { tab: AdminTab; icon: JSX.Element; title: string; desc: string }[]).map(({ tab, icon, title, desc }) => (
                      <button
                        key={tab}
                        onClick={() => navigateTo(tab)}
                        className="w-full bg-white p-5 rounded-[1.5rem] border border-stone-100 shadow-sm flex items-center justify-between group hover:border-[#0E5C37] hover:shadow-md transition-all duration-300 text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-stone-50 flex items-center justify-center text-stone-400 group-hover:bg-[#0E5C37] group-hover:text-white group-hover:shadow-md transition-all shrink-0">
                            {icon}
                          </div>
                          <div>
                            <h3 className="text-base font-black tracking-tight text-stone-800 group-hover:text-[#0E5C37] transition-colors line-clamp-1">{title}</h3>
                            <p className="text-xs text-stone-500 font-medium line-clamp-1 mt-0.5">{desc}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-[#0E5C37] group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Komponen-komponen panel lainnya */}
            {activeTab === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full">
                <AnalyticsPanel />
              </motion.div>
            )}

            {activeTab === 'menu' && (
              <motion.div key="menu" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full">
                <MenuEditor />
              </motion.div>
            )}

            {activeTab === 'ledger' && (
              <motion.div key="ledger" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full">
                <OrderLedger />
              </motion.div>
            )}

            {activeTab === 'inventory' && (
              <motion.div key="inventory" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full">
                <InventoryPanel />
              </motion.div>
            )}

            {activeTab === 'config' && (
              <motion.div key="config" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full">
                <SystemConfig />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}