'use client';

import { useEffect } from 'react';
import { Loader2, RefreshCw, X } from 'lucide-react';
import type { KioskQrisData } from './types';

type Props = {
  qris: KioskQrisData | null;
  grandTotal: number;
  paymentStatus: 'pending' | 'paid' | 'expired' | 'failed';
  onCancel: () => void;
  onRetry: () => void;
  onPoll: () => void;
};

export default function KioskQrisPayment({ qris, grandTotal, paymentStatus, onCancel, onRetry, onPoll }: Props) {
  useEffect(() => {
    if (paymentStatus !== 'pending') return;
    const timer = window.setInterval(onPoll, 4000);
    return () => window.clearInterval(timer);
  }, [onPoll, paymentStatus]);

  return (
    <section className="flex min-h-screen flex-col bg-stone-950 px-8 py-10 text-white">
      <button type="button" onClick={onCancel} className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10"><X className="h-6 w-6" /></button>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-amber-300">Scan untuk membayar</p>
        <h1 className="mt-4 text-5xl font-black">Rp{grandTotal.toLocaleString('id-ID')}</h1>

        <div className="mt-10 flex min-h-[520px] min-w-[520px] items-center justify-center rounded-[2.5rem] bg-white p-8">
          {qris?.qrUrl ? (
            <img src={qris.qrUrl} alt="QRIS" className="h-[440px] w-[440px] object-contain" />
          ) : (
            <Loader2 className="h-16 w-16 animate-spin text-stone-400" />
          )}
        </div>

        {paymentStatus === 'pending' && <div className="mt-8 flex items-center gap-3 text-lg text-stone-300"><Loader2 className="h-5 w-5 animate-spin text-amber-300" />Menunggu pembayaran...</div>}
        {paymentStatus === 'expired' && <button type="button" onClick={onRetry} className="mt-8 flex min-h-16 items-center gap-3 rounded-2xl bg-amber-300 px-8 text-xl font-black text-stone-950"><RefreshCw className="h-6 w-6" />Buat QR Baru</button>}
      </div>
    </section>
  );
}
