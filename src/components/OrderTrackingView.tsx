"use client";

import { useEffect, useState } from 'react';
import { useOrderStore } from '../store/order.store';
import { useParams } from 'next/navigation';
import { 
  Clock, 
  ChefHat, 
  Package, 
  CheckCircle2, 
  ArrowLeft,
  Utensils,
  Plus,
  Sparkles,
  User,
  Zap,
  Hash,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  onBackToMenu: () => void;
  onViewRoasts?: () => void;
}

export default function OrderTrackingView({ onBackToMenu, onViewRoasts }: Props) {
  const params = useParams();
  const slug = (params.mitraSlug as string) || "";

  const { currentOrder, updateStatus } = useOrderStore();
  const [activeStep, setActiveStep] = useState(0);
  const storeName = slug ? slug.replace(/-/g, ' ').toUpperCase() : 'OUR RESTAURANT';
  
  // Inisialisasi awal mengambil dari store, jika kosong tampilkan 'Locating...'
  // const [actualTableName, setActualTableName] = useState((currentOrder as any)?.tableName || (currentOrder as any)?.table_name || 'Locating...');
  const [actualTableName, setActualTableName] = useState(
      (currentOrder as any)?.tableName || (currentOrder as any)?.table_name || 'Locating...'
    );
  // 1. Sinkronisasi Nama Toko & Meja Awal
  useEffect(() => {
    const newTableName = (currentOrder as any)?.tableName || (currentOrder as any)?.table_name;

    if (newTableName && newTableName !== actualTableName) {
      setActualTableName(newTableName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrder]);

  // 2. Real-time Status & Table Polling
  useEffect(() => {
    const trackOrder = async () => {
      // Pastikan menggunakan order_code untuk fetch ke API track
      const orderCode = (currentOrder as any)?.order_code || (currentOrder as any)?.orderCode || currentOrder?.id?.toString().slice(-6);
      if (!orderCode) return;

      try {
        const res = await fetch(`/api/orders/track?code=${orderCode}`);
        const result = await res.json();

        if (result.success && result.data) {
          // A. Sinkronisasi Status (Pending -> Confirmed -> Preparing -> Completed)
          if (result.data.status !== currentOrder?.status) {
            updateStatus(result.data[0].status);
          }
          // console.log(result.data[0]);
          
          // B. Sinkronisasi Nama Meja dari hasil JOIN API
          if (result.data[0].table_name) {
            setActualTableName(result.data[0].table_name);
          } else if (!result.data.table_number) {
            setActualTableName('Walk-in');
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };

    // Jalankan pertama kali dan set interval setiap 10 detik
    trackOrder();
    const interval = setInterval(trackOrder, 10000);
    return () => clearInterval(interval);
  }, [(currentOrder as any)?.order_code, (currentOrder as any)?.orderCode, currentOrder?.status, updateStatus]);

  // 3. Mapping Step Status Berdasarkan Role Alur Kerja Baru
  const STEPS = [
    { id: 'pending', label: 'Order Received', icon: Clock, description: 'Waiting for confirmation', time: '0m' },
    { id: 'confirmed', label: 'Confirmed', icon: CheckCircle2, description: 'Accepted by our team', time: '1m' },
    { id: 'preparing', label: 'In Preparation', icon: ChefHat, description: 'Prepared fresh by our chef', time: '5m' },
    { id: 'completed', label: 'Ready!', icon: Package, description: `Served at ${actualTableName}`, time: '10m' },
  ];

  useEffect(() => {
    if (!currentOrder) return;
    
    const statusMap: Record<string, number> = {
      'pending': 0,
      'confirmed': 1,
      'preparing': 2,
      'completed': 3
    };
    
    setActiveStep(statusMap[currentOrder.status] ?? 0);
  }, [currentOrder?.status]);

  if (!currentOrder) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-[#F7F8FA]">
        <div className="w-32 h-32 bg-stone-50 rounded-full flex items-center justify-center mb-8 border border-stone-100 shadow-sm">
           <Package className="w-12 h-12 text-stone-300" />
        </div>
        <h2 className="text-4xl font-black mb-4 text-stone-900">No Active Records.</h2>
        <button onClick={onBackToMenu} className="px-10 py-4 border border-stone-200 rounded-full text-[10px] font-bold uppercase tracking-widest text-stone-600 hover:bg-[#0E5C37] hover:text-white hover:border-[#0E5C37] transition-all">
          Retrieve The Menu
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] relative overflow-hidden font-sans text-stone-900">
      <div className="fixed inset-0 pointer-events-none">
         <div className="absolute top-0 right-0 w-[80vw] h-[80vw] bg-[#0E5C37] opacity-[0.02] blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2" />
         <div className="absolute bottom-0 left-0 w-[60vw] h-[60vw] bg-emerald-200 opacity-[0.05] blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>

      <main className="px-6 py-12 relative z-10 max-w-[480px] mx-auto">
        <header className="flex flex-col items-start mb-16 gap-8">
           <div className="space-y-6 w-full">
              <motion.button 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={onBackToMenu}
                className="flex items-center gap-3 text-stone-500 hover:text-[#0E5C37] transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Back to Menu</span>
              </motion.button>
              
              <div className="space-y-2">
                 <div className="flex items-center justify-between w-full mb-6">
                    <div className="px-3 py-1 bg-emerald-50 text-[#0E5C37] border border-[#0E5C37]/20 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-[#0E5C37] rounded-full animate-pulse" />
                        Live Update
                    </div>
                    <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-stone-100 shadow-sm">
                      <Hash className="w-3 h-3 text-stone-400" />
                      <span className="text-[11px] font-black text-stone-900 uppercase tracking-widest">
                        {(currentOrder as any).order_code || (currentOrder as any).orderCode || currentOrder.id?.toString().slice(-6)}
                      </span>
                    </div>
                 </div>
                 <h1 className="text-5xl font-black tracking-tight text-stone-900 leading-[1.1]">
                    Your Order <br /> 
                    <span className="text-stone-400 italic font-medium">is in progress.</span>
                 </h1>
              </div>
           </div>

           <div className="flex flex-col items-start gap-1">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Assigned Station</p>
              <p className="text-4xl font-black text-[#0E5C37] uppercase">{actualTableName}</p>
           </div>
        </header>

        <div className="flex flex-col gap-12">
           <div className="w-full">
              <div className="relative pl-12 border-l-2 border-stone-100 space-y-12">
                 {STEPS.map((step, index) => {
                   const Icon = step.icon;
                   const isPast = index < activeStep;
                   const isCurrent = index === activeStep;
                   const isFuture = index > activeStep;

                   return (
                     <motion.div 
                       key={step.id}
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       transition={{ delay: index * 0.1 }}
                       className={`relative group ${isFuture ? 'opacity-30' : ''}`}
                     >
                       {isCurrent && (
                         <div className="absolute -left-[14px] top-0 bottom-0 w-[4px] bg-[#0E5C37] shadow-[0_0_10px_rgba(14,92,55,0.5)] -translate-y-12 h-24 rounded-full" />
                       )}

                       <div className={`absolute -left-[32px] w-12 h-12 rounded-full flex items-center justify-center transition-all duration-700 z-20 ${
                         isPast 
                           ? 'bg-[#0E5C37] text-white shadow-lg' 
                           : isCurrent
                             ? 'bg-white border-4 border-[#0E5C37] text-[#0E5C37] shadow-xl scale-110'
                             : 'bg-stone-50 border-2 border-stone-200 text-stone-400'
                       }`}>
                         {isPast ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
                         
                         {isCurrent && (
                           <motion.div 
                             className="absolute inset-0 rounded-full bg-[#0E5C37] opacity-20 blur-md"
                             animate={{ scale: [1, 1.4, 1] }}
                             transition={{ repeat: Infinity, duration: 2 }}
                           />
                         )}
                       </div>

                       <div className="flex flex-col items-start gap-2 pl-6">
                          <div className="space-y-1">
                             <div className="flex items-center gap-3">
                                <h3 className={`text-xl font-bold tracking-tight ${isCurrent ? 'text-[#0E5C37]' : 'text-stone-800'}`}>
                                  {step.label}
                                </h3>
                                {isCurrent && (
                                   <div className="flex items-center gap-1.5">
                                      <span className="w-6 h-px bg-[#0E5C37] opacity-40" />
                                      <Zap className="w-3 h-3 text-[#0E5C37] animate-pulse" />
                                   </div>
                                )}
                             </div>
                             <p className="text-xs text-stone-500 font-medium">{step.description}</p>
                          </div>
                          <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest bg-stone-100 px-2 py-1 rounded-md">
                            {step.time} Est.
                          </span>
                       </div>
                     </motion.div>
                   );
                 })}
              </div>
           </div>

           <div className="w-full space-y-6">
              <div className="bg-white rounded-3xl p-8 border border-stone-100 shadow-sm relative overflow-hidden group">
                 <div className="absolute -top-4 -right-4 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                    <ChefHat className="w-40 h-40" />
                 </div>
                 <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                       <span className="text-[10px] font-bold text-[#0E5C37] uppercase tracking-widest">Kitchen Message</span>
                       <div className="h-px flex-1 bg-stone-100" />
                    </div>
                    <h4 className="text-lg font-medium text-stone-800 italic mb-6 leading-relaxed">
                      "We are meticulously preparing your order to ensure the best quality and taste. Thank you for your patience."
                    </h4>
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-[#0E5C37]">
                         <User className="w-5 h-5" />
                       </div>
                       <div>
                          <p className="text-sm font-bold text-stone-900">Culinary Team</p>
                          <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">{storeName}</p>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div onClick={onViewRoasts ?? onBackToMenu} className="bg-stone-50 rounded-3xl p-6 flex flex-col justify-between aspect-square group hover:bg-[#0E5C37] hover:text-white transition-all duration-300 cursor-pointer border border-stone-100 shadow-sm">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:bg-white/20">
                       <Sparkles className="w-5 h-5 text-[#0E5C37] group-hover:text-white transition-colors" />
                    </div>
                    <div>
                       <p className="text-[9px] font-bold text-stone-400 group-hover:text-emerald-200 uppercase tracking-widest mb-1">DISCOVERY</p>
                       <p className="text-base font-bold text-stone-800 group-hover:text-white leading-tight">Explore <br /> Menu</p>
                    </div>
                 </div>
                 
                 <div onClick={onBackToMenu} className="bg-[#0E5C37] text-white rounded-3xl p-6 flex flex-col justify-between aspect-square group hover:scale-[1.02] transition-all cursor-pointer shadow-lg shadow-emerald-900/20">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                       <Plus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                       <p className="text-[9px] font-bold text-emerald-200 uppercase tracking-widest mb-1">CONTINUE</p>
                       <p className="text-base font-bold text-white leading-tight">Order <br /> More</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <footer className="mt-20 pt-10 border-t border-stone-200 flex flex-col items-center gap-6 pb-12">
           <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.3em] text-center">
              {storeName} • CRAFTED WITH PASSION BY <a href="https://evognito.my.id">EVOGNITO TEAM</a>
           </p>
        </footer>
      </main>
    </div>
  );
}