'use client';

import { ArrowLeft, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import type { KioskServiceType as ServiceType } from './types';

type Props = {
  onSelect: (value: ServiceType) => void;
  onBack: () => void;
};

export default function KioskServiceType({ onSelect, onBack }: Props) {
  return (
    <section className="min-h-screen bg-stone-100 px-8 py-10">
      <button type="button" onClick={onBack} className="flex h-14 w-14 items-center justify-center rounded-2xl border border-stone-200 bg-white shadow-sm">
        <ArrowLeft className="h-6 w-6" />
      </button>

      <div className="mx-auto mt-20 max-w-3xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-amber-600">Pilih cara makan</p>
        <h1 className="mt-5 text-6xl font-black tracking-[-0.05em] text-stone-950">Pesanan ini untuk?</h1>
        <p className="mt-5 text-xl text-stone-500">Pilih salah satu untuk melanjutkan.</p>
      </div>

      <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-8">
        <button type="button" onClick={() => onSelect('dine-in')} className="flex min-h-[430px] flex-col items-center justify-center rounded-[2.5rem] border border-stone-200 bg-white p-10 text-center shadow-xl">
          <div className="flex h-32 w-32 items-center justify-center rounded-[2rem] bg-amber-100 text-amber-700">
            <UtensilsCrossed className="h-16 w-16" />
          </div>
          <h2 className="mt-10 text-4xl font-black">Makan di sini</h2>
          <p className="mt-4 text-lg text-stone-500">Nikmati pesanan langsung di outlet.</p>
        </button>

        <button type="button" onClick={() => onSelect('takeaway')} className="flex min-h-[430px] flex-col items-center justify-center rounded-[2.5rem] border border-stone-200 bg-white p-10 text-center shadow-xl">
          <div className="flex h-32 w-32 items-center justify-center rounded-[2rem] bg-amber-100 text-amber-700">
            <ShoppingBag className="h-16 w-16" />
          </div>
          <h2 className="mt-10 text-4xl font-black">Bawa pulang</h2>
          <p className="mt-4 text-lg text-stone-500">Pesanan disiapkan untuk takeaway.</p>
        </button>
      </div>
    </section>
  );
}
