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
    <section className="min-h-[100dvh] bg-[#f5f1e8] pb-[96px] sm:pb-[112px]">
      <header className="sticky top-0 z-40 border-b-2 border-[#171717] bg-[#f5f1e8]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1680px] items-center justify-between px-3 py-3 sm:px-5 sm:py-4 lg:px-7">
          <button
            type="button"
            onClick={onBack}
            className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[#171717] bg-white shadow-[3px_3px_0_#171717] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none sm:h-12 sm:w-12"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#ff5c35] sm:text-[11px]">
              Pilih favoritmu
            </p>
            <h1 className="mt-0.5 text-xl font-black tracking-[-0.035em] sm:text-2xl lg:text-3xl">
              Menu hari ini
            </h1>
          </div>

          <div className="w-11 sm:w-12" />
        </div>
      </header>

      <div className="mx-auto flex max-w-[1680px] min-w-0">
        <aside className="sticky top-[69px] h-[calc(100dvh-69px-96px)] w-[102px] shrink-0 overflow-y-auto border-r-2 border-[#171717] bg-white p-2 sm:top-[77px] sm:h-[calc(100dvh-77px-112px)] sm:w-[150px] sm:p-3 lg:w-[205px] lg:p-4">
          <p className="hidden px-2 pb-3 text-[11px] font-black uppercase tracking-[0.2em] text-neutral-400 lg:block">
            Kategori
          </p>

          <div className="space-y-2">
            <CategoryButton
              active={activeCategoryId === null}
              label="Semua"
              icon={<Grid2X2 className="h-4 w-4" />}
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

        <main className="min-w-0 flex-1 p-3 sm:p-4 lg:p-5 xl:p-6">
          <KioskPromoBanner
            promos={promos}
            appliedPromo={appliedPromo}
            discountAmount={discountAmount}
            onOpen={onOpenPromos}
          />

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {products.map((product) => (
              <KioskProductCard
                key={product.id}
                product={product}
                onClick={onProductClick}
              />
            ))}
          </div>

          {products.length === 0 && (
            <div className="mt-4 flex min-h-[320px] items-center justify-center rounded-[1.75rem] border-2 border-dashed border-[#171717] bg-white px-4 text-center shadow-[4px_4px_0_#171717]">
              <div>
                <p className="text-2xl font-black">Menu belum tersedia</p>
                <p className="mt-2 text-sm font-semibold text-neutral-500">
                  Coba pilih kategori lainnya.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-[1680px] -translate-x-1/2 border-t-2 border-[#171717] bg-[#f5f1e8]/98 p-3 backdrop-blur sm:p-4">
        <button
          type="button"
          disabled={cartQuantity === 0}
          onClick={onOpenCart}
          className="flex min-h-16 w-full items-center justify-between rounded-[1.35rem] border-2 border-[#171717] bg-[#171717] px-4 text-white shadow-[4px_4px_0_#ff5c35] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:bg-neutral-400 disabled:shadow-none sm:min-h-[72px] sm:px-5"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c8ff3d] text-[#171717]">
              <ShoppingCart className="h-5 w-5" />
            </span>
            <span className="text-sm font-black sm:text-lg">
              Keranjang ({cartQuantity})
            </span>
          </div>

          <div className="text-right">
            {discountAmount > 0 && (
              <p className="text-[10px] font-bold text-white/45 line-through sm:text-xs">
                Rp{cartTotal.toLocaleString('id-ID')}
              </p>
            )}
            <p className="text-base font-black text-[#c8ff3d] sm:text-xl">
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
      className={`flex min-h-12 w-full flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 text-center text-[10px] font-black transition sm:min-h-13 sm:text-xs lg:min-h-14 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-left lg:text-sm ${
        active
          ? 'border-[#171717] bg-[#c8ff3d] shadow-[3px_3px_0_#171717]'
          : 'border-transparent bg-white text-neutral-700 hover:border-[#171717]/25 hover:bg-[#f5f1e8]'
      }`}
    >
      {icon}
      <span className="line-clamp-2">{label}</span>
    </button>
  );
}
