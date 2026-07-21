/* eslint-disable @next/next/no-img-element */
import { AlertCircle, Plus } from 'lucide-react';

import type { MenuItem } from '@/types/menu';
import { applyFallbackImage, normalizeImageSrc } from '@/utils/image';

interface Props {
  item: MenuItem;
  onClick: (item: MenuItem) => void;
}

function isEnabled(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

export default function ProductCard({ item, onClick }: Props) {
  const stock = item.stock === null || item.stock === undefined
    ? null
    : Number(item.stock);
  const available = isEnabled(item.status) || Boolean(item.isAvailable);
  const soldOut = !available || (stock !== null && stock <= 0);
  const lowStock = stock !== null && stock > 0 && stock <= 5;
  const price = Number(item.basePrice || 0);

  const activate = () => {
    if (!soldOut) onClick(item);
  };

  return (
    <div
      role="button"
      tabIndex={soldOut ? -1 : 0}
      aria-disabled={soldOut}
      aria-label={`${item.name}, Rp${price.toLocaleString('id-ID')}${soldOut ? ', habis' : ''}`}
      onClick={activate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      }}
      className={`group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300 ${
        soldOut
          ? 'cursor-not-allowed opacity-55 grayscale'
          : 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]'
      }`}
    >
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-stone-100">
        <img
          src={normalizeImageSrc(item.image)}
          alt={item.name}
          onError={applyFallbackImage}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {lowStock && !soldOut && (
          <div className="absolute left-2 top-2 z-20 flex items-center gap-1 rounded-full bg-rose-500 px-2 py-1 text-white shadow-sm">
            <AlertCircle className="h-2.5 w-2.5" />
            <span className="text-[9px] font-black uppercase tracking-wider leading-none">
              Sisa {stock}
            </span>
          </div>
        )}

        {soldOut && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/55 backdrop-blur-[2px]">
            <span className="rounded-full bg-stone-900/90 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-white">
              Habis
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-3">
        <div>
          <h3 className="mb-1 line-clamp-2 min-h-[38px] text-[13px] font-bold leading-snug text-stone-900">
            {item.name}
          </h3>

          {item.description && (
            <div
              className="mb-2 line-clamp-2 text-[11px] leading-relaxed text-stone-500 [&_*]:inline"
              dangerouslySetInnerHTML={{ __html: item.description }}
            />
          )}

          <p className="text-[13px] font-bold text-[var(--color-primary)]">
            Rp{price.toLocaleString('id-ID')}
          </p>
        </div>

        <div
          aria-hidden="true"
          className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold uppercase tracking-wide ${
            soldOut
              ? 'bg-stone-100 text-stone-400'
              : 'bg-[var(--color-primary)] text-white shadow-sm'
          }`}
        >
          {!soldOut && <Plus className="h-3.5 w-3.5" strokeWidth={3} />}
          <span>{soldOut ? 'Tidak tersedia' : 'Tambah'}</span>
        </div>
      </div>
    </div>
  );
}
