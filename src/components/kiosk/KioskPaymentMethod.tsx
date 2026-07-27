'use client';

import {
  ArrowLeft,
  Banknote,
  BadgePercent,
  CheckCircle2,
  ChevronRight,
  QrCode,
  TicketPercent,
} from 'lucide-react';

import type {
  KioskPaymentMethod as Method,
  KioskPromo,
} from './types';

type Props = {
  subtotal: number;
  grandTotal: number;
  discountAmount: number;
  appliedPromo: KioskPromo | null;
  memberPromoCount: number;
  showMemberVoucher: boolean;
  onOpenMemberVouchers: () => void;
  onBack: () => void;
  onSelect: (method: Method) => void;
};

export default function KioskPaymentMethod({
  subtotal,
  grandTotal,
  discountAmount,
  appliedPromo,
  memberPromoCount,
  showMemberVoucher,
  onOpenMemberVouchers,
  onBack,
  onSelect,
}: Props) {
  return (
    <section className="min-h-[100dvh] bg-stone-100 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm sm:h-12 sm:w-12 lg:h-14 lg:w-14 lg:rounded-2xl"
        >
          <ArrowLeft className="h-5 w-5 lg:h-6 lg:w-6" />
        </button>

        <div className="mx-auto mt-5 max-w-3xl text-center sm:mt-8 lg:mt-10">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-600 sm:text-sm sm:tracking-[0.3em]">
            Pembayaran
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-stone-950 sm:text-4xl lg:mt-4 lg:text-5xl">
            Pilih metode bayar
          </h1>
        </div>

        {showMemberVoucher && (
          <button
            type="button"
            onClick={
              onOpenMemberVouchers
            }
            className="mx-auto mt-6 flex min-h-20 w-full max-w-4xl items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-100 to-fuchsia-100 px-4 text-left shadow-sm transition active:scale-[0.99] sm:min-h-24 sm:gap-5 sm:rounded-[1.75rem] sm:px-6 lg:mt-8 lg:px-7"
          >
            <div className="flex min-w-0 items-center gap-3 sm:gap-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-700 text-white sm:h-14 sm:w-14 sm:rounded-2xl">
                {appliedPromo?.isMemberOnly ? (
                  <CheckCircle2 className="h-6 w-6 sm:h-7 sm:w-7" />
                ) : (
                  <TicketPercent className="h-6 w-6 sm:h-7 sm:w-7" />
                )}
              </span>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-700 sm:text-xs sm:tracking-[0.22em]">
                  Voucher khusus member
                </p>

                <p className="mt-0.5 truncate text-base font-black text-stone-950 sm:mt-1 sm:text-xl lg:text-2xl">
                  {appliedPromo?.isMemberOnly
                    ? appliedPromo.title
                    : memberPromoCount > 0
                      ? `${memberPromoCount} voucher member tersedia`
                      : 'Belum ada voucher member'}
                </p>

                <p className="mt-0.5 truncate text-xs font-semibold text-stone-600 sm:mt-1 sm:text-sm">
                  {appliedPromo?.isMemberOnly
                    ? `Voucher ${appliedPromo.couponCode} sedang digunakan`
                    : memberPromoCount > 0
                      ? 'Sentuh untuk memilih dan langsung menggunakan'
                      : 'Promo member akan tampil di sini'}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {memberPromoCount > 0 &&
                !appliedPromo?.isMemberOnly && (
                  <span className="hidden items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-xs font-black text-violet-700 sm:flex sm:text-sm">
                    <BadgePercent className="h-4 w-4" />
                    {memberPromoCount}
                  </span>
                )}

              <ChevronRight className="h-6 w-6 text-violet-700 sm:h-7 sm:w-7" />
            </div>
          </button>
        )}

        <div className="mx-auto mt-5 w-full max-w-4xl rounded-2xl bg-white p-5 shadow-sm sm:mt-6 sm:p-6 lg:rounded-[1.75rem] lg:p-7">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-bold uppercase tracking-widest text-stone-400">
              Subtotal
            </p>

            <p className="text-base font-black text-stone-700 sm:text-lg">
              Rp{subtotal.toLocaleString('id-ID')}
            </p>
          </div>

          {discountAmount > 0 && (
            <div className="mt-3 flex items-center justify-between gap-4 text-emerald-700">
              <div className="flex min-w-0 items-center gap-2">
                <BadgePercent className="h-5 w-5 shrink-0" />

                <p className="truncate text-sm font-black sm:text-base">
                  Diskon
                  {appliedPromo
                    ? ` • ${appliedPromo.couponCode}`
                    : ''}
                </p>
              </div>

              <p className="shrink-0 text-base font-black sm:text-lg">
                - Rp{discountAmount.toLocaleString('id-ID')}
              </p>
            </div>
          )}

          <div className="mt-4 border-t border-dashed border-stone-200 pt-4">
            <div className="flex items-end justify-between gap-4">
              <p className="text-sm font-black uppercase tracking-widest text-stone-500">
                Total pembayaran
              </p>

              <p className="text-3xl font-black tracking-[-0.04em] text-stone-950 sm:text-4xl lg:text-5xl">
                Rp{grandTotal.toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-6 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:mt-8 lg:gap-6">
          <button
            type="button"
            onClick={() =>
              onSelect('qris')
            }
            className="flex min-h-[220px] flex-col items-center justify-center rounded-[1.75rem] border border-stone-200 bg-white p-6 text-center shadow-lg transition active:scale-[0.99] sm:min-h-[270px] lg:min-h-[320px] lg:rounded-[2.5rem] lg:p-8"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-stone-950 text-white sm:h-24 sm:w-24 lg:h-28 lg:w-28 lg:rounded-[2rem]">
              <QrCode className="h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14" />
            </div>

            <h2 className="mt-5 text-2xl font-black text-stone-950 sm:text-3xl lg:mt-7 lg:text-4xl">
              QRIS
            </h2>

            <p className="mt-3 max-w-sm text-sm leading-relaxed text-stone-500 sm:text-base lg:mt-4 lg:text-lg">
              Bayar dengan aplikasi bank atau e-wallet.
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              onSelect('cash')
            }
            className="flex min-h-[220px] flex-col items-center justify-center rounded-[1.75rem] border border-stone-200 bg-white p-6 text-center shadow-lg transition active:scale-[0.99] sm:min-h-[270px] lg:min-h-[320px] lg:rounded-[2.5rem] lg:p-8"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-stone-950 text-white sm:h-24 sm:w-24 lg:h-28 lg:w-28 lg:rounded-[2rem]">
              <Banknote className="h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14" />
            </div>

            <h2 className="mt-5 text-2xl font-black text-stone-950 sm:text-3xl lg:mt-7 lg:text-4xl">
              Bayar di Kasir
            </h2>

            <p className="mt-3 max-w-sm text-sm leading-relaxed text-stone-500 sm:text-base lg:mt-4 lg:text-lg">
              Selesaikan pembayaran tunai di kasir.
            </p>
          </button>
        </div>
      </div>
    </section>
  );
}
