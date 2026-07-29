'use client';

import {
  Check,
  Home,
  Sparkles,
} from 'lucide-react';

import type {
  KioskPaymentMethod,
} from './types';

type Props = {
  orderCode: string;
  paymentMethod: KioskPaymentMethod;
  onFinish: () => void;
};

export default function KioskOrderSuccess({
  orderCode,
  paymentMethod,
  onFinish,
}: Props) {
  return (
    <section className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#c8ff3d] p-4 text-[#171717] sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/60 blur-3xl" />
      <div className="relative mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col rounded-[2.5rem] border-[3px] border-[#171717] bg-white p-5 shadow-[10px_10px_0_#171717] sm:min-h-[calc(100dvh-3rem)] sm:p-8">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] border-[3px] border-[#171717] bg-[#c8ff3d] shadow-[7px_7px_0_#171717] sm:h-36 sm:w-36">
            <Check className="h-16 w-16 sm:h-20 sm:w-20" strokeWidth={3} />
            <Sparkles className="absolute -right-5 -top-5 h-9 w-9 text-[#ff5c35]" />
          </div>

          <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-[#ff5c35]">
            Pesanan berhasil
          </p>
          <h1 className="mt-3 text-[clamp(3rem,8vw,6rem)] font-black leading-[0.9] tracking-[-0.06em]">
            Terima kasih!
          </h1>

          <div className="mt-8 rounded-[2rem] border-[3px] border-[#171717] bg-[#171717] px-8 py-6 text-white shadow-[7px_7px_0_#ff5c35] sm:px-12 sm:py-8">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55 sm:text-xs">
              Nomor pesanan
            </p>
            <p className="mt-2 text-[clamp(3rem,10vw,6.5rem)] font-black tracking-[0.08em] text-[#c8ff3d]">
              {orderCode}
            </p>
          </div>

          <p className="mt-8 max-w-2xl text-base font-semibold text-neutral-600 sm:text-xl">
            {paymentMethod === 'cash'
              ? 'Silakan lanjutkan pembayaran di kasir.'
              : 'Pembayaran diterima. Pesanan sedang disiapkan.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onFinish}
          className="flex min-h-16 w-full items-center justify-center gap-3 rounded-[1.5rem] border-[3px] border-[#171717] bg-[#ff5c35] text-lg font-black text-white shadow-[5px_5px_0_#171717] sm:min-h-20 sm:text-2xl"
        >
          <Home className="h-6 w-6" />
          Selesai
        </button>
      </div>
    </section>
  );
}
