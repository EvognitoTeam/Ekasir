import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { useParams } from 'next/navigation';

import { useCartStore } from '@/store/cart.store';
import { useMenuStore } from '@/store/menu.store';

interface FloatingCartProps {
  onOpenCart: () => void;
  onCheckout: () => void;
  showBottomNav?: boolean;
}

const formatIDR = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  })
    .format(value)
    .replace(/\s/g, '');

export default function FloatingCart({
  onOpenCart,
  onCheckout,
  showBottomNav = true,
}: FloatingCartProps) {
  const params = useParams();
  const slug = typeof params.mitraSlug === 'string' ? params.mitraSlug : '';
  const { getTotalItems, calculateTotal } = useCartStore();
  const menuItems = useMenuStore((state) => state.items);
  const totalItems = getTotalItems(slug);
  const cartTotal = calculateTotal(slug, menuItems);

  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className={`pointer-events-none absolute inset-x-0 z-20 px-3 pb-2 sm:px-4 ${
            showBottomNav
              ? 'bottom-[calc(80px+env(safe-area-inset-bottom))] md:bottom-4'
              : 'bottom-4'
          }`}
        >
          <div className="pointer-events-auto mx-auto flex max-w-[420px] items-center gap-3 rounded-2xl border border-stone-100 bg-white/95 p-3 shadow-[0_16px_45px_rgba(28,28,25,0.15)] backdrop-blur-xl">
            <button
              type="button"
              onClick={onOpenCart}
              aria-label="Buka keranjang"
              className="relative shrink-0 active:scale-95"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-[var(--color-primary)]">
                <ShoppingBag className="h-5 w-5" />
              </span>
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {totalItems}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenCart}
              className="flex min-w-0 flex-1 flex-col items-start px-1 text-left"
            >
              <span className="text-[9px] font-label uppercase tracking-widest text-stone-400">
                {totalItems} menu dipilih
              </span>
              <span className="truncate text-base font-black tracking-tight text-stone-900">
                {formatIDR(cartTotal)}
              </span>
            </button>

            <button
              type="button"
              onClick={onCheckout}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-3 text-[10px] font-label uppercase tracking-widest text-white shadow-md hover:bg-[var(--color-primary-container)] active:scale-[0.97]"
            >
              Pesan
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
