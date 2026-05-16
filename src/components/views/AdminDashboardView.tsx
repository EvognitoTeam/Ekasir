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
    <div className="flex flex-col h-full bg-[#f8f9fa]">
      {/* Editorial Admin Header */}
      <header className="bg-white border-b border-stone-100 px-6 pt-12 pb-8 sticky top-0 z-30 shadow-sm">
        <div className="flex justify-between items-start mb-8">
          <button 
            onClick={activeTab === 'overview' ? onBack : () => setActiveTab('overview')} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-50 border border-stone-100 hover:bg-stone-100 transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-stone-500" />
          </button>
          <div className="text-right">
            <span className="text-[9px] font-label uppercase tracking-[0.4em] text-[var(--color-primary)] font-bold">Admin Protocol</span>
            <div className="flex items-center gap-2 mt-1 justify-end">
               <ShieldCheck className="w-3 h-3 text-[var(--color-primary)]" />
               <p className="text-xs font-sans font-bold text-stone-900 uppercase tracking-widest">Master Terminal</p>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between">
           <h1 className="text-5xl font-display leading-[0.8] tracking-tighter">
              {activeTab === 'overview' && <>System <br /><span className="text-[var(--color-primary)]">Hub.</span></>}
              {activeTab === 'menu' && <>Menu <br /><span className="text-[var(--color-primary)]">Editor.</span></>}
              {activeTab === 'ledger' && <>Order <br /><span className="text-[var(--color-primary)]">Ledger.</span></>}
           </h1>
           
           {activeTab !== 'overview' && (
             <div className="px-4 py-1.5 bg-stone-50 border border-stone-100 rounded-full flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] font-label uppercase tracking-widest text-stone-500">Live Sync</span>
             </div>
           )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 space-y-8 pb-32"
            >
               {/* Quick Stats Grid */}
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm flex flex-col gap-4">
                     <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-[var(--color-primary)]">
                        <TrendingUp className="w-5 h-5" />
                     </div>
                     <div>
                        <p className="text-[9px] font-label uppercase tracking-widest text-stone-400">Total Revenue</p>
                        <p className="text-xl font-display font-bold">Rp 12.4M</p>
                     </div>
                  </div>
                  <div className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm flex flex-col gap-4">
                     <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-[var(--color-primary)]">
                        <Package className="w-5 h-5" />
                     </div>
                     <div>
                        <p className="text-[9px] font-label uppercase tracking-widest text-stone-400">Orders Today</p>
                        <p className="text-xl font-display font-bold">42 Sessions</p>
                     </div>
                  </div>
               </div>

               {/* Navigation Cards */}
               <div className="space-y-4">
                  <p className="text-[10px] font-label uppercase tracking-[0.4em] text-stone-400 pl-2">Management Protocols</p>
                  
                  <button 
                    onClick={() => setActiveTab('menu')}
                    className="w-full bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm flex items-center justify-between group hover:border-[var(--color-primary)] transition-all"
                  >
                     <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-stone-50 flex items-center justify-center text-stone-300 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-all">
                           <MenuIcon className="w-7 h-7" />
                        </div>
                        <div className="text-left">
                           <h3 className="text-lg font-display font-medium">Bistro Menu Editor</h3>
                           <p className="text-xs text-stone-400">Modify availability & price fragments</p>
                        </div>
                     </div>
                     <ChevronRight className="w-5 h-5 text-stone-200 group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all" />
                  </button>

                  <button 
                    onClick={() => setActiveTab('ledger')}
                    className="w-full bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm flex items-center justify-between group hover:border-[var(--color-primary)] transition-all"
                  >
                     <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-stone-50 flex items-center justify-center text-stone-300 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-all">
                           <FileText className="w-7 h-7" />
                        </div>
                        <div className="text-left">
                           <h3 className="text-lg font-display font-medium">Order Settlement Ledger</h3>
                           <p className="text-xs text-stone-400">View history & export analytical records</p>
                        </div>
                     </div>
                     <ChevronRight className="w-5 h-5 text-stone-200 group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all" />
                  </button>

                  <button 
                    className="w-full bg-stone-50/50 p-6 rounded-[2rem] border border-stone-100 shadow-sm flex items-center justify-between group grayscale opacity-50 cursor-not-allowed"
                  >
                     <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-white border border-stone-100 flex items-center justify-center text-stone-300">
                           <Settings className="w-7 h-7" />
                        </div>
                        <div className="text-left">
                           <h3 className="text-lg font-display font-medium">System Configuration</h3>
                           <p className="text-xs text-stone-400">Configure global bistro parameters</p>
                        </div>
                     </div>
                     <ChevronRight className="w-5 h-5 text-stone-100" />
                  </button>
               </div>
            </motion.div>
          )}

          {activeTab === 'menu' && (
            <motion.div 
              key="menu"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
               <MenuEditor />
            </motion.div>
          )}

          {activeTab === 'ledger' && (
            <motion.div 
              key="ledger"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
               <OrderLedger />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
