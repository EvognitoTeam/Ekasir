'use client';

import {
  useEffect,
} from 'react';

import {
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';

import type {
  KioskQrisData,
} from './types';

type Props = {
  qris: KioskQrisData | null;
  grandTotal: number;
  paymentStatus: 'pending' | 'paid' | 'expired' | 'failed';
  onCancel: () => void;
  onRetry: () => void;
  onPoll: () => void;
};

export default function KioskQrisPayment({
  qris,
  grandTotal,
  paymentStatus,
  onCancel,
  onRetry,
  onPoll,
}: Props) {
  useEffect(() => {
    if (paymentStatus !== 'pending') {
      return;
    }

    const timer =
      window.setInterval(
        onPoll,
        4000,
      );

    return () =>
      window.clearInterval(
        timer,
      );
  }, [
    onPoll,
    paymentStatus,
  ]);

  return (
    <section className="min-h-[100dvh] bg-[#171717] p-4 text-white sm:p-6 lg:p-8">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-6xl flex-col sm:min-h-[calc(100dvh-3rem)]">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-white bg-white text-[#171717] shadow-[3px_3px_0_#c8ff3d]"
          >
            <X className="h-5 w-5" />
          </button>

          <span className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em]">
            <ShieldCheck className="h-4 w-4 text-[#c8ff3d]" />
            Pembayaran aman
          </span>
        </header>

        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c8ff3d]">
              Scan untuk membayar
            </p>
            <h1 className="mt-3 text-[clamp(2.8rem,7vw,6rem)] font-black leading-[0.9] tracking-[-0.06em]">
              Rp{grandTotal.toLocaleString('id-ID')}
            </h1>
            <p className="mt-5 max-w-lg text-base font-medium leading-relaxed text-white/60 sm:text-xl">
              Buka aplikasi bank atau e-wallet, lalu arahkan kamera ke kode QR.
            </p>

            {paymentStatus === 'pending' && (
              <div className="mt-7 inline-flex items-center gap-3 rounded-2xl border-2 border-white bg-[#c8ff3d] px-4 py-3 font-black text-[#171717] shadow-[4px_4px_0_#ff5c35]">
                <Loader2 className="h-5 w-5 animate-spin" />
                Menunggu pembayaran
              </div>
            )}

            {paymentStatus === 'expired' && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-7 flex min-h-14 items-center gap-3 rounded-2xl border-2 border-white bg-[#ff5c35] px-5 font-black shadow-[4px_4px_0_#c8ff3d]"
              >
                <RefreshCw className="h-5 w-5" />
                Buat QR baru
              </button>
            )}
          </div>

          <div className="mx-auto w-full max-w-[560px]">
            <div className="rotate-1 rounded-[2.5rem] border-[3px] border-white bg-white p-5 shadow-[14px_14px_0_#c8ff3d] sm:p-8">
              <div className="flex aspect-square items-center justify-center rounded-[1.75rem] bg-[#f4f1e8] p-4">
                {qris?.qrUrl ? (
                  <img
                    src={qris.qrUrl}
                    alt="QRIS"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Loader2 className="h-16 w-16 animate-spin text-neutral-400" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
