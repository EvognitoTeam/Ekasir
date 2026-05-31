"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, RefreshCw, BellRing, Loader2, ChefHat, History, Flame, QrCode, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scanner } from '@yudiel/react-qr-scanner'; 
import { Toast } from '@/utils/toast';
import KitchenTicket from '@/components/kitchen/KitchenTicket'; 
import { Order } from '@/types/menu'; 

interface Props {
  onLogout: () => void;
}

export default function KitchenDisplay({ onLogout: parentLogout }: Props) {
  const params = useParams();
  const slug = (params.mitraSlug as string) || (params.slug as string) || "";

  // ─── AUTH & KITCHEN STATE ───
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeStaffName, setActiveStaffName] = useState('');
  const physicalScannerBuffer = useRef(''); 
  
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // ─── MEMULIHKAN SESI LOGIN (BIAR TAHAN REFRESH) ───
  useEffect(() => {
    if (!slug) return;
    const storedSession = localStorage.getItem(`evo_kitchen_session_${slug}`);
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession);
        if (parsed && parsed.name) {
          setActiveStaffName(parsed.name);
          setIsAuthenticated(true);
        }
      } catch (e) {
        localStorage.removeItem(`evo_kitchen_session_${slug}`);
      }
    }
  }, [slug]);

  // ─── AUTH LOGIC ───
  const handleTokenScan = async (token: string) => {
    setIsVerifying(true);
    setIsScanning(false);
    try {
      const res = await fetch('/api/pos/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const result = await res.json();
      
      // 🔴 Check if role is Kitchen
      if (result.success && result.data.role.toLowerCase() === 'kitchen') {
        const staffName = result.data.name;
        setActiveStaffName(staffName);
        setIsAuthenticated(true);
        
        // 🔴 SIMPAN SESI KE LOCAL STORAGE
        localStorage.setItem(`evo_kitchen_session_${slug}`, JSON.stringify({
          name: staffName,
          token: token
        }));

        Toast.fire({ icon: 'success', title: `Selamat Datang, ${staffName}!` });
      } else {
        Toast.fire({ icon: 'error', title: result.message || 'Anda tidak memiliki akses ke dapur!' });
      }
    } catch {
      Toast.fire({ icon: 'error', title: 'Gagal koneksi server' });
    } finally {
      setIsVerifying(false);
    }
  };

  // ─── LOGOUT LOGIC ───
  const handleLogout = () => {
    // 🔴 HAPUS SESI DARI LOCAL STORAGE
    localStorage.removeItem(`evo_kitchen_session_${slug}`);
    setIsAuthenticated(false);
    setActiveStaffName('');
    parentLogout();
  };

  // ─── SUPPORT SCANNER FISIK ───
  useEffect(() => {
    if (isAuthenticated || isScanning) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Enter') {
        if (physicalScannerBuffer.current.length > 10) {
          handleTokenScan(physicalScannerBuffer.current);
        }
        physicalScannerBuffer.current = ''; 
      } else if (e.key.length === 1) {
        physicalScannerBuffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated, isScanning]);

  // ─── DATA FETCHING ───
  const fetchOrders = async (silent = false) => {
    if (!isAuthenticated || !slug) return;
    if (!silent) setIsRefetching(true);
    
    try {
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

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchOrders(); 
    const interval = setInterval(() => fetchOrders(true), 3000); 
    return () => clearInterval(interval);
  }, [isAuthenticated, slug]);

  const executeUpdate = async (orderId: string, newStatus: Order['status']) => {
    setOrders(prev => prev.map(o => String(o.id) === orderId ? { ...o, status: newStatus } : o));
    try {
      await fetch(`/api/orders/history?slug=${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus })
      });
    } catch (e) { fetchOrders(true); }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (activeTab === 'active') return o.status === 'confirmed' || o.status === 'preparing';
      return o.status === 'ready' || o.status === 'completed' || o.status === 'cancelled';
    }).sort((a, b) => {
      const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
      const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
      return activeTab === 'history' ? dateB - dateA : dateA - dateB;
    });
  }, [orders, activeTab]);

  // ─── RENDER LOGIN SCREEN ───
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
        <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-4"><QrCode className="w-8 h-8 text-white" /></div>
          <h2 className="text-xl font-black text-stone-800">Login Dapur</h2>
          <p className="text-xs text-stone-500 mb-2">Arahkan Token Karyawan</p>
          {isVerifying ? <Loader2 className="animate-spin w-8 h-8 text-amber-500 mt-8" /> : 
           isScanning ? (
            <div className="w-64 h-64 rounded-2xl overflow-hidden border-4 border-amber-500 mt-6 relative bg-black">
               <Scanner onScan={(res) => res && handleTokenScan(res[0].rawValue)} components={{ finder: false }} />
               <button 
                 onClick={() => setIsScanning(false)}
                 className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-red-500/80 backdrop-blur text-white text-xs font-bold rounded-full shadow-lg"
               >
                 Tutup Kamera
               </button>
            </div>
           ) : (
            <button onClick={() => setIsScanning(true)} className="w-full mt-8 py-4 bg-stone-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2">
              <Camera className="w-5 h-5" /> Buka Kamera Scan QR
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  // ─── RENDER DASHBOARD DAPUR ───
  return (
    <div className="min-h-screen bg-[#f0ede9] font-sans flex justify-center w-full">
      <div className="w-full max-w-7xl h-screen bg-[#f6f3ee] flex flex-col shadow-2xl overflow-hidden relative">
        
        <AnimatePresence>
          {notification && (
            <motion.div 
              initial={{ opacity: 0, y: -50 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-bold tracking-wide"
            >
              <BellRing className="w-5 h-5 animate-bounce" /> 
              {notification}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <header className="bg-white px-6 py-4 border-b border-stone-200 flex justify-between items-center shadow-sm z-30 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20"><ChefHat className="w-6 h-6 text-white" /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-0.5">Kitchen Display System</p>
              <h1 className="text-xl font-black text-stone-800 leading-none">Stasiun Dapur &bull; {activeStaffName}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => fetchOrders()} className="w-10 h-10 rounded-xl bg-stone-50 border border-stone-200 text-stone-500 flex items-center justify-center hover:bg-stone-100"><RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} /></button>
            {/* 🔴 TOMBOL LOGOUT SEKARANG MEMANGGIL handleLogout BUKAN parentLogout LANGSUNG */}
            <button onClick={handleLogout} className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center hover:bg-red-100"><ArrowLeft className="w-4 h-4" /></button>
          </div>
        </header>

        {/* Tabs */}
        <div className="px-6 py-3 bg-white border-b border-stone-200 flex gap-3 shrink-0">
          <button onClick={() => setActiveTab('active')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'active' ? 'bg-amber-500 text-white shadow-md' : 'bg-stone-50 text-stone-400 hover:bg-stone-100 border border-stone-200'}`}><Flame className="w-4 h-4" /> Pesanan Aktif</button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'history' ? 'bg-stone-800 text-white shadow-md' : 'bg-stone-50 text-stone-400 hover:bg-stone-100 border border-stone-200'}`}><History className="w-4 h-4" /> Riwayat</button>
        </div>

        {/* List */}
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading && orders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-70">
               <Loader2 className="animate-spin w-10 h-10 text-amber-500 mb-4" />
               <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Memuat Tiket Dapur...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-60">
              <div className="w-20 h-20 rounded-3xl bg-white border-2 border-dashed border-stone-300 flex items-center justify-center mb-6">
                {activeTab === 'active' ? <ChefHat className="w-10 h-10 text-stone-300" /> : <History className="w-10 h-10 text-stone-300" />}
              </div>
              <h2 className="text-lg font-black text-stone-800 mb-2">{activeTab === 'active' ? 'Dapur Sedang Kosong' : 'Belum Ada Riwayat'}</h2>
              <p className="text-sm text-stone-500">{activeTab === 'active' ? 'Waktunya bernapas sejenak!' : 'Pesanan selesai akan muncul di sini.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
              <AnimatePresence>
                {filteredOrders.map(order => (
                  <motion.div key={order.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }}>
                    <KitchenTicket order={order} onUpdateStatus={executeUpdate} />
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