"use client";

import { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Settings,
  Package,
  BookOpen,
  ShieldCheck,
  Clock,
  Tag,
  Users,
  Coffee,
  AlertTriangle,
  ShoppingBag,
  DollarSign
} from 'lucide-react';

import MenuEditor from '@/components/admin/MenuEditor';
import OrderLedger from '@/components/admin/OrderLedger';
import SystemConfig from '@/components/admin/SystemConfig';
import InventoryPanel from '@/components/admin/InventoryPanel';
import PromoManager from '@/components/admin/PromoManager'; 
import StaffManager from '@/components/admin/StaffManager'; 

import { useOrderStore } from '@/store/order.store';
import { useMenuStore } from '@/store/menu.store';
import { useInventoryStore } from '@/store/inventory.store';
// import { usePromoStore } from '@/store/promo.store'; // Uncomment jika lu udah pake Zustand buat promo
import { isSameDay, subDays } from 'date-fns';

// ─── KONFIGURASI MENU DARI TEMPLATE TEMAN LU ───
type AdminTab = 'overview' | 'menu' | 'ledger' | 'config' | 'inventory' | 'promos' | 'staff';

const TAB_TITLES: Record<AdminTab, string> = {
  overview: 'Beranda Admin',
  menu: 'Katalog Menu',
  ledger: 'Order Ledger',
  config: 'Pengaturan Sistem',
  inventory: 'Bahan Baku',
  promos: 'Promo & Event',
  staff: 'Akses Staf',
};

