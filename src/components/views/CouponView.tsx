"use client"; // Wajib karena menggunakan Hook

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Ticket, Tag, Clock, CheckCircle2, Copy } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export default function CouponView({ onBack }: Props) {
  const params = useParams();
  const slug = params.mitraSlug as string;
  const routeSegments = Array.isArray(params.branchSlug) ? params.branchSlug : [];
  const reservedViews = new Set(['menu', 'checkout', 'tracking', 'history', 'help', 'profile', 'coupons', 'roasts']);
  const branchSlug = routeSegments[0] && !reservedViews.has(routeSegments[0]) ? routeSegments[0] : null;

  const [dbCoupons, setDbCoupons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [redeemCode, setRedeemCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [showToast, setShowToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  // 🔴 FETCH DATA DARI DATABASE
  useEffect(() => {
    const fetchCoupons = async () => {
      if (!slug) return;
      try {
        const query = new URLSearchParams({ slug });
        if (branchSlug) query.set('branch_slug', branchSlug);
        const response = await fetch(`/api/coupons?${query.toString()}`);
        const result = await response.json();
        if (result.success) {
          setDbCoupons(result.data);
        }
      } catch (error) {
        console.error("Gagal mengambil data kupon:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCoupons();
  }, [branchSlug, slug]);

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemCode.trim()) return;

    setIsRedeeming(true);
    // TODO: Nantinya hubungkan ke API validasi kupon
    setTimeout(() => {
      setIsRedeeming(false);
      setShowToast({ visible: true, message: `Kode ${redeemCode.toUpperCase()} berhasil diklaim!` });
      setRedeemCode('');
      setTimeout(() => setShowToast({ visible: false, message: '' }), 3000);
    }, 1500);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setShowToast({ visible: true, message: `Kode ${code} disalin!` });
    setTimeout(() => setShowToast({ visible: false, message: '' }), 2000);
  };

  // Helper untuk format tanggal dari database (Contoh: "2026-12-31T00:00:00.000Z")
  const formatDate = (dateString: string) => {
    if (!dateString) return "No Expiry";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="bg-[#F4F4F5] min-h-screen pb-32 flex flex-col relative">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast.visible && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] bg-stone-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 text-sm font-sans"
          >
            <CheckCircle2 className="w-4 h-4 text-[#0E5C37]" />
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
        {/* <section>
          <motion.div
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#0E5C37] flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold font-sans text-stone-900">Claim New Privilege</h3>
            </div>
            
            <form onSubmit={handleRedeem} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter privilege code..."
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-sans font-bold text-stone-800 placeholder:text-stone-400 placeholder:font-normal focus:outline-none focus:border-[#0E5C37] focus:ring-1 focus:ring-[#0E5C37] transition-all uppercase"
              />
              <button
                type="submit"
                disabled={!redeemCode.trim() || isRedeeming}
                className="px-6 bg-[#0E5C37] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-[#0E5C37]/90 transition-colors active:scale-95 flex items-center justify-center min-w-[100px]"
              >
                {isRedeeming ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : 'Redeem'}
              </button>
            </form>
          </motion.div>
        </section> */}

        {/* Vouchers List */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-label uppercase tracking-[0.3em] text-stone-500">Available Privileges</h3>
            {!isLoading && (
              <span className="text-xs font-bold text-stone-900 bg-stone-200 px-2 py-1 rounded-md">{dbCoupons.length}</span>
            )}
          </div>

          <div className="flex flex-col gap-4">
            {isLoading ? (
              // Loading Skeleton
              [1, 2].map(i => (
                <div key={i} className="h-32 bg-stone-200 rounded-3xl animate-pulse"></div>
              ))
            ) : dbCoupons.length === 0 ? (
              // Empty State
              <div className="text-center py-10 opacity-50">
                <Ticket className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-bold uppercase tracking-widest text-stone-500">No Privileges Found</p>
                <p className="text-xs font-sans mt-1">There are no member-exclusive coupons available right now.</p>
              </div>
            ) : (
              // Render Data DB
              dbCoupons.map((coupon, index) => {
                // Fallback warna jika tidak ada di DB
                const colorTheme = coupon.color || 'bg-stone-900'; 
                const textTheme = coupon.textColor || 'text-stone-50';

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    key={coupon.id}
                    className="relative bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm flex group"
                  >
                    {/* Left Ticket Stub */}
                    <div className={`${colorTheme} ${textTheme} w-24 flex flex-col items-center justify-center p-4 relative`}>
                      <Ticket className="w-8 h-8 mb-2 opacity-80" />
                      <span className="text-[10px] font-label uppercase tracking-widest opacity-60 rotate-180" style={{ writingMode: 'vertical-rl' }}>
                        Privilege
                      </span>
                      
                      {/* Ticket Cutout (Top & Bottom) */}
                      <div className="absolute -top-3 -right-3 w-6 h-6 bg-[#F4F4F5] rounded-full border-b border-l border-stone-200" />
                      <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-[#F4F4F5] rounded-full border-t border-l border-stone-200" />
                      <div className="absolute right-0 top-3 bottom-3 w-[1px] border-r-2 border-dashed border-white/20" />
                    </div>

                    {/* Right Content */}
                    <div className="flex-1 p-5 flex flex-col justify-between">
                      <div>
                        {/* Sesuaikan nama kolom dengan DB (misal: coupon.title atau coupon.name) */}
                        <h4 className="text-lg font-display text-stone-900 leading-tight mb-1">{coupon.title || coupon.name}</h4>
                        <p className="text-xs font-body text-stone-500 leading-relaxed mb-4" dangerouslySetInnerHTML={{ __html: coupon.description }} >
                          
                        </p>
                      </div>
                      
                      <div className="flex items-end justify-between mt-auto">
                        <div className="flex items-center gap-1.5 text-stone-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-label uppercase tracking-wider">
                            Valid til {formatDate(coupon.expired_date)}
                          </span>
                        </div>
                        
                        {/* <button 
                          onClick={() => handleCopyCode(coupon.coupon_code)}
                          className="flex items-center gap-1.5 text-[#0E5C37] bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors active:scale-95"
                        >
                          <span className="text-xs font-bold font-mono tracking-wider">{coupon.coupon_code}</span>
                          <Copy className="w-3.5 h-3.5" />
                        </button> */}
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