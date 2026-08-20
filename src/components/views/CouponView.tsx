"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Ticket, Tag, Clock, CheckCircle2, AlertCircle, Copy, CheckCircle } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export default function CouponView({ onBack }: Props) {
  const params = useParams();
  const slug = params.mitraSlug as string;
  const routeSegments = Array.isArray(params.branchSlug) ? params.branchSlug : [];
  const reservedViews = new Set(['menu', 'checkout', 'tracking', 'history', 'help', 'profile', 'coupons', 'roasts']);
  const branchSlug = routeSegments[0] && !reservedViews.has(routeSegments[0]) ? routeSegments[0] : null;

  const [userData, setUserData] = useState<any>(null);
  const [dbCoupons, setDbCoupons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 🔴 STATE UNTUK TAB VOUCHER
  const [activeTab, setActiveTab] = useState<'active' | 'redeemed' | 'expired'>('active');

  const [redeemCode, setRedeemCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [showToast, setShowToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ 
    visible: false, 
    message: '', 
    type: 'success' 
  });

  // 🔴 FETCH DATA KUPON
  const fetchCoupons = useCallback(async () => {
    if (!slug) return;
    try {
      const query = new URLSearchParams({ slug });
      if (branchSlug) query.set('branch_slug', branchSlug);
      query.set('include_history', 'true');
      const response = await fetch(`/api/coupons?${query.toString()}`);
      const result = await response.json();
      if (result.success) {
        setDbCoupons(result.data);
      }
    } catch (error) {
      console.error("Gagal mengambil data kupon:", error);
    }
  }, [slug, branchSlug]);

  // 🔴 FETCH USER SESSION & INIT
  useEffect(() => {
    const fetchAuth = async () => {
      try {
        const query = new URLSearchParams({ slug });
        if (branchSlug) query.set('branch_slug', branchSlug);
        const response = await fetch(`/api/auth/me?${query.toString()}`);
        const result = await response.json();
        if (result.success && result.user) {
          setUserData(result.user);
        }
      } catch (err) {
        console.error("Gagal verifikasi sesi:", err);
      }
    };

    setIsLoading(true);
    Promise.all([fetchAuth(), fetchCoupons()]).finally(() => {
      setIsLoading(false);
    });
  }, [slug, branchSlug, fetchCoupons]);

  // 🔴 HANDLE CLAIM VOUCHER
  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemCode.trim()) return;

    if (!userData) {
      setShowToast({ visible: true, message: 'Silakan login terlebih dahulu untuk mengklaim voucher.', type: 'error' });
      setTimeout(() => setShowToast(prev => ({ ...prev, visible: false })), 3000);
      return;
    }

    setIsRedeeming(true);

    try {
      const response = await fetch('/api/coupons/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupon_code: redeemCode,
          user_id: userData.id,
          mitra_id: userData.mitraId
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setShowToast({ visible: true, message: result.message, type: 'success' });
        setRedeemCode('');
        // Refresh daftar kupon setelah berhasil klaim
        await fetchCoupons(); 
        // Pindah otomatis ke tab active agar user bisa lihat vouchernya
        setActiveTab('active');
      } else {
        setShowToast({ visible: true, message: result.message || 'Gagal mengklaim voucher.', type: 'error' });
      }
    } catch (error) {
      setShowToast({ visible: true, message: 'Terjadi kesalahan jaringan.', type: 'error' });
    } finally {
      setIsRedeeming(false);
      setTimeout(() => setShowToast(prev => ({ ...prev, visible: false })), 4000);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setShowToast({ visible: true, message: `Kode ${code} disalin!`, type: 'success' });
    setTimeout(() => setShowToast(prev => ({ ...prev, visible: false })), 2000);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "No Expiry";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // 🔴 LOGIKA FILTER TAB KUPON
  const visibleCoupons = dbCoupons.filter((coupon) => {
    // 1. Keamanan: Sembunyikan voucher orang lain
    if (coupon.is_claimable && (!userData || coupon.claimed_by_user_id !== userData.id)) {
      return false;
    }

    const now = new Date();
    const isExpired = coupon.expired_date ? new Date(coupon.expired_date) < now : false;
    const isGlobalEmpty = coupon.max_use > 0 && coupon.already_used >= coupon.max_use;
    
    // Properti is_used akan dikirim dari API kita yang baru
    const isUsedByMe = coupon.is_used === true; 

    // Pengelompokan ke Tab
    if (activeTab === 'redeemed') {
      return isUsedByMe; // Hanya yang sudah dipakai
    }

    if (activeTab === 'expired') {
      // Yang expired ATAU kuota publik habis, DAN belum pernah saya pakai
      return (isExpired || isGlobalEmpty) && !isUsedByMe;
    }

    if (activeTab === 'active') {
      // Masih aktif, kuota masih ada, dan belum pernah saya pakai
      return !isExpired && !isGlobalEmpty && !isUsedByMe;
    }

    return false;
  });

  return (
    <div className="bg-[#F4F4F5] min-h-screen pb-32 flex flex-col relative">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast.visible && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 text-sm font-sans whitespace-nowrap ${showToast.type === 'success' ? 'bg-stone-900' : 'bg-red-600'}`}
          >
            {showToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-white" />
            )}
            {showToast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white px-6 py-6 border-b border-stone-200 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full border border-stone-200 flex items-center justify-center hover:bg-stone-50 transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-stone-700" />
          </button>
          <div>
            <h1 className="text-xl font-bold font-sans text-stone-900 uppercase tracking-wide">
              Member Privileges
            </h1>
            <p className="text-xs font-sans text-stone-500 mt-0.5">
              Exclusive rewards for our artisans.
            </p>
          </div>
        </div>
      </header>

      <div className="px-6 py-8 flex flex-col gap-8 flex-1">
        
        {/* Redeem Code Section */}
        <section>
          <motion.div
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#0E5C37] flex items-center justify-center">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-sans text-stone-900 leading-tight">Claim Privilege Code</h3>
                  {!userData && <p className="text-[10px] text-amber-600 font-bold mt-0.5">Login required to claim</p>}
                </div>
              </div>
            </div>
            
            <form onSubmit={handleRedeem} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter unique code..."
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                disabled={!userData}
                className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-sans font-bold text-stone-800 placeholder:text-stone-400 placeholder:font-normal focus:outline-none focus:border-[#0E5C37] focus:ring-1 focus:ring-[#0E5C37] transition-all uppercase disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!redeemCode.trim() || isRedeeming || !userData}
                className="px-6 bg-[#0E5C37] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-[#0E5C37]/90 transition-colors active:scale-95 flex items-center justify-center min-w-[100px]"
              >
                {isRedeeming ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : 'Claim'}
              </button>
            </form>
          </motion.div>
        </section>

        {/* Vouchers List & Tabs */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-label uppercase tracking-[0.3em] text-stone-500">My Privileges</h3>
          </div>

          {/* 🔴 TAB NAVIGATION */}
          <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'active', label: 'Active' },
              { id: 'redeemed', label: 'Redeemed' },
              { id: 'expired', label: 'Expired' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-[#0E5C37] text-white shadow-md' 
                    : 'bg-white border border-stone-200 text-stone-500 hover:bg-stone-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            {isLoading ? (
              [1, 2].map(i => (
                <div key={i} className="h-32 bg-stone-200 rounded-3xl animate-pulse"></div>
              ))
            ) : visibleCoupons.length === 0 ? (
              <div className="text-center py-10 opacity-50">
                <Ticket className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-bold uppercase tracking-widest text-stone-500">
                  {activeTab === 'active' ? 'No Active Privileges' : 
                   activeTab === 'redeemed' ? 'No Redeemed Privileges' : 'No Expired Privileges'}
                </p>
                <p className="text-xs font-sans mt-1">
                  {activeTab === 'active' ? 'You have no active coupons ready to use.' : 'Check back later.'}
                </p>
              </div>
            ) : (
              visibleCoupons.map((coupon, index) => {
                const colorTheme = coupon.color || 'bg-stone-900'; 
                const textTheme = coupon.textColor || 'text-stone-50';
                
                // Opacity style jika bukan di tab active
                const isInactive = activeTab !== 'active';

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    key={coupon.id}
                    className={`relative bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm flex group ${isInactive ? 'opacity-60 grayscale-[50%]' : ''}`}
                  >
                    
                    {/* STAMP JIKA REDEEMED / EXPIRED */}
                    {activeTab === 'redeemed' && (
                      <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
                        <div className="border-4 border-emerald-600/60 text-emerald-700/80 rounded-lg px-4 py-2 transform -rotate-12 font-black text-2xl uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle className="w-6 h-6" /> REDEEMED
                        </div>
                      </div>
                    )}

                    {activeTab === 'expired' && (
                      <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
                        <div className="border-4 border-stone-400/60 text-stone-500/80 rounded-lg px-4 py-2 transform -rotate-12 font-black text-2xl uppercase tracking-widest flex items-center gap-2">
                           EXPIRED
                        </div>
                      </div>
                    )}

                    {/* Left Ticket Stub */}
                    <div className={`${colorTheme} ${textTheme} w-24 flex flex-col items-center justify-center p-4 relative`}>
                      <Ticket className="w-8 h-8 mb-2 opacity-80" />
                      <span className="text-[10px] font-label uppercase tracking-widest opacity-60 rotate-180" style={{ writingMode: 'vertical-rl' }}>
                        Privilege
                      </span>
                      <div className="absolute -top-3 -right-3 w-6 h-6 bg-[#F4F4F5] rounded-full border-b border-l border-stone-200" />
                      <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-[#F4F4F5] rounded-full border-t border-l border-stone-200" />
                      <div className="absolute right-0 top-3 bottom-3 w-[1px] border-r-2 border-dashed border-white/20" />
                    </div>

                    {/* Right Content */}
                    <div className="flex-1 p-5 flex flex-col justify-between">
                      <div>
                        <h4 className="text-lg font-display text-stone-900 leading-tight mb-1">{coupon.title || coupon.name}</h4>
                        <p className="text-xs font-body text-stone-500 leading-relaxed mb-4" dangerouslySetInnerHTML={{ __html: coupon.description || '' }} />
                      </div>
                      
                      <div className="flex items-end justify-between mt-auto relative z-20">
                        <div className="flex flex-col gap-1">
                           <div className="flex items-center gap-1.5 text-stone-400">
                             <Clock className="w-3.5 h-3.5" />
                             <span className="text-[10px] font-label uppercase tracking-wider">
                               Valid til {formatDate(coupon.expired_date)}
                             </span>
                           </div>
                           {coupon.is_claimable && coupon.claimed_by_user_id && (
                             <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded w-fit">
                               Your Private Voucher
                             </span>
                           )}
                        </div>
                        
                        {!isInactive && (
                          <button 
                            onClick={() => handleCopyCode(coupon.coupon_code)}
                            className="flex items-center gap-1.5 text-[#0E5C37] bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors active:scale-95"
                            title="Copy Code"
                          >
                            <span className="text-xs font-bold font-mono tracking-wider">{coupon.coupon_code}</span>
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </section>

      </div>
    </div>
  );
}