'use client';

import {
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  TicketPercent,
} from 'lucide-react';

import type {
  KioskPromo,
} from './types';

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
      className="group flex min-h-[82px] w-full items-center justify-between gap-3 rounded-[1.5rem] border-2 border-[#171717] bg-[#ff5c35] px-4 text-left text-white shadow-[4px_4px_0_#171717] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#171717] sm:min-h-[92px] sm:px-5 lg:px-6"
    >
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#171717] bg-[#c8ff3d] text-[#171717] sm:h-13 sm:w-13">
          {appliedPromo ? (
            <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
          ) : (
            <TicketPercent className="h-5 w-5 sm:h-6 sm:w-6" />
          )}
        </span>

        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70 sm:text-xs">
            {appliedPromo ? 'Voucher aktif' : 'Promo hari ini'}
          </p>
          <p className="mt-0.5 truncate text-base font-black sm:text-xl">
            {featured ? featured.title : 'Belum ada promo aktif'}
          </p>
          <p className="mt-0.5 truncate text-xs font-semibold text-white/78 sm:text-sm">
            {appliedPromo
              ? `Hemat Rp${discountAmount.toLocaleString('id-ID')}`
              : promos.length > 0
                ? `${promos.length} promo tersedia`
                : 'Promo mitra akan tampil di sini'}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {promos.length > 0 && !appliedPromo && (
          <span className="hidden items-center gap-1 rounded-full border-2 border-[#171717] bg-white px-3 py-2 text-xs font-black text-[#171717] sm:flex">
            <BadgePercent className="h-4 w-4" />
            {promos.length}
          </span>
        )}

        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#171717] transition group-hover:translate-x-0.5 sm:h-11 sm:w-11">
          <ArrowRight className="h-5 w-5" />
        </span>
      </div>
    </button>
  );
}
