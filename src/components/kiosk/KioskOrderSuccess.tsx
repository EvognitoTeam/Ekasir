'use client';

import { Check, Home } from 'lucide-react';
import type { KioskPaymentMethod } from './types';

type Props = {
  orderCode: string;
  paymentMethod: KioskPaymentMethod;
  onFinish: () => void;
};

export default function KioskOrderSuccess({ orderCode, paymentMethod, onFinish }: Props) {
  return (
    <section className="flex min-h-screen flex-col bg-emerald-600 px-10 py-12 text-white">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="flex h-36 w-36 items-center justify-center rounded-full bg-white text-emerald-600"><Check className="h-20 w-20" strokeWidth={3} /></div>
        <p className="mt-10 text-sm font-bold uppercase tracking-[0.32em] text-emerald-100">Pesanan berhasil</p>
        <h1 className="mt-5 text-6xl font-black">Terima kasih!</h1>
        <div className="mt-10 rounded-[2rem] bg-white/15 px-10 py-8">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-100">Nomor pesanan</p>
          <p className="mt-2 text-7xl font-black tracking-[0.08em]">{orderCode}</p>
        </div>
        <p className="mt-8 text-xl">{paymentMethod === 'cash' ? 'Silakan bayar di kasir.' : 'Pembayaran diterima. Pesanan sedang diproses.'}</p>
      </div>

      <button type="button" onClick={onFinish} className="flex min-h-20 w-full items-center justify-center gap-3 rounded-[1.5rem] bg-white text-2xl font-black text-emerald-700">
        <Home className="h-7 w-7" />Selesai
      </button>
    </section>
  );
}
