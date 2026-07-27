'use client';

import {
  ArrowLeft,
  Grid2X2,
  ShoppingCart,
} from 'lucide-react';

import KioskProductCard from './KioskProductCard';
import KioskPromoBanner from './KioskPromoBanner';

import type {
  KioskCategory,
  KioskProduct,
  KioskPromo,
} from './types';

type Props = {
  categories: KioskCategory[];
  products: KioskProduct[];
  promos: KioskPromo[];
  appliedPromo: KioskPromo | null;
  discountAmount: number;
  activeCategoryId: string | null;
  cartQuantity: number;
  cartTotal: number;
  finalTotal: number;
  onCategoryChange: (id: string | null) => void;
  onProductClick: (product: KioskProduct) => void;
  onOpenPromos: () => void;
  onBack: () => void;
  onOpenCart: () => void;
};

export default function KioskCatalog({
  categories,
  products,
  promos,
  appliedPromo,
  discountAmount,
  activeCategoryId,
  cartQuantity,
  cartTotal,
  finalTotal,
  onCategoryChange,
  onProductClick,
  onOpenPromos,
  onBack,
  onOpenCart,
}: Props) {
  return (
    <section className="min-h-[100dvh] bg-stone-100 pb-28 sm:pb-32">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
        <div className="flex items-center justify-between px-3 py-3 sm:px-5 sm:py-4 lg:px-8 lg:py-5">
          <button
            type="button"
            onClick={onBack}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 sm:h-12 sm:w-12 lg:h-14 lg:w-14 lg:rounded-2xl"
          >
            <ArrowLeft className="h-5 w-5 lg:h-6 lg:w-6" />
          </button>

          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-600 sm:text-[10px] lg:text-xs lg:tracking-[0.25em]">
              Pilih menu
            </p>
            <h1 className="mt-0.5 text-xl font-black text-stone-950 sm:text-2xl lg:mt-1 lg:text-3xl">
              Mau makan apa?
            </h1>
          </div>

          <div className="w-11 sm:w-12 lg:w-14" />
        </div>
      </header>

      <div className="flex min-w-0">
        <aside className="sticky top-[68px] h-[calc(100dvh-68px-112px)] w-[104px] shrink-0 overflow-y-auto border-r border-stone-200 bg-white p-2 sm:top-[76px] sm:h-[calc(100dvh-76px-128px)] sm:w-[150px] sm:p-3 lg:top-[105px] lg:h-[calc(100dvh-105px-128px)] lg:w-[230px] lg:p-5">
          <p className="hidden px-3 pb-4 text-xs font-black uppercase tracking-[0.22em] text-stone-400 lg:block">
            Kategori
          </p>

          <div className="space-y-2 sm:space-y-3">
            <CategoryButton
              active={activeCategoryId === null}
              label="Semua"
              icon={<Grid2X2 className="h-4 w-4 lg:h-5 lg:w-5" />}
              onClick={() => onCategoryChange(null)}
            />

            {categories.map((category) => (
              <CategoryButton
                key={category.id}
                active={activeCategoryId === category.id}
                label={category.name}
                onClick={() => onCategoryChange(category.id)}
              />
            ))}
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-3 sm:p-4 lg:p-7">
          <KioskPromoBanner
            promos={promos}
            appliedPromo={appliedPromo}
            discountAmount={discountAmount}
            onOpen={onOpenPromos}
          />

          <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-5 sm:grid-cols-2 sm:gap-4 lg:mt-7 lg:gap-5 2xl:grid-cols-3">
            {products.map((product) => (
              <KioskProductCard
                key={product.id}
                product={product}
                onClick={onProductClick}
              />
            ))}
          </div>

          {products.length === 0 && (
            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white px-4 text-center sm:min-h-[420px] lg:min-h-[480px] lg:rounded-[2rem]">
              <div>
                <p className="text-xl font-black text-stone-800 sm:text-2xl lg:text-3xl">
                  Menu belum tersedia
                </p>
                <p className="mt-2 text-sm text-stone-500 sm:text-base lg:mt-3 lg:text-lg">
                  Pilih kategori lain.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-[1600px] -translate-x-1/2 border-t border-stone-200 bg-white p-3 sm:p-4 lg:p-5">
        <button
          type="button"
          disabled={cartQuantity === 0}
          onClick={onOpenCart}
          className="flex min-h-16 w-full items-center justify-between rounded-2xl bg-stone-950 px-4 text-white disabled:bg-stone-300 sm:min-h-18 sm:px-6 lg:min-h-20 lg:rounded-[1.5rem] lg:px-7"
        >
          <div className="flex items-center gap-2 sm:gap-4">
            <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
            <span className="text-sm font-black sm:text-lg lg:text-xl">
              Keranjang ({cartQuantity})
            </span>
          </div>

          <div className="text-right">
            {discountAmount > 0 && (
              <p className="text-[10px] font-bold text-stone-400 line-through sm:text-xs">
                Rp{cartTotal.toLocaleString('id-ID')}
              </p>
            )}
            <p className="text-base font-black text-amber-300 sm:text-lg lg:text-xl">
              Rp{finalTotal.toLocaleString('id-ID')}
            </p>
          </div>
        </button>
      </div>
    </section>
  );
}

function CategoryButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-12 w-full flex-col items-center justify-center gap-1 rounded-xl px-2 text-center text-[10px] font-black transition sm:min-h-14 sm:text-xs lg:min-h-16 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-2xl lg:px-4 lg:text-left lg:text-sm ${
        active
          ? 'bg-stone-950 text-white shadow-lg'
          : 'bg-stone-50 text-stone-600'
      }`}
    >
      {icon}
      <span className="line-clamp-2">{label}</span>
    </button>
  );
}
