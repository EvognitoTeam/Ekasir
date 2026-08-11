/* eslint-disable @next/next/no-img-element */
import { ArrowRight, Sparkles } from 'lucide-react';

import type { MenuItem } from '@/types/menu';
import { applyFallbackImage, normalizeImageSrc } from '@/utils/image';

interface Props {
  item: MenuItem;
  onExplore: (item: MenuItem) => void;
}

export default function FeaturedHero({ item, onExplore }: Props) {
  const price = Number(item.basePrice || 0);

  return (
    <section className="bg-white px-4 pb-2 pt-4 sm:px-6">
      <button
        type="button"
        onClick={() => onExplore(item)}
        className="group relative block min-h-0 w-full overflow-hidden rounded-[24px] border border-stone-200 bg-white text-left shadow-[0_12px_32px_rgba(28,28,25,0.08)] active:scale-[0.985]"
      >
        <div className="relative h-48 w-full overflow-hidden bg-stone-100 sm:h-52">
          <img
            src={normalizeImageSrc(item.image)}
            alt={item.name}
            onError={applyFallbackImage}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

          <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full border border-white/30 bg-white/90 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-stone-800 backdrop-blur">
            <Sparkles className="h-3 w-3 text-[var(--color-primary)]" />
            Pilihan utama
          </div>

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white">
            <div className="min-w-0">
              <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-white/65">
                Rekomendasi hari ini
              </p>
              <h2 className="truncate font-display text-2xl font-bold leading-tight">
                {item.name}
              </h2>
              <p className="mt-1 text-sm font-semibold text-white/85">
                Rp{price.toLocaleString('id-ID')}
              </p>
            </div>

            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[var(--color-primary)] shadow-lg">
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </button>
    </section>
  );
}
