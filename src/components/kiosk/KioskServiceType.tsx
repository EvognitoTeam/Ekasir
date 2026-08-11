'use client';

import {
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  UtensilsCrossed,
} from 'lucide-react';

import type {
  KioskServiceType as ServiceType,
} from './types';

type Props = {
  onSelect: (value: ServiceType) => void;
  onBack: () => void;
};

export default function KioskServiceType({
  onSelect,
  onBack,
}: Props) {
  return (
    <section className="min-h-[100dvh] bg-[#f5f1e8] p-3 text-[#171717] sm:p-5 lg:p-7">
      <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full max-w-[1440px] flex-col overflow-hidden rounded-[1.75rem] border-2 border-[#171717] bg-white shadow-[8px_8px_0_#171717] sm:min-h-[calc(100dvh-2.5rem)] sm:rounded-[2.25rem]">
        <header className="flex items-center justify-between border-b border-black/10 px-4 py-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={onBack}
            className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[#171717] bg-[#f5f1e8] shadow-[3px_3px_0_#171717] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none sm:h-12 sm:w-12"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <span className="rounded-full bg-[#171717] px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white sm:text-xs">
            Pilih layanan
          </span>
        </header>

        <main className="flex flex-1 items-center px-4 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
          <div className="mx-auto w-full max-w-5xl">
            <div className="text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[#ff5c35] sm:text-xs lg:text-sm">
                Pesanan ini untuk
              </p>
              <h1 className="mx-auto mt-3 max-w-4xl text-[clamp(2.25rem,5.5vw,4.75rem)] font-black leading-[0.96] tracking-[-0.055em]">
                Mau makan di mana?
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-sm font-medium leading-relaxed text-neutral-500 sm:text-base lg:text-lg">
                Pilih cara menikmati pesanan. Kamu masih bisa kembali sebelum melakukan pembayaran.
              </p>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-4 sm:mt-9 md:grid-cols-2 md:gap-5 lg:gap-6">
              <ServiceCard
                title="Makan di sini"
                description="Nikmati pesanan langsung di outlet. Pesanan akan disiapkan untuk dine-in."
                icon={<UtensilsCrossed className="h-9 w-9 sm:h-11 sm:w-11" />}
                accentClassName="bg-[#c8ff3d]"
                onClick={() => onSelect('dine-in')}
              />

              <ServiceCard
                title="Bawa pulang"
                description="Pesanan akan dikemas dengan rapi supaya mudah dibawa pulang."
                icon={<ShoppingBag className="h-9 w-9 sm:h-11 sm:w-11" />}
                accentClassName="bg-[#ffd8cf]"
                onClick={() => onSelect('takeaway')}
              />
            </div>
          </div>
        </main>
      </div>
    </section>
  );
}

function ServiceCard({
  title,
  description,
  icon,
  accentClassName,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  accentClassName: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex min-h-[210px] flex-col rounded-[1.75rem] border-2 border-[#171717] p-5 text-left shadow-[6px_6px_0_#171717] transition hover:-translate-y-1 hover:shadow-[9px_9px_0_#171717] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none sm:min-h-[250px] sm:p-6 lg:min-h-[285px] lg:p-7 ${accentClassName}`}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] border-2 border-[#171717] bg-white sm:h-20 sm:w-20">
        {icon}
      </div>

      <div className="mt-auto pt-6 sm:pt-8">
        <h2 className="text-2xl font-black tracking-[-0.04em] sm:text-3xl lg:text-4xl">
          {title}
        </h2>
        <p className="mt-2 max-w-md pr-14 text-sm font-semibold leading-relaxed text-neutral-700 sm:text-base lg:text-lg">
          {description}
        </p>
      </div>

      <span className="absolute bottom-5 right-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#171717] text-white transition group-hover:translate-x-1 sm:h-12 sm:w-12">
        <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
      </span>
    </button>
  );
}
