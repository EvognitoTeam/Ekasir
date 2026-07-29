'use client';

import {
  ArrowLeft,
  Banknote,
  BadgePercent,
  CheckCircle2,
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
    <section className="min-h-[100dvh] bg-[#f4f1e8] px-4 py-4 text-[#171717] sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-[1280px]">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[#171717] bg-white shadow-[3px_3px_0_#171717] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none sm:h-12 sm:w-12 sm:rounded-2xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <span className="rounded-full bg-[#171717] px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white sm:text-xs">
            Pilih pembayaran
          </span>
        </header>

        <div className="mx-auto mt-5 max-w-3xl text-center sm:mt-7 lg:mt-8">
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#ff5c35] sm:text-xs">
            Langkah terakhir
          </p>

          <h1 className="mt-2 text-[clamp(2.25rem,5vw,4.5rem)] font-black leading-[0.95] tracking-[-0.055em]">
            Pilih cara bayar
          </h1>
        </div>

        <div className="mx-auto mt-5 grid max-w-5xl gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:gap-5">
          <section className="rounded-[1.5rem] border-2 border-[#171717] bg-white p-4 shadow-[5px_5px_0_#171717] sm:p-5 lg:rounded-[1.75rem] lg:p-6">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-400 sm:text-sm">
                Ringkasan pesanan
              </p>

              {appliedPromo && (
                <span className="inline-flex items-center gap-2 rounded-full bg-[#e8ffd0] px-3 py-1.5 text-xs font-black text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Voucher aktif
                </span>
              )}
            </div>

            <div className="mt-4 space-y-3 text-sm sm:text-base">
              <div className="flex items-center justify-between gap-4">
                <span className="font-semibold text-neutral-500">
                  Subtotal
                </span>
                <span className="font-black">
                  Rp{subtotal.toLocaleString('id-ID')}
                </span>
              </div>

              {discountAmount > 0 && (
                <div className="flex items-center justify-between gap-4 text-emerald-700">
                  <span className="flex min-w-0 items-center gap-2 font-black">
                    <BadgePercent className="h-5 w-5 shrink-0" />
                    <span className="truncate">
                      Diskon
                      {appliedPromo
                        ? ` • ${appliedPromo.couponCode}`
                        : ''}
                    </span>
                  </span>

                  <span className="shrink-0 font-black">
                    - Rp{discountAmount.toLocaleString('id-ID')}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 border-t-2 border-dashed border-[#171717]/20 pt-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-400">
                Total pembayaran
              </p>

              <p className="mt-1 text-[clamp(2.3rem,6vw,4.5rem)] font-black leading-none tracking-[-0.055em]">
                Rp{grandTotal.toLocaleString('id-ID')}
              </p>
            </div>
          </section>

          {showMemberVoucher ? (
            <button
              type="button"
              onClick={onOpenMemberVouchers}
              className="group flex min-h-[150px] items-center justify-between gap-4 rounded-[1.5rem] border-2 border-[#171717] bg-[#e8dcff] p-4 text-left shadow-[5px_5px_0_#171717] transition hover:-translate-y-1 hover:shadow-[8px_8px_0_#171717] sm:p-5 lg:min-h-full lg:rounded-[1.75rem] lg:p-6"
            >
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-[#171717] bg-white sm:h-16 sm:w-16">
                  <TicketPercent className="h-7 w-7 text-violet-700 sm:h-8 sm:w-8" />
                </span>

                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-700 sm:text-xs">
                    Voucher member
                  </p>

                  <p className="mt-1 line-clamp-2 text-lg font-black leading-tight sm:text-xl">
                    {appliedPromo?.isMemberOnly
                      ? appliedPromo.title
                      : memberPromoCount > 0
                        ? `${memberPromoCount} voucher tersedia`
                        : 'Belum ada voucher member'}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-neutral-600 sm:text-sm">
                    {appliedPromo?.isMemberOnly
                      ? `Kode ${appliedPromo.couponCode} digunakan`
                      : 'Sentuh untuk melihat promo khusus member'}
                  </p>
                </div>
              </div>

              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#171717] text-white transition group-hover:rotate-6">
                <TicketPercent className="h-5 w-5" />
              </span>
            </button>
          ) : (
            <div className="hidden rounded-[1.75rem] border-2 border-dashed border-[#171717]/20 bg-white/50 lg:block" />
          )}
        </div>

        <div className="mx-auto mt-5 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-6 lg:gap-5">
          <PaymentCard
            title="QRIS"
            description="Scan dari aplikasi bank atau e-wallet."
            accentClass="bg-[#c8ff3d]"
            icon={<QrCode className="h-9 w-9 sm:h-10 sm:w-10 lg:h-11 lg:w-11" />}
            onClick={() => onSelect('qris')}
          />

          <PaymentCard
            title="Bayar di kasir"
            description="Selesaikan pembayaran tunai di kasir."
            accentClass="bg-[#ffd8cf]"
            icon={<Banknote className="h-9 w-9 sm:h-10 sm:w-10 lg:h-11 lg:w-11" />}
            onClick={() => onSelect('cash')}
          />
        </div>
      </div>
    </section>
  );
}

function PaymentCard({
  title,
  description,
  icon,
  accentClass,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  accentClass: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative min-h-[180px] overflow-hidden rounded-[1.75rem] border-[3px] border-[#171717] p-5 text-left shadow-[6px_6px_0_#171717] transition hover:-translate-y-1 hover:shadow-[9px_9px_0_#171717] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none sm:min-h-[220px] sm:p-6 lg:min-h-[240px] ${accentClass}`}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] border-2 border-[#171717] bg-white sm:h-[72px] sm:w-[72px]">
        {icon}
      </div>

      <h2 className="mt-5 max-w-[80%] text-2xl font-black leading-[0.95] tracking-[-0.04em] sm:text-3xl lg:text-4xl">
        {title}
      </h2>

      <p className="mt-3 max-w-sm text-sm font-semibold leading-relaxed text-neutral-700 sm:text-base">
        {description}
      </p>

      <span className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#171717] text-white transition group-hover:translate-x-1 sm:bottom-5 sm:right-5 sm:h-12 sm:w-12">
        <ArrowLeft className="h-5 w-5 rotate-180" />
      </span>
    </button>
  );
}