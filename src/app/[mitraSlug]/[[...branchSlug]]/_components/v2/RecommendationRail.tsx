'use client';

import {
  useMemo,
} from 'react';

import type {
  MenuItem,
} from '@/types/menu';

import MenuItemCard from './MenuItemCard';

type Props = {
  items: MenuItem[];
  onSelectItem: (
    item:
      MenuItem,
  ) => void;
};

export default function RecommendationRail({
  items,
  onSelectItem,
}: Props) {
  const highlighted =
    useMemo(() => {
      const result:
        MenuItem[] = [];

      for (
        const item of
        items
      ) {
        if (
          item.isAvailable
        ) {
          result.push(
            item,
          );
        }

        if (
          result.length ===
          4
        ) {
          break;
        }
      }

      return result;
    }, [items]);

  if (!highlighted.length) {
    return null;
  }

  return (
    <section className="py-4">
      <div className="mb-3 px-4">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-black/30">
          Quick picks
        </p>
        <h2 className="mt-1 text-xl font-black tracking-[-0.04em]">
          Pilihan cepat
        </h2>
      </div>

      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {highlighted.map(
          (item) => (
            <div
              key={item.id}
              className="w-[82vw] max-w-[340px] shrink-0 snap-start"
            >
              <MenuItemCard
                item={item}
                onClick={
                  onSelectItem
                }
              />
            </div>
          ),
        )}
      </div>
    </section>
  );
}
