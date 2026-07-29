'use client';

import {
  Plus,
} from 'lucide-react';

import type {
  KioskProduct,
} from './types';

type Props = {
  product: KioskProduct;
  onClick: (product: KioskProduct) => void;
};

export default function KioskProductCard({
  product,
  onClick,
}: Props) {
  const unavailable =
    product.isAvailable === false ||
    (
      product.stock !== null &&
      product.stock !== undefined &&
      product.stock <= 0
    );

  return (
    <button
      type="button"
      disabled={unavailable}
      onClick={() => onClick(product)}
      className="group grid min-h-[176px] w-full grid-cols-[128px_minmax(0,1fr)] overflow-hidden rounded-[1.5rem] border-2 border-[#171717] bg-white text-left shadow-[4px_4px_0_#171717] transition hover:-translate-y-1 hover:shadow-[7px_7px_0_#171717] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[190px] sm:grid-cols-[145px_minmax(0,1fr)] lg:min-h-[205px] lg:grid-cols-[155px_minmax(0,1fr)]"
    >
      <div className="relative flex items-center justify-center overflow-hidden border-r-2 border-[#171717]/15 bg-[#f5f1e8] p-3 sm:p-4">
        <span className="absolute left-2.5 top-2.5 rounded-full border border-[#171717] bg-[#c8ff3d] px-2 py-1 text-[9px] font-black uppercase tracking-wider">
          Menu
        </span>

        <img
          src={product.imageUrl || '/logo.png'}
          alt={product.name}
          className="h-24 w-24 object-contain transition duration-300 group-hover:scale-105 sm:h-28 sm:w-28 lg:h-32 lg:w-32"
          onError={(event) => {
            event.currentTarget.src = '/logo.png';
          }}
        />

        {unavailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#171717]/76 text-sm font-black uppercase tracking-[0.2em] text-white">
            Habis
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col p-4 sm:p-5">
        <div>
          <h3 className="line-clamp-2 text-lg font-black leading-[1.08] tracking-[-0.03em] text-[#171717] sm:text-xl lg:text-2xl">
            {product.name}
          </h3>

          {product.description && (
            <p className="mt-2 line-clamp-2 text-xs font-medium leading-relaxed text-neutral-500 sm:text-sm">
              {product.description}
            </p>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <p className="truncate text-lg font-black text-[#ff5c35] sm:text-xl lg:text-2xl">
            Rp{product.price.toLocaleString('id-ID')}
          </p>

          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#171717] text-white transition group-hover:rotate-6 sm:h-11 sm:w-11">
            <Plus className="h-5 w-5" />
          </span>
        </div>
      </div>
    </button>
  );
}
