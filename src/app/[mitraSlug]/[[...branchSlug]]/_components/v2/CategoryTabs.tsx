'use client';

import type {
  Category,
  MenuItem,
} from '@/types/menu';

type Props = {
  categories:
    Category[];
  items:
    MenuItem[];
  selectedCategoryId:
    string | null;
  onSelectCategory: (
    id:
      string | null,
  ) => void;
};

export default function CategoryTabs({
  categories,
  items,
  selectedCategoryId,
  onSelectCategory,
}: Props) {
  const active =
    categories.filter(
      (category) =>
        items.some(
          (item) =>
            item.categoryId?.toString() ===
            category.id?.toString(),
        ),
    );

  return (
    <div className="sticky top-0 z-30 border-b border-black/5 bg-stone-50/95 py-3 backdrop-blur-xl">
      <div className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() =>
            onSelectCategory(
              null,
            )
          }
          className={`shrink-0 rounded-full px-4 py-2 text-[9px] font-extrabold uppercase tracking-[0.12em] ${
            selectedCategoryId ===
            null
              ? 'bg-black text-white'
              : 'border border-black/10 bg-white text-black/45'
          }`}
        >
          Semua
        </button>

        {active.map(
          (category) => {
            const selected =
              selectedCategoryId ===
              category.id.toString();

            return (
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
                className={`shrink-0 rounded-full px-4 py-2 text-[9px] font-extrabold uppercase tracking-[0.12em] ${
                  selected
                    ? 'bg-black text-white'
                    : 'border border-black/10 bg-white text-black/45'
                }`}
              >
                {
                  category.name
                }
              </button>
            );
          },
        )}
      </div>
    </div>
  );
}
