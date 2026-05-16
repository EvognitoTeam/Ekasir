"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrderStore } from '../../store/order.store';
import { useAuthStore } from '../../store/auth.store'; 
import { useMenuStore } from '../../store/menu.store';
import { 
  History, Clock, CheckCircle2, ArrowRight, Table, Coffee, 
  ShoppingBag, Hash, Receipt, ChevronDown, Loader2, Timer
} from 'lucide-react';

interface Props {
  onBackToMenu: () => void;
  onTrackOrder: () => void;
}

const formatDate = (dateInput: any) => {
  if (!dateInput) return 'Tanggal tidak tersedia';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'Format Tanggal Invalid';
    return d.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return 'Invalid Date';
  }
};

const formatIDR = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
    .format(n)
    .replace(/\s/g, '');

export default function OrderHistoryView({ onBackToMenu, onTrackOrder }: Props) {
  const { userId, isLoggedIn } = useAuthStore();
  const { currentOrder } = useOrderStore(); 
  const { items: menuItems } = useMenuStore(); 
  
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');

  useEffect(() => {
    const fetchHistory = async () => {
      if (!isLoggedIn || !userId) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/orders/history?userId=${userId}`);
        const result = await res.json();
        if (result.success) {
          setHistoryData(result.data);
        }
      } catch (error) {
        console.error("Gagal sinkronisasi riwayat:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [userId, isLoggedIn]);

  const activeOrders = historyData.filter(order => 
    ['pending', 'confirmed', 'preparing'].includes(order.status)
  );

  const pastOrders = historyData.filter(order => 
    ['completed', 'cancelled'].includes(order.status)
  );

  const totalSpent = historyData.reduce((sum, o) => {
    const rawAfterDiscount = Number(o.total_after_discount || o.totalAfterDiscount || 0);
    const rawNormal = Number(o.total_price || o.totalPrice || 0);
    return sum + (rawAfterDiscount > 0 ? rawAfterDiscount : rawNormal);
  }, 0);
  
  const totalItemsCount = historyData.reduce((sum, o) => sum + (o.items?.length || 0), 0);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { title: 'Waiting for Confirmation', desc: 'Menunggu persetujuan kasir.', color: 'text-amber-400' };
      case 'confirmed':
        return { title: 'Order Confirmed', desc: 'Pesanan masuk antrean.', color: 'text-blue-400' };
      case 'preparing':
        return { title: 'In Preparation', desc: 'Chef sedang meracik hidangan.', color: 'text-emerald-400' };
      default:
        return { title: 'Processing', desc: 'Pesanan sedang diproses.', color: 'text-stone-400' };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F8FA]">
        <Loader2 className="w-10 h-10 text-[#0E5C37] animate-spin mb-4" />
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center px-6">
            Membuka Arsip Pengalaman Anda...
        </p>
      </div>
    );
  }

  return (
    <div className="py-8 px-6 bg-[#F7F8FA] min-h-full font-sans">
      <header className="mb-16">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4 mb-4">
           <div className="w-12 h-[2px] bg-[#0E5C37]" />
           <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#0E5C37]">The Discovery Ledger</span>
        </motion.div>
        <h1 className="text-5xl font-black tracking-tighter leading-none mb-10 text-stone-900">Experience Archive.</h1>
        
        <div className="grid grid-cols-2 gap-4">
           {[
             { label: 'Orders Made', value: historyData.length.toString().padStart(2, '0'), icon: History },
             { label: 'Items Ordered', value: totalItemsCount.toString().padStart(2, '0'), icon: Coffee },
             { label: 'Active Session', value: activeOrders.length.toString().padStart(2, '0'), icon: Clock },
             { label: 'Total Spent', value: `${(totalSpent / 1000).toFixed(0)}K`, icon: Receipt },
           ].map((stat) => (
             <div key={stat.label} className="bg-white p-5 rounded-3xl border border-stone-100 shadow-sm flex flex-col gap-4">
                <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center">
                   <stat.icon className="w-4 h-4 text-[#0E5C37]" />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-1">{stat.label}</p>
                  <p className="text-2xl font-black text-stone-900 leading-none">{stat.value}</p>
                </div>
             </div>
           ))}
        </div>
      </header>

      <div className="flex bg-stone-200/50 p-1.5 rounded-2xl mb-10">
        <button 
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-white text-[#0E5C37] shadow-sm' : 'text-stone-400'}`}
        >
          Active Orders ({activeOrders.length})
        </button>
        <button 
          onClick={() => setActiveTab('past')}
          className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'past' ? 'bg-white text-[#0E5C37] shadow-sm' : 'text-stone-400'}`}
        >
          Past Orders ({pastOrders.length})
        </button>
      </div>

      <div className="space-y-10">
        <AnimatePresence mode="wait">
          {activeTab === 'active' ? (
            <motion.div 
              key="active-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {activeOrders.length > 0 ? (
                activeOrders.map((activeOrder) => {
                  const statusInfo = getStatusInfo(activeOrder.status);
                  return (
                    <motion.div 
                      key={activeOrder.id}
                      className="bg-stone-900 p-8 rounded-[2.5rem] flex flex-col gap-8 shadow-xl shadow-emerald-900/20 relative overflow-hidden text-white"
                    >
                       <div className="absolute top-0 right-0 w-32 h-32 opacity-10 -mr-8 -mt-8 rotate-12">
                          <Coffee className="w-full h-full" />
                       </div>
                       <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full relative z-10">
                          <div className="w-16 h-16 bg-[#0E5C37] text-white rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                             {activeOrder.status === 'pending' ? <Timer className="w-7 h-7" /> : <Clock className="w-7 h-7" />}
                          </div>
                          <div className="min-w-0">
                             <div className="flex items-center gap-2 mb-2 bg-white/10 px-2 py-0.5 rounded-md w-fit">
                                <Hash className="w-3 h-3 text-emerald-400" />
                                <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                                   ID: {activeOrder.order_code || activeOrder.id?.toString().slice(-6)}
                                </p>
                             </div>
                             <h2 className="text-2xl font-black mb-1">{statusInfo.title}</h2>
                             <p className="text-[11px] text-stone-400 font-medium">
                                Station {activeOrder.table_name || 'Walk-in'} • {statusInfo.desc}
                             </p>
                          </div>
                       </div>

                       {/* 🔴 MENAMPILKAN RINGKASAN ITEMS & ADDONS DI KARTU ACTIVE */}
                       <div className="w-full space-y-3 relative z-10 border-t border-white/5 pt-4">
                          {activeOrder.items?.map((item: any, i: number) => (
                            <div key={i} className="flex flex-col gap-1">
                               <div className="flex justify-between text-xs">
                                  <span className="font-bold text-emerald-400">{item.quantity}x <span className="text-white">{menuItems.find(m => String(m.id) === String(item.product_id))?.name || 'Product'}</span></span>
                               </div>
                               {item.selectedAddOnsDetails?.length > 0 && (
                                  <div className="flex flex-wrap gap-2 pl-5">
                                     {item.selectedAddOnsDetails.map((addon: any, idx: number) => (
                                        <span key={idx} className="text-[10px] text-stone-500 bg-white/5 px-2 py-0.5 rounded-md">
                                          + {addon.name} {addon.price > 0 ? `(${formatIDR(addon.price)})` : ''}
                                        </span>
                                     ))}
                                  </div>
                               )}
                            </div>
                          ))}
                       </div>
                       
                       <button 
                         onClick={() => {
                           useOrderStore.setState({ 
                             currentOrder: { ...activeOrder, orderCode: activeOrder.order_code, tableId: activeOrder.table_number, items: activeOrder.items || [] }
                           });
                           onTrackOrder();
                         }} 
                         className="w-full bg-[#0E5C37] hover:bg-emerald-500 text-white flex items-center justify-between px-8 py-4 rounded-xl transition-all group relative z-10"
                       >
                          <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Observe Progress</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                       </button>
                    </motion.div>
                  )
                })
              ) : (
                <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-stone-200">
                  <ShoppingBag className="w-10 h-10 text-stone-200 mx-auto mb-4" />
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">No Active Sessions</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="past-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {pastOrders.length > 0 ? (
                pastOrders.map((order) => {
                  const isExpanded = expandedId === order.id;
                  const finalPaid = Number(order.total_after_discount) > 0 ? order.total_after_discount : order.total_price;
                  
                  return (
                    <div key={order.id} className={`bg-white rounded-3xl border transition-all ${isExpanded ? 'border-[#0E5C37]/30 shadow-md' : 'border-stone-100'}`}>
                      <div onClick={() => toggleExpand(order.id)} className="p-6 flex items-center gap-4 cursor-pointer">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isExpanded ? 'bg-[#0E5C37] text-white' : 'bg-stone-50 text-stone-300'}`}>
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[9px] font-bold text-stone-400 uppercase mb-0.5">{formatDate(order.created_at)}</p>
                          <h4 className="font-black text-stone-900 uppercase">#{order.order_code}</h4>
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${isExpanded ? 'rotate-180 bg-stone-100' : ''}`}>
                          <ChevronDown className="w-4 h-4 text-stone-400" />
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="px-6 pb-6 pt-2 border-t border-stone-50">
                              <ul className="space-y-4 mb-4">
                                {order.items?.map((item: any, i: number) => {
                                  const matchedProduct = menuItems.find(m => String(m.id) === String(item.product_id));
                                  return (
                                    <li key={i} className="flex flex-col gap-1.5">
                                      <div className="flex justify-between items-start text-xs">
                                        <div className="flex gap-2">
                                          <span className="font-bold text-[#0E5C37]">{item.quantity}x</span>
                                          <span className="text-stone-800 font-bold">{matchedProduct ? matchedProduct.name : `Product #${item.product_id}`}</span>
                                        </div>
                                        <span className="font-bold text-stone-900">{formatIDR(Number(item.price) * item.quantity)}</span>
                                      </div>
                                      
                                      {/* ADDONS */}
                                      {item.selectedAddOnsDetails?.length > 0 && (
                                        <div className="flex flex-col gap-1 pl-6">
                                          {item.selectedAddOnsDetails.map((addon: any, idx: number) => (
                                            <p key={idx} className="text-[10px] text-stone-400 flex justify-between">
                                              <span>+ {addon.name}</span>
                                              {addon.price > 0 && <span>{formatIDR(addon.price)}</span>}
                                            </p>
                                          ))}
                                        </div>
                                      )}
                                    </li>
                                  )
                                })}
                              </ul>

                              {/* 🔴 SEKSI DISKON & KUPON */}
                              <div className="pt-4 border-t border-dashed space-y-2">
                                {/* Cek jika ada discountId atau coupon_code */}
                                {(order.discount_id || order.coupon_code) && (
                                  <div className="flex justify-between items-center bg-emerald-50 px-3 py-2 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <ShoppingBag className="w-3 h-3 text-[#0E5C37]" />
                                      <span className="text-[10px] font-bold text-[#0E5C37] uppercase tracking-tight">
                                        Coupon: {order.coupon_code || 'Applied'}
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-bold text-[#0E5C37]">
                                      -{formatIDR(Number(order.total_price) - Number(order.total_after_discount))}
                                    </span>
                                  </div>
                                )}

                                <div className="flex justify-between items-center px-1">
                                  <span className="text-[10px] font-bold uppercase text-stone-400">Subtotal</span>
                                  <span className="text-xs font-bold text-stone-400 line-through">
                                    {Number(order.total_after_discount) > 0 ? formatIDR(order.total_price) : ''}
                                  </span>
                                </div>

                                <div className="flex justify-between items-center px-1">
                                  <span className="text-[10px] font-bold uppercase text-stone-900">Total Paid</span>
                                  <span className="text-sm font-black text-[#0E5C37]">{formatIDR(finalPaid)}</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })
              ) : (
                <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-stone-200">
                  <ShoppingBag className="w-10 h-10 text-stone-200 mx-auto mb-4" />
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">No History Yet</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-20 text-center pb-10">
         <button onClick={onBackToMenu} className="px-10 py-4 bg-white border border-stone-200 rounded-full text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-[#0E5C37] transition-all active:scale-95 shadow-sm">
           Return to Menu
         </button>
      </div>
    </div>
  );
}