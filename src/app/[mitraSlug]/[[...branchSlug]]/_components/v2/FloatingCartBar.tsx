'use client';

import {
  ArrowRight,
  ShoppingBag,
} from 'lucide-react';
import {
  AnimatePresence,
  motion,
} from 'framer-motion';
import {
  useParams,
} from 'next/navigation';

import {
  useCartStore,
} from '@/store/cart.store';
import {
  useMenuStore,
} from '@/store/menu.store';

type Props = {
  onOpenCart: () => void;
  onCheckout: () => void;
  showBottomDock?: boolean;
};

const formatIDR = (
  value:
    number,
) =>
  new Intl.NumberFormat(
    'id-ID',
    {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    },
  )
    .format(value)
    .replace(/\s/g, '');

export default function FloatingCartBar({
  onOpenCart,
  onCheckout,
  showBottomDock = true,
}: Props) {
  const params =
    useParams();

  const slug =
    typeof params.mitraSlug ===
    'string'
      ? params.mitraSlug
      : '';

  const {
    getTotalItems,
    calculateTotal,
  } =
    useCartStore();

  const menuItems =
    useMenuStore(
      (state) =>
        state.items,
    );

  const totalItems =
    getTotalItems(slug);

  const {
    total,
  } =
    calculateTotal(
      slug,
      menuItems,
    );

  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.div
          initial={{
            y: 20,
            opacity: 0,
          }}
          animate={{
            y: 0,
            opacity: 1,
          }}
          exit={{
            y: 20,
            opacity: 0,
          }}
          className={`pointer-events-none absolute inset-x-0 z-40 px-2.5 ${
            showBottomDock
              ? 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))]'
              : 'bottom-3'
          }`}
        >
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-black/10 bg-white/95 p-2 shadow-2xl backdrop-blur-xl">
            <button
              type="button"
              onClick={
                onOpenCart
              }
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black text-white"
            >
              <ShoppingBag className="h-4 w-4" />

              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-stone-50 bg-white px-1 text-[8px] font-black text-black">
                {
                  totalItems
                }
              </span>
            </button>

            <button
              type="button"
              onClick={
                onOpenCart
              }
              className="min-w-0 flex-1 text-left"
            >
              <p className="text-[8px] font-extrabold uppercase tracking-[0.12em] text-black/35">
                {
                  totalItems
                }{' '}
                item
              </p>

              <p className="mt-0.5 truncate text-sm font-black">
                {formatIDR(
                  total,
                )}
              </p>
            </button>

            <button
              type="button"
              onClick={
                onCheckout
              }
              className="flex h-11 items-center gap-1.5 rounded-xl bg-black px-3.5 text-[8px] font-extrabold uppercase tracking-[0.11em] text-white"
            >
              Checkout
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
