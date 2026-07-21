import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Tag, Copy, Check, Clock, Percent } from 'lucide-react';
import { formatPrice } from '@/utils/formatters'; 

export interface CouponData {
  id: number;
  mitra_id: number | null;
  title: string | null;
  image: string | null;
  description: string | null;
  coupon_code: string;
  is_member_only: boolean;
  discount_price: string | null; 
  discount_rate: number | null;
  max_use: number;
  already_used: number;
  expired_date: string | Date | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
  deletedAt: string | Date | null;
}

interface PromoBannerProps {
  activePromos: CouponData[];
  onNavigate?: (promo: CouponData) => void;
}

function PromoCard({ promo, index, onNavigate }: { promo: CouponData; index: number; onNavigate?: (promo: CouponData) => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (promo.coupon_code) {
      navigator.clipboard.writeText(promo.coupon_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isPercentage = promo.discount_rate !== null && Number(promo.discount_rate) > 0;
  
  let discountLabel = '';
  if (isPercentage) {
    discountLabel = `${promo.discount_rate}% OFF`;
  } else if (promo.discount_price) {
    discountLabel = `Potongan ${formatPrice(Number(promo.discount_price))}`;
  } else {
    discountLabel = 'Promo Spesial';
  }

  // 🔴 LOGIKA PENAMPILAN WAKTU DINAMIS
  let timeLabel: string | null = null;
  if (promo.expired_date) {
    const end = new Date(promo.expired_date).getTime();
    const now = new Date().getTime();
    const diff = end - now;

    if (diff > 0) {
      const daysLeft = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
      const minutesLeft = Math.floor(diff / (1000 * 60));

      if (daysLeft > 0) {
        if (daysLeft <= 7) timeLabel = `${daysLeft} Hari Lagi`;
      } else if (hoursLeft > 0) {
        timeLabel = `${hoursLeft} Jam Lagi`;
      } else if (minutesLeft > 0) {
        timeLabel = `${minutesLeft} Menit Lagi`;
      } else {
        timeLabel = 'Segera Berakhir';
      }
    }
  }

  const gradients = [
    'linear-gradient(135deg, #0E5C37 0%, #0a4328 100%)', 
    'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)', 
    'linear-gradient(135deg, #b45309 0%, #78350f 100%)', 
    'linear-gradient(135deg, #be123c 0%, #4c0519 100%)'  
  ];
  const currentGradient = gradients[index % gradients.length];

  return (
    <motion.div
      onClick={() => onNavigate?.(promo)}
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="promo-card flex-shrink-0 w-[280px] rounded-2xl overflow-hidden shadow-lg relative group cursor-pointer active:scale-[0.97] transition-transform"
      style={{ background: currentGradient }}
    >
      <div className="absolute top-0 right-0 w-28 h-28 rounded-full opacity-10 bg-white translate-x-[30%] -translate-y-[30%]" />
      <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full opacity-[0.07] bg-white -translate-x-[30%] translate-y-[30%]" />

      <div className="relative p-5 flex flex-col justify-between min-h-[160px]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
              {isPercentage ? (
                <Percent className="w-4 h-4 text-white" />
              ) : (
                <Tag className="w-4 h-4 text-white" />
              )}
            </div>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/70">
              {promo.is_member_only ? 'Member Only' : 'Semua Pelanggan'}
            </span>
          </div>

          {/* 🔴 TAMPILKAN LABEL WAKTU JIKA ADA */}
          {timeLabel && (
            <span className="flex items-center gap-1 text-[9px] font-bold text-white/80 bg-white/15 backdrop-blur rounded-full px-2.5 py-1">
              <Clock className="w-3 h-3" />
              {timeLabel}
            </span>
          )}
        </div>

        <div className="my-3">
          <h3 className="text-xl font-black text-white leading-tight tracking-tight line-clamp-1">
            {discountLabel}
          </h3>
          <p className="text-xs text-white/80 mt-1 leading-relaxed line-clamp-2 font-sans font-medium">
            {promo.title}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 text-[10px] font-bold text-white bg-white/20 hover:bg-white/30 backdrop-blur rounded-full px-3 py-1.5 transition-all active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                Tersalin!
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Click to Copy
              </>
            )}
          </button>

          {promo.max_use > 0 && (
            <span className="text-[9px] text-white/60 font-sans font-semibold">
              Kuota Terbatas!!
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function PromoBanner({ activePromos, onNavigate }: PromoBannerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!activePromos || activePromos.length === 0) return null;

  return (
    <section className="promo-banner-container py-4 bg-white">
      <div className="px-6 flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <h2 className="text-sm font-bold font-sans text-stone-800">
            Promo & Event
          </h2>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400">
          {activePromos.length} Kupon Aktif
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto no-scrollbar px-6 pb-2"
      >
        <AnimatePresence>
          {activePromos.map((promo, idx) => (
            <PromoCard key={promo.id} promo={promo} index={idx} onNavigate={onNavigate} />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}