"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMenuStore } from '@/store/menu.store';
import { Order } from '@/types/menu'; 
import OrderCard from '@/components/cashier/OrderCard';
import { formatPrice } from '@/utils/formatters';
import CashierPOS from '@/components/cashier/CashierPOS';
import {
  ArrowLeft, BellRing, ReceiptText, ShieldCheck, RefreshCw,
  Sparkles, ShoppingBag, TrendingUp, RotateCcw, Coffee, Plus, Loader2, QrCode, Camera
} from 'lucide-react';
import AdminDashboardView from '@/components/views/AdminDashboardView';
import { motion, AnimatePresence } from 'framer-motion';
import { Scanner } from '@yudiel/react-qr-scanner'; // 🔴 Import Scanner Kamera
import { Toast } from '@/utils/toast';

export default function CashierApp() {
  const params = useParams();
  const router = useRouter();
  const slug = (params.mitraSlug as string) || (params.slug as string) || "";

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<'cashier' | 'owner' | 'kitchen' | null>(null);
  const [activeStaffName, setActiveStaffName] = useState('');
  
  // 🔴 State untuk Scanner
  const [isScanning, setIsScanning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const physicalScannerBuffer = useRef(''); // Buffer buat physical scanner (tembak)

  const [orders, setOrders] = useState<Order[]>([]);
  const [mitraProfile, setMitraProfile] = useState<{ name: string }>({ name: 'Kasir' });
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  const [activeTab, setActiveTab] = useState<'pending' | 'preparing' | 'ready' | 'completed'>('pending');
  const [notification, setNotification] = useState<string | null>(null);
  const [undoAction, setUndoAction] = useState<{
    orderId: string; oldStatus: Order['status']; oldPaymentStatus?: Order['paymentStatus']; timeoutId: ReturnType<typeof setTimeout>;
  } | null>(null);
  const [isPOSMode, setIsPOSMode] = useState(false);

  const { setMenu } = useMenuStore();

  useEffect(() => {
    if (!slug) return;
    
    const initApp = async () => {
      try {
        const resSettings = await fetch(`/api/settings?slug=${slug}`);
        const dataSettings = await resSettings.json();
        if (dataSettings.success && dataSettings.data) {
          setMitraProfile({ name: dataSettings.data.cafeName || 'Kasir' });
        }

        const resMenu = await fetch(`/api/menu?slug=${slug}`);
        const dataMenu = await resMenu.json();
        
        if (dataMenu.success) {
           const rawItems = dataMenu.items || [];
           const menuCategories = dataMenu.categories || [];
           const allAddons = dataMenu.addons || []; 
           const enrichedItems = rawItems.map((item: any) => ({
               ...item,
               categorizedAddons: [{ addons: allAddons }] 
           }));
           setMenu(enrichedItems, menuCategories);
        }
      } catch (e) {
        console.error("Gagal inisialisasi awal:", e);
      } finally {
        setIsLoadingInitial(false);
      }
    };
    initApp();
  }, [slug]);

  const fetchOrders = async () => {
    if (!slug) return;
    try {
      const res = await fetch(`/api/orders/history?slug=${slug}`);
      const result = await res.json();
      
      if (result.success && Array.isArray(result.data)) {
        setOrders(prev => {
           if (prev.length > 0 && result.data.length > prev.length) {
             setNotification('Pesanan baru masuk!');
             setTimeout(() => setNotification(null), 5000);
           }
           return result.data;
        });
      }
    } catch (e) {
      console.error("Gagal load orders:", e);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return; 
    fetchOrders(); 
    const interval = setInterval(() => { fetchOrders(); }, 1000); 
    return () => clearInterval(interval);
  }, [slug, isAuthenticated]);

  // 🔴 FUNGSI VALIDASI TOKEN QR CODE
  const handleTokenScan = async (token: string) => {
    if (isVerifying) return; // Mencegah double scan
    setIsVerifying(true);
    setIsScanning(false);

    try {
      const res = await fetch('/api/pos/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const result = await res.json();

      if (result.success) {
        setRole(result.data.role); // 'owner', 'cashier', atau 'kitchen'
        setActiveStaffName(result.data.name);
        setIsAuthenticated(true);
        Toast.fire({ icon: 'success', title: `Selamat Bekerja, ${result.data.name}!` });
      } else {
        Toast.fire({ icon: 'error', title: result.message });
      }
    } catch (error) {
      Toast.fire({ icon: 'error', title: 'Gagal menghubungi server' });
    } finally {
      setIsVerifying(false);
    }
  };

  // 🔴 SUPPORT UNTUK SCANNER FISIK (BARCODE TEMBAK)
  useEffect(() => {
    if (isAuthenticated || isScanning) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore kalau user lagi ngetik di input field lain
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Enter') {
        if (physicalScannerBuffer.current.length > 10) {
          handleTokenScan(physicalScannerBuffer.current);
        }
        physicalScannerBuffer.current = ''; // Reset
      } else if (e.key.length === 1) {
        physicalScannerBuffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated, isScanning]);

  const executeUpdate = async (orderId: string, newStatus: Order['status'], newPaymentStatus?: Order['paymentStatus']) => {
    try {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, paymentStatus: newPaymentStatus || o.paymentStatus } : o));
      await fetch(`/api/orders/history?slug=${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus, paymentStatus: newPaymentStatus })
      });
    } catch (e) {
      console.error("Gagal update status:", e);
    }
  };

  const updateOrderStatus = (orderId: string, newStatus: Order['status'], newPaymentStatus?: Order['paymentStatus']) => {
    const cur = orders.find(o => o.id === orderId);
    if (!cur) return;
    if (undoAction?.timeoutId) clearTimeout(undoAction.timeoutId);
    executeUpdate(orderId, newStatus, newPaymentStatus);
    const timeoutId = setTimeout(() => setUndoAction(null), 4000);
    setUndoAction({ orderId, oldStatus: cur.status, oldPaymentStatus: cur.paymentStatus, timeoutId });
  };

  const updateOrderNote = async (orderId: string, note: string) => {
    try {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, adminNotes: note } : o));
      await fetch(`/api/orders/history?slug=${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, adminNotes: note })
      });
    } catch (e) {
      console.error("Gagal update note:", e);
    }
  };

  const handlePOSSubmit = (newOrder: Order) => {
    setOrders(prev => [newOrder, ...prev]);
    setIsPOSMode(false);
  };

  const handleUndo = () => {
    if (!undoAction) return;
    clearTimeout(undoAction.timeoutId);
    executeUpdate(undoAction.orderId, undoAction.oldStatus, undoAction.oldPaymentStatus);
    setUndoAction(null);
  };

  const pendingCount   = useMemo(() => orders.filter(o => o.status === 'pending').length, [orders]);
  const preparingCount = useMemo(() => orders.filter(o => o.status === 'confirmed' || o.status === 'preparing').length, [orders]);
  const readyCount     = useMemo(() => orders.filter(o => o.status === 'ready').length, [orders]);
  const completedCount = useMemo(() => orders.filter(o => o.status === 'completed' || o.status === 'cancelled').length, [orders]);
  
  const todayOrders    = useMemo(() => { const t = new Date().toDateString(); return orders.filter(o => new Date(o.createdAt || o.created_at || 0).toDateString() === t); }, [orders]);
  const totalRevenue   = useMemo(() => todayOrders.reduce((s, o) => s + (Number(o.totalPrice || o.total_price) || 0), 0), [todayOrders]);
  const totalProfit    = useMemo(() => totalRevenue * 0.45, [totalRevenue]);

  const filteredOrders = useMemo(() => orders.filter(o => {
    if (activeTab === 'pending')   return o.status === 'pending';
    if (activeTab === 'preparing') return o.status === 'confirmed' || o.status === 'preparing';
    if (activeTab === 'ready')     return o.status === 'ready';
    if (activeTab === 'completed') return o.status === 'completed' || o.status === 'cancelled';
    return true;
  }).sort((a, b) => {
    const idA = Number(a.id) || 0;
    const idB = Number(b.id) || 0;
    if (idA !== 0 && idB !== 0) return idB - idA;
    const dateA = String(a.createdAt || a.created_at || 0).replace(' ', 'T');
    const dateB = String(b.createdAt || b.created_at || 0).replace(' ', 'T');
    return (new Date(dateB).getTime() || 0) - (new Date(dateA).getTime() || 0);
  }), [orders, activeTab]);

  const logout = () => { setIsAuthenticated(false); setRole(null); setActiveStaffName(''); };

  if (isLoadingInitial) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f6f3ee' }}>
         <Loader2 className="w-8 h-8 animate-spin text-[#0E5C37]" />
         <p style={{ marginTop: 16, fontSize: 12, fontWeight: 700, color: '#9CA3AF' }}>Menyiapkan Sistem...</p>
      </div>
    );
  }

  /* ─── TAMPILAN LOGIN QR CODE ─── */
  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100dvh', background: 'linear-gradient(160deg, #f6f3ee 0%, #e8e2d9 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', position: 'relative'
      }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(14,92,55,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(14,92,55,0.04)', pointerEvents: 'none' }} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-white rounded-3xl border border-stone-200 shadow-2xl p-8 flex flex-col items-center relative z-10"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0E5C37] to-[#065F46] flex items-center justify-center mb-4 shadow-lg shadow-emerald-900/20">
            <QrCode className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-2xl font-black text-stone-800 tracking-tight text-center font-display leading-tight">
            {mitraProfile.name}
          </h2>
          <p className="text-xs text-stone-500 mt-1.5 text-center px-4">
            Arahkan QR Code Karyawan ke kamera atau gunakan Scanner Fisik untuk masuk
          </p>

          <div className="w-full mt-8 mb-6">
            {isVerifying ? (
              <div className="flex flex-col items-center justify-center p-10 bg-stone-50 rounded-2xl border border-stone-100">
                <Loader2 className="w-10 h-10 animate-spin text-[#0E5C37] mb-3" />
                <p className="text-xs font-bold text-stone-600 uppercase tracking-widest">Memverifikasi...</p>
              </div>
            ) : isScanning ? (
              <div className="rounded-2xl overflow-hidden border-4 border-dashed border-[#0E5C37]/50 p-1 relative bg-black aspect-square max-h-[250px] mx-auto w-full max-w-[250px]">
                <Scanner 
                  onScan={(result) => {
                    if (result && result.length > 0) handleTokenScan(result[0].rawValue);
                  }}
                  components={{ finder: false }}
                />
                <button 
                  onClick={() => setIsScanning(false)}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-red-500/80 backdrop-blur text-white text-xs font-bold rounded-full shadow-lg"
                >
                  Tutup Kamera
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => setIsScanning(true)}
                  className="w-full py-4 rounded-2xl bg-stone-50 border border-stone-200 text-stone-600 font-bold text-sm flex flex-col items-center gap-2 hover:bg-stone-100 transition-all active:scale-95"
                >
                  <Camera className="w-6 h-6 text-[#0E5C37]" />
                  Buka Kamera Web
                </button>
                
                <div className="relative py-3">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200" /></div>
                  <div className="relative flex justify-center"><span className="bg-white px-3 text-[10px] uppercase tracking-widest text-stone-400 font-bold">Atau</span></div>
                </div>

                <div className="text-center p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <p className="text-[11px] font-medium text-emerald-800 leading-relaxed">
                    Scanner fisik otomatis aktif. <br/>Langsung *Tembak* QR Code ke layar.
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  /* ─── Owner View ─── */
  if (role === 'owner') {
    return (
      <div style={{ minHeight: '100dvh', background: '#f6f3ee', display: 'flex', justifyContent: 'center', fontFamily: 'var(--font-body)' }}>
        <div style={{ width: '100%', maxWidth: '480px', height: '100dvh', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '0 0 40px rgba(28,28,25,0.1)', border: '1px solid #e5e2dd' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <AdminDashboardView onBack={logout} />
          </div>
          <div style={{ padding: '12px 20px', background: '#fff', borderTop: '1px solid #f0ede9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#5a4b44' }}>
              <ShieldCheck size={14} color="#0E5C37" />
              <span>Login: <strong className="text-stone-800">{activeStaffName}</strong> (Owner)</span>
            </div>
            <button onClick={logout} style={{ color: '#DC2626', fontWeight: 700, fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', minHeight: 'auto' }}>Keluar</button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Cashier / Kitchen Main View ─── */
  const TABS = [
    { id: 'pending',   label: 'Baru',           count: pendingCount   },
    { id: 'preparing', label: 'Diracik',        count: preparingCount },
    { id: 'ready',     label: 'Siap Disajikan', count: readyCount     },
    { id: 'completed', label: 'Selesai',        count: completedCount },
  ];

  return (
    <div style={{ minHeight: '100dvh', background: '#f0ede9', display: 'flex', justifyContent: 'center', fontFamily: 'var(--font-body)' }}>
      <div style={{ width: '100%', maxWidth: '480px', height: '100dvh', background: '#fafaf9', display: 'flex', flexDirection: 'column', boxShadow: '0 0 40px rgba(28,28,25,0.12)', position: 'relative', overflow: 'hidden' }}>

        <AnimatePresence>
          {isPOSMode && (
            <CashierPOS onClose={() => setIsPOSMode(false)} onSubmitOrder={handlePOSSubmit} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {notification && (
            <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-20 }}
              style={{ position:'absolute', top:'72px', left:'16px', right:'16px', zIndex:50,
                background: 'linear-gradient(135deg,#0E5C37,#065F46)', color:'#fff',
                padding:'12px 16px', borderRadius:'12px', boxShadow:'0 8px 24px rgba(14,92,55,0.3)',
                display:'flex', alignItems:'center', gap:'8px', fontSize:'13px', fontWeight:600 }}>
              <BellRing size={16} /> {notification}
            </motion.div>
          )}
          {undoAction && (
            <motion.div initial={{ opacity:0, y:50 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:20 }}
              style={{ position:'absolute', bottom:'72px', left:'16px', right:'16px', zIndex:50,
                background:'#1c1c19', color:'#fff', padding:'12px 16px', borderRadius:'12px',
                boxShadow:'0 8px 32px rgba(28,28,25,0.25)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <p style={{ margin:0, fontSize:'12px', fontWeight:700 }}>Status diperbarui</p>
                <p style={{ margin:0, fontSize:'10px', color:'#9CA3AF' }}>Pesanan #{undoAction.orderId}</p>
              </div>
              <button onClick={handleUndo} style={{
                display:'flex', alignItems:'center', gap:'6px', padding:'7px 14px', borderRadius:'8px',
                background:'#374151', color:'#fff', fontSize:'11px', fontWeight:700,
                border:'1px solid #4B5563', cursor:'pointer', minHeight:'auto'
              }}>
                <RotateCcw size={12} /> Batalkan
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <header style={{
          padding: '14px 20px', background: '#fff', borderBottom: '1px solid #f0ede9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 2px 12px rgba(28,28,25,0.05)', flexShrink: 0, zIndex: 30
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg,#0E5C37,#065F46)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(14,92,55,0.25)'
            }}>
              <Coffee size={17} color="#fff" />
            </div>
            <div>
              <p style={{ margin:0, fontSize:'9px', color:'#9CA3AF', fontFamily:'var(--font-label)', letterSpacing:'0.1em' }}>
                POS: {role?.toUpperCase()}
              </p>
              <h1 style={{ margin:0, fontSize:'16px', fontWeight:800, color:'#1c1c19', lineHeight:1.2, fontFamily:'var(--font-display)' }}>
                 {mitraProfile.name}
              </h1>
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
            <button onClick={() => fetchOrders()} title="Refresh" style={{
              width:'34px', height:'34px', borderRadius:'8px', border:'1.5px solid #e5e2dd',
              background:'#fff', color:'#5a4b44', display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', minHeight:'auto'
            }}>
              <RefreshCw size={14} />
            </button>
            <button onClick={() => router.push(`/${slug}`)} style={{
              width:'34px', height:'34px', borderRadius:'8px',
              background:'linear-gradient(135deg,#0E5C37,#065F46)',
              color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
              textDecoration:'none', boxShadow:'0 4px 10px rgba(14,92,55,0.25)', border:'none', cursor:'pointer'
            }}>
              <ArrowLeft size={14} />
            </button>
          </div>
        </header>

        {role === 'cashier' && (
          <div style={{ padding:'12px 16px', background:'#fff', borderBottom:'1px solid #f0ede9', display:'flex', gap:'10px', flexShrink:0 }}>
            {[
              { icon: <ReceiptText size={13} />, label: 'Penjualan', value: `${todayOrders.length} nota`, color: '#5a4b44' },
              { icon: <TrendingUp size={13} />,  label: 'Pendapatan', value: formatPrice(totalRevenue), color: '#1c1c19' },
              { icon: <Sparkles size={13} />,    label: 'Est. Laba',  value: formatPrice(totalProfit),  color: '#0E5C37' },
            ].map((s, i) => (
              <div key={i} style={{
                flex:1, padding:'10px 12px', borderRadius:'12px',
                background:'#fafaf9', border:'1.5px solid #f0ede9',
                boxShadow:'0 1px 4px rgba(28,28,25,0.04)'
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:'4px', color:'#9CA3AF', marginBottom:'4px' }}>
                  {s.icon}
                  <span style={{ fontSize:'9px', fontFamily:'var(--font-label)', letterSpacing:'0.06em' }}>{s.label}</span>
                </div>
                <p style={{ margin:0, fontSize:'12px', fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <div style={{ padding:'10px 16px', background:'#fff', borderBottom:'1px solid #f0ede9', display:'flex', gap:'8px', flexShrink:0 }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{
                flex:1, padding:'9px 4px', borderRadius:'10px', fontSize:'10px', fontWeight:700,
                border: active ? '1.5px solid #0E5C37' : '1.5px solid #f0ede9',
                background: active ? '#0E5C37' : '#fafaf9',
                color: active ? '#fff' : '#9CA3AF',
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'4px',
                boxShadow: active ? '0 4px 12px rgba(14,92,55,0.25)' : 'none',
                transition:'all 0.2s', minHeight:'auto'
              }}>
                {tab.label}
                <span style={{
                  width:'16px', height:'16px', borderRadius:'6px', fontSize:'9px', fontWeight:800,
                  background: active ? 'rgba(255,255,255,0.2)' : '#f0ede9',
                  color: active ? '#fff' : '#5a4b44',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <main style={{ flex:1, overflowY:'auto', padding:'16px', background:'#f6f3ee' }}>
          {filteredOrders.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 20px' }}>
              <div style={{
                width:'56px', height:'56px', borderRadius:'16px', background:'#fff',
                border:'1.5px solid #e5e2dd', margin:'0 auto 16px',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 4px 12px rgba(28,28,25,0.06)'
              }}>
                <ShoppingBag size={22} color="#d6c2bd" />
              </div>
              <p style={{ fontWeight:700, color:'#1c1c19', fontSize:'14px', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>
                Belum Ada Pesanan
              </p>
              <p style={{ fontSize:'12px', color:'#9CA3AF', maxWidth:'220px', margin:'0 auto', lineHeight:1.6 }}>
                {activeTab === 'pending' ? 'Pesanan baru akan muncul di sini.' : 
                 activeTab === 'preparing' ? 'Daftar pesanan yang sedang diracik.' : 
                 activeTab === 'ready' ? 'Pesanan siap disajikan ke pelanggan.' :
                 'Riwayat pesanan selesai/batal akan tampil di sini.'}
              </p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              <AnimatePresence>
                {filteredOrders.map(order => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    onUpdateStatus={updateOrderStatus} 
                    onUpdateNote={updateOrderNote} 
                    role={role === 'kitchen' ? 'kitchen' : 'cashier'} 
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </main>

        <footer style={{
          padding:'10px 20px', background:'#fff', borderTop:'1px solid #f0ede9',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          fontSize:'11px', flexShrink:0
        }}>
          <span style={{ color:'#9CA3AF', display:'flex', alignItems:'center', gap:'5px' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#10B981', display:'inline-block' }} />
            Login: <strong className="text-stone-800">{activeStaffName}</strong>
          </span>
          <button onClick={logout} style={{ color:'#DC2626', fontWeight:700, background:'none', border:'none', cursor:'pointer', fontSize:'11px', minHeight:'auto' }}>
            Akhiri Sesi
          </button>
        </footer>

        {/* Tombol Buat Order cuma muncul buat role Cashier */}
        {role === 'cashier' && (
          <button 
            onClick={() => setIsPOSMode(true)}
            style={{
              position: 'absolute', bottom: '60px', right: '20px', zIndex: 40,
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #0E5C37, #065F46)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(14,92,55,0.4)',
            }}
          >
            <Plus size={24} />
          </button>
        )}

      </div>
    </div>
  );
}