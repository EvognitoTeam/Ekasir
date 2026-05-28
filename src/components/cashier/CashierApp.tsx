"use client"; // Wajib karena pakai hook

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation'; // 🔴 1. Ambil slug untuk Multi-Tenant
import { useMenuStore } from '@/store/menu.store';
import { Order } from '@/types/menu'; // Sesuaikan path relative-nya
import OrderCard from '@/components/cashier/OrderCard';
import { formatPrice } from '../../utils/formatters';
import CashierPOS from '@/components/cashier/CashierPOS';
import {
  ArrowLeft, BellRing, ReceiptText, ShieldCheck, RefreshCw,
  Sparkles, ShoppingBag, TrendingUp, RotateCcw, Coffee, Plus, Loader2
} from 'lucide-react';
import { useOrderStore } from '@/store/order.store';
import AdminDashboardView from '@/components/views/AdminDashboardView';
import { motion, AnimatePresence } from 'framer-motion';

const CHANNEL_NAME = 'bersejuk-order-sync';

export default function CashierApp() {
  const params = useParams();
  const router = useRouter();
  const slug = (params.mitraSlug as string) || (params.slug as string) || "";

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<'cashier' | 'owner' | null>(null);
  const [pinInput, setPinInput] = useState('');
  
  // 🔴 2. State untuk Data Dinamis
  const [orders, setOrders] = useState<Order[]>([]);
  const [mitraProfile, setMitraProfile] = useState<{ name: string; pinCashier: string; pinOwner: string }>({
    name: 'Kasir', pinCashier: '1234', pinOwner: '4321' // Fallback awal
  });
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  const [activeTab, setActiveTab] = useState<'pending' | 'preparing' | 'completed'>('pending');
  const [notification, setNotification] = useState<string | null>(null);
  const [undoAction, setUndoAction] = useState<{
    orderId: string; oldStatus: Order['status']; oldPaymentStatus?: Order['paymentStatus']; timeoutId: ReturnType<typeof setTimeout>;
  } | null>(null);
  const [isPOSMode, setIsPOSMode] = useState(false);

  const { settings, updateSettings } = useOrderStore();
  const isCafeOpen = settings.isOpen;
  // Jika menu diambil dari API, pastikan store juga diupdate via API, bukan MOCK
  const { setMenu } = useMenuStore();

  // 🔴 3. Fungsi Ambil Data Mitra & Menu Dinamis
  useEffect(() => {
    if (!slug) return;
    
    const initApp = async () => {
      try {
        // Ambil Data Profil Kafe & PIN
        const resMitra = await fetch(`/api/mitra?slug=${slug}`);
        const dataMitra = await resMitra.json();
        
        if (dataMitra.success) {
          setMitraProfile({
            name: dataMitra.data.name || 'Kasir',
            pinCashier: '1234', // Nanti bisa disesuaikan narik dari DB
            pinOwner: '4321'
          });
        }

        // Ambil Data Menu (Gantikan MOCK_MENU)
        const resMenu = await fetch(`/api/menu?slug=${slug}`);
        const dataMenu = await resMenu.json();
        if (dataMenu.success) {
           // Asumsi dataMenu.data berisi { items: [], categories: [] }
           setMenu(dataMenu.data.items || [], dataMenu.data.categories || []);
        }
      } catch (e) {
        console.error("Gagal inisialisasi awal:", e);
      } finally {
        setIsLoadingInitial(false);
      }
    };
    
    initApp();
  }, [slug]);

  // 🔴 4. Fungsi Fetch Orders dari API Database
  const fetchOrders = async (isPolling = false) => {
    if (!slug) return;
    try {
      const res = await fetch(`/api/orders?slug=${slug}`);
      const result = await res.json();
      
      if (result.success && Array.isArray(result.data)) {
        setOrders(prev => {
           if (!isPolling && prev.length > 0 && result.data.length > prev.length) {
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

  // 🔴 5. Polling Database per 10 Detik
  useEffect(() => {
    if (!isAuthenticated) return; // Hanya polling jika sudah login

    fetchOrders(); // Initial fetch saat buka kasir

    const ch = new BroadcastChannel(CHANNEL_NAME);
    ch.onmessage = (e) => {
      if (e.data?.__secureToken !== 'bsjk-secure-v1') return;
      if (e.data?.type === 'NEW_ORDER' || e.data?.type === 'STATUS_UPDATE') fetchOrders(false);
    };

    const interval = setInterval(() => {
      fetchOrders(true);
    }, 10000); // Polling tiap 10 detik

    return () => { ch.close(); clearInterval(interval); };
  }, [slug, isAuthenticated]);

  const toggleCafeStatus = () => {
    const newState = !isCafeOpen;
    updateSettings({ isOpen: newState });
    const ch = new BroadcastChannel(CHANNEL_NAME);
    ch.postMessage({ type: 'STATUS_UPDATE', __secureToken: 'bsjk-secure-v1' });
    setTimeout(() => ch.close(), 100);
  };

  // 🔴 6. Update Status langsung ke API
  const executeUpdate = async (orderId: string, newStatus: Order['status'], newPaymentStatus?: Order['paymentStatus']) => {
    try {
      // Optimistic update di UI
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, paymentStatus: newPaymentStatus || o.paymentStatus } : o));
      
      // Tembak API
      await fetch(`/api/orders/${orderId}?slug=${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, paymentStatus: newPaymentStatus })
      });

      const ch = new BroadcastChannel(CHANNEL_NAME);
      ch.postMessage({ type: 'STATUS_UPDATE', orderId, status: newStatus, __secureToken: 'bsjk-secure-v1' });
      setTimeout(() => ch.close(), 100);
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
      await fetch(`/api/orders/${orderId}?slug=${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes: note })
      });
    } catch (e) {
      console.error("Gagal update note:", e);
    }
  };

  const handlePOSSubmit = (newOrder: Order) => {
    // Note: Pastikan CashierPOS juga sudah disesuaikan nembak ke API /api/orders
    setOrders(prev => [newOrder, ...prev]);
    setIsPOSMode(false);
    
    const ch = new BroadcastChannel(CHANNEL_NAME);
    ch.postMessage({ type: 'STATUS_UPDATE', __secureToken: 'bsjk-secure-v1' });
    setTimeout(() => ch.close(), 100);
  };

  const handleUndo = () => {
    if (!undoAction) return;
    clearTimeout(undoAction.timeoutId);
    executeUpdate(undoAction.orderId, undoAction.oldStatus, undoAction.oldPaymentStatus);
    setUndoAction(null);
  };

  // Kalkulasi Statistik UI
  const pendingCount   = useMemo(() => orders.filter(o => o.status === 'pending').length, [orders]);
  const preparingCount = useMemo(() => orders.filter(o => o.status === 'confirmed' || o.status === 'preparing').length, [orders]);
  const completedCount = useMemo(() => orders.filter(o => o.status === 'ready' || o.status === 'completed').length, [orders]);
  const todayOrders    = useMemo(() => { const t = new Date().toDateString(); return orders.filter(o => new Date(o.createdAt).toDateString() === t); }, [orders]);
  const totalRevenue   = useMemo(() => todayOrders.reduce((s, o) => s + (Number(o.totalPrice) || 0), 0), [todayOrders]);
  const totalProfit    = useMemo(() => totalRevenue * 0.45, [totalRevenue]);

  const filteredOrders = useMemo(() => orders.filter(o => {
    if (activeTab === 'pending')   return o.status === 'pending';
    if (activeTab === 'preparing') return o.status === 'confirmed' || o.status === 'preparing';
    if (activeTab === 'completed') return o.status === 'ready' || o.status === 'completed';
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [orders, activeTab]);

  const handleNumpadClick = (value: string) => {
    if (value === 'C') { setPinInput(''); return; }
    if (value === 'BACK') { setPinInput(p => p.slice(0, -1)); return; }
    if (pinInput.length >= 4) return;
    
    const next = pinInput + value;
    setPinInput(next);
    
    if (next === mitraProfile.pinCashier) setTimeout(() => { setIsAuthenticated(true); setRole('cashier'); }, 150);
    else if (next === mitraProfile.pinOwner) setTimeout(() => { setIsAuthenticated(true); setRole('owner'); }, 150);
  };

  const handleKeyboardInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPinInput(val);
    if (val === mitraProfile.pinCashier) { setIsAuthenticated(true); setRole('cashier'); }
    else if (val === mitraProfile.pinOwner) { setIsAuthenticated(true); setRole('owner'); }
  };

  const logout = () => { setIsAuthenticated(false); setRole(null); setPinInput(''); };

  // Layar Loading Awal
  if (isLoadingInitial) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f6f3ee' }}>
         <Loader2 className="w-8 h-8 animate-spin text-[#0E5C37]" />
         <p style={{ marginTop: 16, fontSize: 12, fontWeight: 700, color: '#9CA3AF' }}>Menyiapkan Kasir...</p>
      </div>
    );
  }

  /* ─── PIN Screen ─── */
  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100dvh', background: 'linear-gradient(160deg, #f6f3ee 0%, #e8e2d9 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', position: 'relative'
      }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(14,92,55,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(14,92,55,0.04)', pointerEvents: 'none' }} />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4,0,0.2,1] }}
          style={{
            width: '100%', maxWidth: '340px',
            background: '#fff', borderRadius: '24px',
            border: '1.5px solid #e5e2dd',
            boxShadow: '0 24px 64px rgba(28,28,25,0.1)',
            padding: '32px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}
        >
          {/* Logo area */}
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #0E5C37, #065F46)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '16px', boxShadow: '0 8px 24px rgba(14,92,55,0.25)'
          }}>
            <Coffee size={26} color="#fff" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1c1c19', margin: 0, fontFamily: 'var(--font-display)' }}>{mitraProfile.name}</h2>
          <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '4px 0 24px', textAlign: 'center' }}>Masukkan PIN untuk masuk kasir</p>

          {/* PIN dots */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            {.map(i => (
              <div key={i} style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: pinInput[i] ? '#0E5C37' : '#f6f3ee',
                border: `2px solid ${pinInput[i] ? '#0E5C37' : '#e5e2dd'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', color: '#fff', transition: 'all 0.2s',
                boxShadow: pinInput[i] ? '0 4px 12px rgba(14,92,55,0.3)' : 'none'
              }}>
                {pinInput[i] ? '●' : ''}
              </div>
            ))}
          </div>

          <input type="text" value={pinInput} onChange={handleKeyboardInput}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }} autoFocus />

          {/* Numpad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', width: '100%', maxWidth: '260px', marginBottom: '20px' }}>
            {['1','2','3','4','5','6','7','8','9','C','0','BACK'].map(btn => (
              <button key={btn} onClick={() => handleNumpadClick(btn)} style={{
                height: '52px', borderRadius: '12px', fontSize: '16px', fontWeight: 700,
                border: btn === 'C' ? '1.5px solid #FCA5A5' : '1.5px solid #e5e2dd',
                background: btn === 'C' ? '#FEF2F2' : btn === 'BACK' ? '#f6f3ee' : '#fff',
                color: btn === 'C' ? '#DC2626' : '#1c1c19',
                cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: '0 1px 3px rgba(28,28,25,0.06)',
              }}
                onMouseOver={e => (e.currentTarget.style.transform = 'scale(0.96)')}
                onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {btn === 'BACK' ? '←' : btn}
              </button>
            ))}
          </div>

          <div style={{ width: '100%', paddingTop: '16px', borderTop: '1px solid #f0ede9', display: 'flex', justifyContent: 'space-around', fontSize: '11px', color: '#9CA3AF' }}>
            <span>Kasir: <strong style={{ color: '#1c1c19' }}>{mitraProfile.pinCashier}</strong></span>
            <span>·</span>
            <span>Pemilik: <strong style={{ color: '#1c1c19' }}>{mitraProfile.pinOwner}</strong></span>
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
              <span>Dilihat sebagai Pemilik</span>
            </div>
            <button onClick={logout} style={{ color: '#DC2626', fontWeight: 700, fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', minHeight: 'auto' }}>Keluar</button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Cashier Main View ─── */
  const TABS = [
    { id: 'pending',   label: 'Baru',      count: pendingCount   },
    { id: 'preparing', label: 'Diracik',   count: preparingCount },
    { id: 'completed', label: 'Selesai',   count: completedCount },
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

        {/* Header */}
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
              <p style={{ margin:0, fontSize:'9px', color:'#9CA3AF', fontFamily:'var(--font-label)', letterSpacing:'0.1em' }}>DAPUR & KASIR</p>
              <h1 style={{ margin:0, fontSize:'16px', fontWeight:800, color:'#1c1c19', lineHeight:1.2, fontFamily:'var(--font-display)' }}>
                 {mitraProfile.name}
              </h1>
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
            <button onClick={toggleCafeStatus} style={{
              display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px', borderRadius:'8px',
              border: `1.5px solid ${isCafeOpen ? '#6EE7B7' : '#FCA5A5'}`,
              background: isCafeOpen ? '#ECFDF5' : '#FEF2F2',
              color: isCafeOpen ? '#065F46' : '#991B1B',
              fontSize:'11px', fontWeight:700, cursor:'pointer', minHeight:'auto'
            }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background: isCafeOpen ? '#10B981' : '#EF4444', display:'inline-block' }} />
              {isCafeOpen ? 'Buka' : 'Tutup'}
            </button>
            <button onClick={() => fetchOrders(true)} title="Refresh" style={{
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

        {/* Stats Bar */}
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

        {/* Tabs */}
        <div style={{ padding:'10px 16px', background:'#fff', borderBottom:'1px solid #f0ede9', display:'flex', gap:'8px', flexShrink:0 }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{
                flex:1, padding:'9px 8px', borderRadius:'10px', fontSize:'11px', fontWeight:700,
                border: active ? '1.5px solid #0E5C37' : '1.5px solid #f0ede9',
                background: active ? '#0E5C37' : '#fafaf9',
                color: active ? '#fff' : '#9CA3AF',
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
                boxShadow: active ? '0 4px 12px rgba(14,92,55,0.25)' : 'none',
                transition:'all 0.2s', minHeight:'auto'
              }}>
                {tab.label}
                <span style={{
                  width:'18px', height:'18px', borderRadius:'6px', fontSize:'10px', fontWeight:800,
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

        {/* Orders List */}
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
                {activeTab === 'pending' ? 'Pesanan baru akan muncul di sini.' : activeTab === 'preparing' ? 'Semua pesanan sudah siap disajikan.' : 'Riwayat pesanan selesai akan tampil di sini.'}
              </p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              <AnimatePresence>
                {filteredOrders.map(order => (
                  <OrderCard key={order.id} order={order} onUpdateStatus={updateOrderStatus} onUpdateNote={updateOrderNote} role="cashier" />
                ))}
              </AnimatePresence>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer style={{
          padding:'10px 20px', background:'#fff', borderTop:'1px solid #f0ede9',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          fontSize:'11px', flexShrink:0
        }}>
          <span style={{ color:'#9CA3AF', display:'flex', alignItems:'center', gap:'5px' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#10B981', display:'inline-block' }} />
            Kasir Aktif
          </span>
          <button onClick={logout} style={{ color:'#DC2626', fontWeight:700, background:'none', border:'none', cursor:'pointer', fontSize:'11px', minHeight:'auto' }}>
            Keluar Akun
          </button>
        </footer>

        {/* Floating Action Button for POS Mode */}
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

      </div>
    </div>
  );
}