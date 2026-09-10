'use client';

import {
  Ticket,
} from 'lucide-react';

import type {
  CouponData,
} from '@/components/layout/PromoBanner';
import {
  formatPrice,
} from '@/utils/formatters';

type PromoRailProps = {
  promos: CouponData[];
  onNavigate: () => void;
};

function valueLabel(
  promo:
    CouponData,
) {
  if (
    promo.discount_rate !==
      null &&
    Number(
      promo.discount_rate,
    ) > 0
  ) {
    return `${promo.discount_rate}%`;
  }

  if (
    promo.discount_price
  ) {
    return formatPrice(
      Number(
        promo.discount_price,
      ),
    );
  }

  return 'PROMO';
}

export default function PromoRail({
  promos,
  onNavigate,
}: PromoRailProps) {
  if (!promos.length) {
    return null;
  }

  return (
    <section className="py-4">
      <div className="mb-3 flex items-end justify-between px-4">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-black/30">
            Offers
          </p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.04em]">
            Promo hari ini
          </h2>
        </div>

        <button
          type="button"
          onClick={onNavigate}
          className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-black/45"
        >
          Lihat semua
        </button>
      </div>

      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {promos.map(
          (promo) => (
            <button
              key={promo.id}
              type="button"
              onClick={
                onNavigate
              }
              className="w-72 shrink-0 snap-start rounded-3xl border border-black/10 bg-white p-4 text-left active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white">
                  <Ticket className="h-4 w-4" />
                </span>

                <span className="text-3xl font-black tracking-[-0.06em]">
                  {valueLabel(
                    promo,
                  )}
                </span>
              </div>

              <p className="mt-5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-black/35">
                {promo.coupon_code ||
                  'KALOO OFFER'}
              </p>

              <h3 className="mt-1 line-clamp-2 text-base font-black leading-tight tracking-[-0.025em]">
                {promo.title ||
                  'Promo spesial'}
              </h3>
            </button>
          ),
        )}
      </div>
    </section>
  );
}
