"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Settings, 
  Package, 
  FileText, 
  TrendingUp, 
  ChevronRight,
  ShieldCheck,
  Menu as MenuIcon
} from 'lucide-react';
import MenuEditor from '../admin/MenuEditor';
import OrderLedger from '../admin/OrderLedger';

interface Props {
  onBack: () => void;
}

type AdminTab = 'overview' | 'menu' | 'ledger';

export default function AdminDashboardView({ onBack }: Props) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#f8f9fa] w-full overflow-hidden font-sans">
      
      {/* 🔴 HEADER YANG SUPER COMPACT */}
      <header className="bg-white border-b border-stone-100 px-6 sm:px-12 lg:px-24 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          
          {/* KIRI: Tombol Back & Judul (Sekarang sebaris dan rapi) */}
          <div className="flex items-center gap-4">
            <button 
              onClick={activeTab === 'overview' ? onBack : () => setActiveTab('overview')} 
              className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-50 border border-stone-100 hover:bg-stone-200 shadow-sm transition-all active:scale-95 shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-stone-600" />
            </button>
            <div>
               {/* 🔴 HAPUS <br /> DAN KECILKAN FONT MENJADI text-2xl/3xl */}
               <h1 className="text-2xl md:text-3xl font-display font-black tracking-tight text-stone-900 leading-none">
                  {activeTab === 'overview' && <>Systems <span className="text-[#0E5C37]">Hub.</span></>}
                  {activeTab === 'menu' && <>Menu <span className="text-[#0E5C37]">Editor.</span></>}
                  {activeTab === 'ledger' && <>Order <span className="text-[#0E5C37]">Ledger.</span></>}
               </h1>
            </div>
          </div>

          {/* KANAN: Indikator & Status */}
          <div className="text-right flex flex-col items-end">
            <div className="flex items-center gap-1.5 mb-1.5">
               <ShieldCheck className="w-3.5 h-3.5 text-[#0E5C37]" />
               <p className="text-[11px] font-sans font-bold text-stone-900 uppercase tracking-widest leading-none">Master Terminal</p>
            </div>
            {activeTab === 'overview' ? (
              <span className="text-[9px] font-label uppercase tracking-[0.3em] text-[#0E5C37] font-bold block leading-none">Admin Protocol</span>
            ) : (
               <div className="px-3 py-1 bg-stone-50 border border-stone-100 rounded-full flex items-center gap-1.5 shadow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[9px] font-label uppercase tracking-widest text-stone-500 font-bold leading-none">Live Sync</span>
               </div>
            )}
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 sm:px-12 lg:px-24">
        {/* 🔴 PADDING ATAS DIKURANGI (pt-6) */}
        <div className="max-w-7xl mx-auto w-full h-full pt-6 pb-24">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6" // 🔴 JARAK ANTAR BLOK DIPERKECIL (space-y-6)
              >
                 {/* Quick Stats Grid */}
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl">
                    <div className="bg-white p-5 lg:p-6 rounded-[1.5rem] border border-stone-100 shadow-sm flex flex-col gap-3 hover:shadow-md hover:-translate-y-1 transition-all">
                       <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-[#0E5C37] shadow-inner">
                          <TrendingUp className="w-5 h-5" />
                       </div>
                       <div>
                          <p className="text-[10px] font-label font-bold uppercase tracking-widest text-stone-400">Total Revenue</p>
                          <p className="text-xl md:text-2xl font-display font-black tracking-tight mt-0.5">Rp 12.4M</p>
                       </div>
                    </div>
                    <div className="bg-white p-5 lg:p-6 rounded-[1.5rem] border border-stone-100 shadow-sm flex flex-col gap-3 hover:shadow-md hover:-translate-y-1 transition-all">
                       <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
                          <Package className="w-5 h-5" />
                       </div>
                       <div>
                          <p className="text-[10px] font-label font-bold uppercase tracking-widest text-stone-400">Orders Today</p>
                          <p className="text-xl md:text-2xl font-display font-black tracking-tight mt-0.5">42 Sessions</p>
                       </div>
                    </div>
                 </div>

                 {/* Navigation Cards */}
                 <div className="space-y-4 pt-4 border-t border-stone-200/50">
                    <div className="flex items-center gap-3 pl-2">
                       <div className="w-8 h-1 bg-[#0E5C37] rounded-full" />
                       <p className="text-[11px] font-label font-bold uppercase tracking-[0.3em] text-stone-500">Management Protocols</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <button 
                        onClick={() => setActiveTab('menu')}
                        className="w-full bg-white p-5 rounded-[1.5rem] border border-stone-100 shadow-sm flex items-center justify-between group hover:border-[#0E5C37] hover:shadow-md transition-all text-left"
                      >
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-stone-50 flex items-center justify-center text-stone-400 group-hover:bg-[#0E5C37] group-hover:text-white group-hover:shadow-md transition-all shrink-0">
                               <MenuIcon className="w-5 h-5" />
                            </div>
                            <div>
                               <h3 className="text-base font-display font-black tracking-tight group-hover:text-[#0E5C37] transition-colors">Bistro Menu Editor</h3>
                               <p className="text-xs text-stone-500 font-medium line-clamp-1 mt-0.5">Modify availability & price fragments</p>
                            </div>
                         </div>
                         <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-[#0E5C37] group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                      </button>

                      <button 
                        onClick={() => setActiveTab('ledger')}
                        className="w-full bg-white p-5 rounded-[1.5rem] border border-stone-100 shadow-sm flex items-center justify-between group hover:border-[#0E5C37] hover:shadow-md transition-all text-left"
                      >
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-stone-50 flex items-center justify-center text-stone-400 group-hover:bg-[#0E5C37] group-hover:text-white group-hover:shadow-md transition-all shrink-0">
                               <FileText className="w-5 h-5" />
                            </div>
                            <div>
                               <h3 className="text-base font-display font-black tracking-tight group-hover:text-[#0E5C37] transition-colors">Order Settlement</h3>
                               <p className="text-xs text-stone-500 font-medium line-clamp-1 mt-0.5">View history & analytical records</p>
                            </div>
                         </div>
                         <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-[#0E5C37] group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                      </button>

                      <button 
                        className="w-full bg-stone-50/30 p-5 rounded-[1.5rem] border border-stone-100 shadow-sm flex items-center justify-between group grayscale opacity-50 cursor-not-allowed text-left"
                      >
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white border border-stone-100 flex items-center justify-center text-stone-300 shrink-0">
                               <Settings className="w-5 h-5" />
                            </div>
                            <div>
                               <h3 className="text-base font-display font-black tracking-tight">System Configuration</h3>
                               <p className="text-xs text-stone-500 font-medium line-clamp-1 mt-0.5">Configure global bistro parameters</p>
                            </div>
                         </div>
                         <ChevronRight className="w-5 h-5 text-stone-200 shrink-0 ml-2" />
                      </button>
                    </div>
                 </div>
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
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}