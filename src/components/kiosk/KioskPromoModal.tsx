'use client';

import {
  BadgePercent,
  CalendarClock,
  Check,
  Loader2,
  LockKeyhole,
  Tag,
  TicketPercent,
  X,
} from 'lucide-react';

import type { KioskPromo } from './types';

type Props = {
  open: boolean;
  promos: KioskPromo[];
  appliedPromoId: number | null;
  applyingPromoId: number | null;
  errorMessage: string | null;
  onApply: (promo: KioskPromo) => void;
  onRemove: () => void;
  onClose: () => void;
};

function formatDiscount(promo: KioskPromo) {
  if (promo.discountRate > 0) {
    return `${promo.discountRate}%`;
  }

  if (promo.discountPrice > 0) {
    return `Rp${promo.discountPrice.toLocaleString('id-ID')}`;
  }

  return 'Promo';
}

function formatExpiry(value: string | null) {
  if (!value) return 'Tanpa batas tanggal';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Periode promo aktif';
  }

  return `Sampai ${date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}`;
}

export default function KioskPromoModal({
  open,
  promos,
  appliedPromoId,
  applyingPromoId,
  errorMessage,
  onApply,
  onRemove,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[180] flex items-end justify-center bg-stone-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4 lg:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Promo yang tersedia"
    >
      <div className="flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[2rem] bg-stone-100 shadow-2xl sm:max-h-[90dvh] sm:rounded-[2.5rem]">
        <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-300 text-stone-950 sm:h-14 sm:w-14 sm:rounded-2xl">
              <TicketPercent className="h-6 w-6 sm:h-7 sm:w-7" />
            </span>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 sm:text-xs sm:tracking-[0.24em]">
                Promo mitra
              </p>
              <h2 className="truncate text-xl font-black text-stone-950 sm:mt-1 sm:text-3xl">
                Pilih voucher
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-700 sm:h-14 sm:w-14 sm:rounded-2xl"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </header>

        {errorMessage && (
          <div className="mx-4 mt-4 rounded-xl bg-red-100 px-4 py-3 text-sm font-bold text-red-700 sm:mx-6 lg:mx-8">
            {errorMessage}
          </div>
        )}

        <div className="overflow-y-auto p-4 sm:p-6 lg:p-8">
          {promos.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white text-center sm:min-h-80 sm:rounded-[2rem]">
              <BadgePercent className="h-14 w-14 text-stone-300 sm:h-16 sm:w-16" />
              <h3 className="mt-4 text-xl font-black text-stone-800 sm:mt-5 sm:text-2xl">
                Belum ada promo aktif
              </h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              {promos.map((promo) => {
                const applied = appliedPromoId === promo.id;
                const loading = applyingPromoId === promo.id;

                return (
                  <button
                    key={promo.id}
                    type="button"
                    disabled={applyingPromoId !== null}
                    onClick={() => applied ? onRemove() : onApply(promo)}
                    className={`relative overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition active:scale-[0.99] sm:rounded-[2rem] sm:p-5 lg:p-6 ${
                      applied
                        ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-300'
                        : 'border-amber-200 bg-white hover:border-amber-400'
                    }`}
                  >
                    <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-100 sm:h-28 sm:w-28" />

                    <div className="relative">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700 sm:text-xs sm:tracking-[0.22em]">
                            Klik kode untuk pakai
                          </p>

                          <span className="mt-2 inline-flex max-w-full items-center gap-2 rounded-xl bg-stone-950 px-3 py-2 font-mono text-sm font-black tracking-[0.1em] text-white sm:px-4 sm:text-lg sm:tracking-[0.16em]">
                            <Tag className="h-4 w-4 shrink-0" />
                            <span className="truncate">{promo.couponCode}</span>
                          </span>
                        </div>

                        <span className="shrink-0 rounded-xl bg-amber-300 px-3 py-2 text-lg font-black text-stone-950 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-2xl">
                          {formatDiscount(promo)}
                        </span>
                      </div>

                      <h3 className="mt-5 line-clamp-2 text-lg font-black text-stone-950 sm:mt-6 sm:text-2xl">
                        {promo.title}
                      </h3>

                      {promo.description && (
                        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-stone-500 sm:text-sm">
                          {promo.description}
                        </p>
                      )}

                      <div className="mt-4 space-y-2 border-t border-dashed border-stone-200 pt-4 text-xs font-semibold text-stone-500 sm:mt-5 sm:text-sm">
                        <p className="flex items-center gap-2">
                          <CalendarClock className="h-4 w-4 text-amber-600" />
                          {formatExpiry(promo.expiredDate)}
                        </p>

                        {promo.isMemberOnly && (
                          <p className="flex items-center gap-2 text-violet-700">
                            <LockKeyhole className="h-4 w-4" />
                            Khusus member
                          </p>
                        )}
                      </div>

                      <div className={`mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-black ${
                        applied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-950 text-white'
                      }`}>
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Memvalidasi...
                          </>
                        ) : applied ? (
                          <>
                            <Check className="h-4 w-4" />
                            Digunakan — klik untuk hapus
                          </>
                        ) : (
                          'Gunakan voucher'
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
