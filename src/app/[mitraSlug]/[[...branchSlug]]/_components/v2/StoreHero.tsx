/* eslint-disable @next/next/no-img-element */

import {
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

import type {
  MenuItem,
} from '@/types/menu';
import {
  applyFallbackImage,
  normalizeImageSrc,
} from '@/utils/image';

type StoreHeroProps = {
  item: MenuItem;
  welcome?: string;
  onExplore: (
    item:
      MenuItem,
  ) => void;
};

export default function StoreHero({
  item,
  welcome,
  onExplore,
}: StoreHeroProps) {
  const price = Number(
    item.basePrice || 0,
  );

  return (
    <section className="px-4 pb-4 pt-5">
      <div className="mb-4">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-black/30">
          Today at the table
        </p>

        <h2 className="mt-2 max-w-sm text-3xl font-black leading-[0.98] tracking-[-0.055em]">
          {welcome?.trim() ||
            'Pilih menu. Duduk santai. Kami siapkan.'}
        </h2>
      </div>

      <button
        type="button"
        onClick={() =>
          onExplore(item)
        }
        className="group block w-full overflow-hidden rounded-3xl bg-black text-left text-white active:scale-[0.99]"
      >
        <div className="relative aspect-[1.18/1] overflow-hidden bg-neutral-900 sm:aspect-[4/3]">
          <img
            src={normalizeImageSrc(
              item.image,
            )}
            alt={item.name}
            onError={
              applyFallbackImage
            }
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />

          <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] backdrop-blur-md">
            <Sparkles className="h-3 w-3" />
            Staff pick
          </div>

          <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-2xl font-black leading-none tracking-[-0.045em]">
                {item.name}
              </h3>

              <p className="mt-2 text-xs font-bold text-white/65">
                Rp
                {price.toLocaleString(
                  'id-ID',
                )}
              </p>
            </div>

            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black">
              <ArrowUpRight className="h-5 w-5" />
            </span>
          </div>
        </div>
      </button>
    </section>
  );
}
