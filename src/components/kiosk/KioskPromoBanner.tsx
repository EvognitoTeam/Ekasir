'use client';

import {
  BadgePercent,
  CheckCircle2,
  ChevronRight,
  TicketPercent,
} from 'lucide-react';

import type { KioskPromo } from './types';

type Props = {
  promos: KioskPromo[];
  appliedPromo: KioskPromo | null;
  discountAmount: number;
  onOpen: () => void;
};

export default function KioskPromoBanner({
  promos,
  appliedPromo,
  discountAmount,
  onOpen,
}: Props) {
  const featured = appliedPromo ?? promos[0];

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-20 w-full items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-amber-300 to-orange-300 px-4 text-left text-stone-950 shadow-lg shadow-amber-200/50 sm:min-h-24 sm:gap-5 sm:rounded-[1.75rem] sm:px-6 lg:px-7"
    >
      <div className="flex min-w-0 items-center gap-3 sm:gap-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stone-950 text-white sm:h-14 sm:w-14 sm:rounded-2xl">
          {appliedPromo ? (
            <CheckCircle2 className="h-6 w-6 sm:h-7 sm:w-7" />
          ) : (
            <TicketPercent className="h-6 w-6 sm:h-7 sm:w-7" />
          )}
        </span>

        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-700 sm:text-xs sm:tracking-[0.22em]">
            {appliedPromo ? 'Voucher digunakan' : 'Voucher & promo'}
          </p>

          <p className="mt-0.5 truncate text-base font-black sm:mt-1 sm:text-xl lg:text-2xl">
            {featured ? featured.title : 'Belum ada promo aktif'}
          </p>

          <p className="mt-0.5 truncate text-xs font-semibold text-stone-700 sm:mt-1 sm:text-sm">
            {appliedPromo
              ? `Hemat Rp${discountAmount.toLocaleString('id-ID')}`
              : promos.length > 0
                ? `${promos.length} promo tersedia — sentuh untuk melihat`
                : 'Promo mitra akan tampil di sini'}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {promos.length > 0 && !appliedPromo && (
          <span className="hidden items-center gap-2 rounded-full bg-white/60 px-3 py-2 text-xs font-black sm:flex sm:text-sm">
            <BadgePercent className="h-4 w-4" />
            {promos.length}
          </span>
        )}

        <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" />
      </div>
    </button>
  );
}
