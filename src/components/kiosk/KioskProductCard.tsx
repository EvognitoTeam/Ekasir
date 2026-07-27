'use client';

import { Plus } from 'lucide-react';
import type { KioskProduct } from './types';

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
      className="group flex min-h-[150px] w-full overflow-hidden rounded-2xl border border-stone-200 bg-white text-left shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[190px] sm:rounded-[1.75rem] lg:min-h-[220px] xl:min-h-[250px]"
    >
      <div className="relative flex w-[38%] shrink-0 items-center justify-center overflow-hidden bg-stone-50 p-3 sm:p-4 lg:w-[42%] lg:p-5">
        <img
          src={product.imageUrl || '/logo.png'}
          alt={product.name}
          className="h-24 w-24 object-contain transition duration-300 group-hover:scale-105 sm:h-32 sm:w-32 lg:h-36 lg:w-36 xl:h-40 xl:w-40"
          onError={(event) => {
            event.currentTarget.src = '/logo.png';
          }}
        />

        {unavailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-950/65 text-xs font-black uppercase tracking-widest text-white sm:text-sm lg:text-base">
            Habis
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center p-4 sm:p-5 lg:p-6">
        <p className="line-clamp-2 text-base font-black leading-tight text-stone-950 sm:text-lg lg:text-xl xl:text-2xl">
          {product.name}
        </p>

        {product.description && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-stone-500 sm:text-sm lg:mt-3">
            {product.description}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-2 lg:mt-6 lg:gap-4">
          <p className="truncate text-base font-black text-amber-700 sm:text-lg lg:text-xl xl:text-2xl">
            Rp{product.price.toLocaleString('id-ID')}
          </p>

          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-950 text-white sm:h-11 sm:w-11 lg:h-12 lg:w-12 lg:rounded-2xl">
            <Plus className="h-5 w-5 lg:h-6 lg:w-6" />
          </span>
        </div>
      </div>
    </button>
  );
}
