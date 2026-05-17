import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCartStore } from '../../store/cart.store';
import { useMenuStore } from '../../store/menu.store';
import { useParams } from 'next/navigation';

interface FloatingCartProps {
  onOpenCart: () => void;
  onCheckout: () => void;
}

// Menggunakan formatIDR yang konsisten dengan halaman Checkout dan CartSheet
const formatIDR = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
    .format(n)
    .replace(/\s/g, '');

export default function FloatingCart({ onOpenCart, onCheckout }: FloatingCartProps) {
  const params = useParams();
  const slug = (params.mitraSlug as string) || "";

  const { getTotalItems, calculateTotal } = useCartStore();
  const { items: menuItems } = useMenuStore();

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
          className="absolute bottom-[84px] left-0 right-0 z-50 px-4 pb-2 pointer-events-none"
        >
          <div
            className="max-w-[420px] mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-100 pointer-events-auto flex items-center gap-3 p-3"
          >
            {/* Icon with badge */}
            <button
              onClick={onOpenCart}
              className="relative flex-shrink-0 active:scale-95 transition-transform"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-50 text-[#0E5C37]"
              >
                <ShoppingBag className="w-5 h-5" />
              </div>
              <span
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center bg-[#0E5C37] text-white ring-2 ring-white shadow-sm"
              >
                {totalItems}
              </span>
            </button>

            {/* Info — tappable to open cart sheet */}
            <button
              onClick={onOpenCart}
              className="flex-1 text-left min-w-0 flex flex-col justify-center px-1"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-0.5">
                {totalItems === 1 ? '1 Item' : `${totalItems} Items`}
              </p>
              <p className="text-base font-black text-stone-900 truncate tracking-tight">
                {formatIDR(cartTotal)}
              </p>
            </button>

            {/* Checkout button */}
            <button
              onClick={onCheckout}
              className="rounded-xl px-5 py-3.5 text-[11px] font-bold tracking-widest uppercase whitespace-nowrap active:scale-[0.97] transition-all flex-shrink-0 bg-[#0E5C37] text-white flex items-center gap-2 shadow-md shadow-emerald-900/20 hover:bg-emerald-800"
            >
              Order <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}