const MENU_ITEMS_LIST = [
  { tab: 'promos', title: 'Promotions', desc: 'Kelola diskon & event promosi', iconId: 'promos', color: 'linear-gradient(135deg, #F59E0B, #D97706)' },
  { tab: 'staff', title: 'Staf & PIN', desc: 'Atur akses karyawan', iconId: 'staff', color: 'linear-gradient(135deg, #3B82F6, #2563EB)' },
  { tab: 'menu', title: 'Katalog Menu', desc: 'Atur harga, kategori, ketersediaan', iconId: 'menu', color: 'linear-gradient(135deg, #0E5C37, #065F46)' },
  { tab: 'ledger', title: 'Ledger Transaksi', desc: 'Riwayat & pencarian transaksi', iconId: 'ledger', color: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' },
  { tab: 'inventory', title: 'Bahan Baku', desc: 'Stok barang, notifikasi minimum', iconId: 'inventory', color: 'linear-gradient(135deg, #EC4899, #DB2777)' },
  { tab: 'config', title: 'Konfigurasi', desc: 'Atur pajak, pajak online, mode', iconId: 'config', color: 'linear-gradient(135deg, #64748B, #475569)' },
] as const;

export default function AdminDashboardView() {
  const params = useParams();
  const slug = (params.mitraSlug as string) || "";
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [overviewDate, setOverviewDate] = useState<'today' | 'yesterday'>('today');
  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── STATE JAM REALTIME WIB ───
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      setCurrentTime(`${timeString} WIB`);
    };
    updateClock();
    const timerId = setInterval(updateClock, 1000);
    return () => clearInterval(timerId);
  }, []);

  const navigateTo = (tab: AdminTab) => {
    setActiveTab(tab);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (activeTab === 'overview') {
      router.push(`/${slug}`); 
    } else {
      navigateTo('overview');
    }
  };

  const { orderHistory } = useOrderStore();
  const { items: menuItems } = useMenuStore();
  const { materials } = useInventoryStore();
  // const { getActivePromotions } = usePromoStore();

  const stats = useMemo(() => {
    const targetDate = overviewDate === 'today' ? new Date() : subDays(new Date(), 1);

    const targetOrders = orderHistory.filter((o: any) => {
      if (!o.createdAt) return false;
      return isSameDay(new Date(o.createdAt), targetDate);
    });

    const activeOrdersCount = orderHistory.filter((o: any) => o.status !== 'completed').length;
    const targetOrderCount = targetOrders.length;
    const depleted = menuItems.filter((m: any) => !m.isAvailable || Number(m.stock) <= 0).length;
    const lowStock = materials.filter((m: any) => Number(m.stock) <= Number(m.lowStockThreshold)).length;
    
    // Ganti 0 ini dengan getActivePromotions().length kalau lu udah setup Promo Store
    const activePromoCount = 0; 

    return { targetOrderCount, activeOrdersCount, depleted, lowStock, activePromoCount };
  }, [orderHistory, menuItems, materials, overviewDate]);

  const renderIcon = (iconId: string) => {
    const cls = "w-6 h-6 text-white";
    switch (iconId) {
      case 'promos': return <Tag className={cls} />;
      case 'staff': return <Users className={cls} />;
      case 'menu': return <Coffee className={cls} />;
      case 'ledger': return <BookOpen className={cls} />;
      case 'inventory': return <Package className={cls} />;
      case 'config': return <Settings className={cls} />;
      default: return null;
    }
  };

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } } };

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#f8f9fa] font-sans antialiased w-full overflow-hidden">
      
      {/* ─── HEADER (EXPRESSIVE CASHIER AESTHETIC - FULL DESKTOP) ─── */}
      <header className="relative bg-[#0E5C37] px-6 sm:px-12 lg:px-24 py-6 md:py-8 shrink-0 overflow-hidden shadow-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-black opacity-10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto w-full flex items-center justify-between z-0">
          
          <div className="flex items-center gap-5">
            <button
              onClick={handleBack}
              className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all active:scale-95 shadow-sm backdrop-blur-sm shrink-0"
              title="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/15 border border-white/20 backdrop-blur-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-widest leading-none">Administrator</span>
                </div>
                {activeTab !== 'overview' && (
                   <span className="text-[10px] font-medium text-emerald-100 hidden sm:block">/ {TAB_TITLES[activeTab]}</span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-display font-black tracking-tight text-white leading-none">
                {TAB_TITLES[activeTab]}
              </h1>
            </div>
          </div>

          <div className="text-right flex flex-col items-end justify-center">
            {currentTime && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 mb-1.5 rounded-lg bg-black/20 border border-black/10 backdrop-blur-sm text-emerald-50 hidden sm:flex">
                <Clock className="w-3.5 h-3.5 text-emerald-300" />
                <span className="text-xs font-bold font-mono tracking-widest leading-none">{currentTime}</span>
              </div>
            )}
            {activeTab === 'overview' ? (
              <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/80 font-bold block leading-none">Pusat Kendali Operasional</span>
            ) : (
              <div className="px-3 py-1 bg-white/10 border border-white/15 rounded-full flex items-center gap-1.5 shadow-inner backdrop-blur-md">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="text-[9px] uppercase tracking-widest text-emerald-100 font-bold leading-none">Live Sync</span>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* ─── CONTENT AREA ─── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar px-6 sm:px-12 lg:px-24 relative z-0">
        <div className="max-w-7xl mx-auto w-full h-full pt-8 pb-24">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial="hidden" animate="visible" exit="hidden" variants={containerVariants}
                className="space-y-8" 
              >
                
                {/* Stats Ribbon / Toggle */}
                <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-lg font-black text-stone-800 tracking-tight">Ringkasan Data</h2>
                  <div className="flex bg-white p-1.5 rounded-full w-fit border border-stone-200 shadow-sm">
                    <button onClick={() => setOverviewDate('yesterday')} 
                      className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${overviewDate === 'yesterday' ? 'bg-[#0E5C37] text-white shadow-md' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'}`}
                    >Kemarin</button>
                    <button onClick={() => setOverviewDate('today')}
                      className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${overviewDate === 'today' ? 'bg-[#0E5C37] text-white shadow-md' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'}`}
                    >Hari Ini</button>
                  </div>
                </motion.div>

                {/* Stats Cards (Sesuai List Teman) */}
                <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[
                    { label: 'Total Order', value: stats.targetOrderCount, color: 'text-stone-800', bg: 'bg-white' },
                    { label: 'Antrean Aktif', value: stats.activeOrdersCount, color: 'text-[#0E5C37]', bg: 'bg-emerald-50/50' },
                    { label: 'Menu Habis', value: stats.depleted, color: stats.depleted > 0 ? 'text-red-600' : 'text-stone-800', bg: 'bg-white' },
                    { label: 'Stok Menipis', value: stats.lowStock, color: stats.lowStock > 0 ? 'text-amber-600' : 'text-stone-800', bg: stats.lowStock > 0 ? 'bg-amber-50/30' : 'bg-white' },
                    { label: 'Promo Aktif', value: stats.activePromoCount, color: 'text-blue-600', bg: 'bg-blue-50/50' }
                  ].map((stat, i) => (
                    <div key={i} className={`${stat.bg} p-5 rounded-[1.5rem] border border-stone-100 shadow-sm flex flex-col items-start justify-center gap-1`}>
                      <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">{stat.label}</span>
                      <span className={`text-2xl md:text-3xl font-black tracking-tight ${stat.color}`}>{stat.value}</span>
                    </div>
                  ))}
                </motion.div>

                <div className="pt-4 border-t border-stone-200/60">
                  <h2 className="text-lg font-black text-stone-800 tracking-tight mb-4">Modul Manajemen</h2>
                </div>

                {/* Module Cards Grid (Dengan Warna Gradien Dinamis) */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {MENU_ITEMS_LIST.map((item) => (
                    <motion.button
                      whileHover={{ scale: 1.02, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      key={item.tab}
                      onClick={() => navigateTo(item.tab as AdminTab)}
                      className="bg-white p-5 rounded-[1.5rem] border border-stone-100 shadow-sm flex items-center justify-between group transition-all hover:shadow-md hover:border-stone-200 text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-110 shrink-0" 
                          style={{ background: item.color }}
                        >
                          {renderIcon(item.iconId)}
                        </div>
                        <div>
                          <h3 className="text-base font-black text-stone-800 tracking-tight mb-0.5">{item.title}</h3>
                          <p className="text-xs text-stone-500 font-medium leading-snug line-clamp-1">{item.desc}</p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              </motion.div>
            )}

            {/* Render Tab Konten Dinamis */}
            {activeTab === 'menu' && <motion.div key="menu" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><MenuEditor /></motion.div>}
            {activeTab === 'ledger' && <motion.div key="ledger" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><OrderLedger /></motion.div>}
            {activeTab === 'inventory' && <motion.div key="inventory" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><InventoryPanel /></motion.div>}
            {activeTab === 'promos' && <motion.div key="promos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><PromoManager /></motion.div>}
            {activeTab === 'config' && <motion.div key="config" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><SystemConfig /></motion.div>}
            {activeTab === 'staff' && <motion.div key="staff" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><StaffManager /></motion.div>}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}