"use client";

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation'; // Ambil slug dari URL
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

// Formatter lokal IDR yang konsisten dengan kasir & keranjang belanja
const formatIDR = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
    .format(n)
    .replace(/\s/g, '');

export default function AdminDashboardView({ onBack }: Props) {
  const params = useParams();
  const slug = (params.mitraSlug as string) || "";

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [overviewDate, setOverviewDate] = useState<'today' | 'yesterday'>('today');
  const scrollRef = useRef<HTMLDivElement>(null);

  const navigateTo = (tab: AdminTab) => {
    setActiveTab(tab);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (activeTab === 'overview') {
      onBack();
    } else {
      navigateTo('overview');
    }
  };

  const { orderHistory } = useOrderStore();
  const { items: menuItems } = useMenuStore();
  const { materials } = useInventoryStore();

  // --- Perhitungan Real Stats Berdasarkan Tanggal ---
  const targetDate = overviewDate === 'today' ? new Date() : subDays(new Date(), 1);
  const targetOrders = orderHistory.filter(o => isSameDay(new Date(o.createdAt), targetDate));
  const targetRevenue = targetOrders
    .filter(o => o.status === 'confirmed')
    .reduce((sum, o) => sum + (o.totalAfterDiscount || o.totalPrice), 0); // Ambil netto setelah diskon jika ada
  
  const targetOrderCount = targetOrders.length;
  const depleted = menuItems.filter(m => !m.isAvailable).length;
  const lowStock = materials.filter(m => m.stock <= m.lowStockThreshold).length;

  // Render Judul Header Sesuai Warna Hijau Kedai (#0E5C37)
  const tabTitle: Record<AdminTab, JSX.Element> = {
    overview: <><span>System</span><br /><span className="text-[#0E5C37]">Hub.</span></>,
    menu: <><span>Menu</span><br /><span className="text-[#0E5C37]">Editor.</span></>,
    ledger: <><span>Order</span><br /><span className="text-[#0E5C37]">Ledger.</span></>,
    config: <><span>System</span><br /><span className="text-[#0E5C37]">Config.</span></>,
    analytics: <><span>Business</span><br /><span className="text-[#0E5C37]">Analytics.</span></>,
    inventory: <><span>Raw</span><br /><span className="text-[#0E5C37]">Materials.</span></>,
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#f8f9fa] font-sans antialiased text-stone-900">
      {/* Header */}
      <header className="bg-white border-b border-stone-100 px-6 pt-12 pb-8 sticky top-0 z-30 shadow-sm">
        <div className="flex justify-between items-start mb-8">
          <button
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-50 border border-stone-100 hover:bg-stone-100 transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-stone-500" />
          </button>
          <div className="text-right">
            <span className="text-[9px] uppercase tracking-[0.4em] text-[#0E5C37] font-bold block">Admin Protocol</span>
            <div className="flex items-center gap-2 mt-1 justify-end">
              <ShieldCheck className="w-3 h-3 text-[#0E5C37]" />
              <p className="text-xs font-bold text-stone-900 uppercase tracking-widest">Master Terminal</p>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <h1 className="text-5xl font-black tracking-tighter leading-[0.85]">
            {tabTitle[activeTab]}
          </h1>
          {activeTab !== 'overview' && (
            <div className="px-4 py-1.5 bg-stone-50 border border-stone-100 rounded-full flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] uppercase tracking-widest text-stone-500 font-bold">Live Sync</span>
            </div>
          )}
        </div>
      </header>

      {/* Content Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 space-y-8 pb-32 max-w-4xl mx-auto w-full"
            >
              {/* Date Toggle */}
              <div className="flex bg-stone-100 p-1 rounded-full w-fit mb-6 border border-stone-200/40">
                <button
                  onClick={() => setOverviewDate('yesterday')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                    overviewDate === 'yesterday' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  Kemarin
                </button>
                <button
                  onClick={() => setOverviewDate('today')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                    overviewDate === 'today' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  Hari Ini
                </button>
              </div>

              {/* Real Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => navigateTo('ledger')}
                  className="bg-white p-5 rounded-[2rem] border border-stone-100 shadow-sm flex flex-col items-center justify-center gap-3 text-center hover:border-emerald-200 transition-all active:scale-95 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-stone-400 font-bold mb-1">Revenue</p>
                    <p className="text-lg font-black tracking-tight">{targetRevenue > 0 ? formatIDR(targetRevenue) : '—'}</p>
                  </div>
                </button>

                <button 
                  onClick={() => navigateTo('ledger')}
                  className="bg-white p-5 rounded-[2rem] border border-stone-100 shadow-sm flex flex-col items-center justify-center gap-3 text-center hover:border-blue-200 transition-all active:scale-95 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-stone-400 font-bold mb-1">Order</p>
                    <p className="text-lg font-black tracking-tight">{targetOrderCount} Order</p>
                  </div>
                </button>

                <button 
                  onClick={() => navigateTo('menu')}
                  className="bg-white p-5 rounded-[2rem] border border-stone-100 shadow-sm flex flex-col items-center justify-center gap-3 text-center hover:border-rose-200 transition-all active:scale-95 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-all">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-stone-400 font-bold mb-1">Menu Nonaktif</p>
                    <p className="text-lg font-black tracking-tight">{depleted} Item</p>
                  </div>
                </button>

                <button 
                  onClick={() => navigateTo('inventory')}
                  className={`bg-white p-5 rounded-[2rem] border shadow-sm flex flex-col items-center justify-center gap-3 text-center transition-all active:scale-95 ${lowStock > 0 ? 'border-amber-200 bg-amber-50/20 hover:border-amber-400' : 'border-stone-100 hover:border-stone-300'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${lowStock > 0 ? 'bg-amber-50 text-amber-500 animate-bounce' : 'bg-stone-50 text-stone-400'}`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-stone-400 font-bold mb-1">Stok Menipis</p>
                    <p className={`text-lg font-black tracking-tight ${lowStock > 0 ? 'text-amber-600' : ''}`}>{lowStock} Bahan</p>
                  </div>
                </button>
              </div>

              {/* Management Navigation Cards */}
              <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-[0.4em] text-stone-400 font-bold pl-2">Management Protocols</p>

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
                    className="w-full bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm flex items-center justify-between group hover:border-[#0E5C37] hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-stone-50 flex items-center justify-center text-stone-400 group-hover:bg-[#0E5C37] group-hover:text-white group-hover:shadow-lg group-hover:shadow-emerald-900/20 transition-all duration-300 shrink-0">
                        {icon}
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-black tracking-tight text-stone-800 mb-0.5 group-hover:text-[#0E5C37] transition-colors">{title}</h3>
                        <p className="text-xs text-stone-400 font-medium leading-relaxed">{desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-[#0E5C37] group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

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
  );
}