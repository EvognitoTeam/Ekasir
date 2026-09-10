import {
  ArrowUpRight,
} from 'lucide-react';

import type {
  Category,
  MenuItem,
} from '@/types/menu';

type Props = {
  categories:
    Category[];
  items:
    MenuItem[];
  onSelectCategory: (
    id:
      string,
  ) => void;
};

export default function CategoryOverview({
  categories,
  items,
  onSelectCategory,
}: Props) {
  const rows =
    categories
      .map(
        (category) => ({
          category,
          count:
            items.filter(
              (item) =>
                item.categoryId?.toString() ===
                category.id?.toString(),
            ).length,
        }),
      )
      .filter(
        ({ count }) =>
          count > 0,
      )
      .map(
        (row, index) => ({
          ...row,
          index,
        }),
      );

  if (!rows.length) {
    return null;
  }

  return (
    <section className="px-4 pb-7 pt-5">
      <div className="mb-4">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-black/30">
          Browse
        </p>
        <h2 className="mt-1 text-2xl font-black tracking-[-0.05em]">
          Semua kategori
        </h2>
      </div>

      <div className="overflow-hidden rounded-3xl border border-black/[0.07] bg-white">
        {rows.map(
          ({
            category,
            index,
            count,
          }) => (
            <button
              key={
                category.id
              }
              type="button"
              onClick={() =>
                onSelectCategory(
                  category.id.toString(),
                )
              }
              className={`flex w-full items-center gap-3 px-4 py-4 text-left active:bg-stone-100 ${
                index > 0
                  ? 'border-t border-black/[0.06]'
                  : ''
              }`}
            >
              <span className="w-7 shrink-0 text-[10px] font-black tabular-nums text-black/25">
                {String(
                  index + 1,
                ).padStart(
                  2,
                  '0',
                )}
              </span>

              <span className="min-w-0 flex-1 text-base font-black tracking-[-0.03em]">
                {
                  category.name
                }
              </span>

              <span className="text-[9px] font-bold text-black/30">
                {count}
              </span>

              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </button>
          ),
        )}
      </div>
    </section>
  );
}
