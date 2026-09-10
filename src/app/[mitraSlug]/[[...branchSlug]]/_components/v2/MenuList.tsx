import {
  SearchX,
} from 'lucide-react';

import EmptyState from '@/components/layout/EmptyState';
import type {
  Category,
  MenuItem,
} from '@/types/menu';

import MenuItemCard from './MenuItemCard';

type Props = {
  items:
    MenuItem[];
  categories:
    Category[];
  selectedCategoryId:
    string | null;
  onSelectItem: (
    item:
      MenuItem,
  ) => void;
};

export default function MenuList({
  items,
  categories,
  selectedCategoryId,
  onSelectItem,
}: Props) {
  const activeCategory =
    categories.find(
      (category) =>
        category.id.toString() ===
        selectedCategoryId,
    );

  return (
    <section className="px-4 pb-36 pt-5">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-black/30">
            Menu
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.05em]">
            {activeCategory?.name ||
              'Semua pilihan'}
          </h2>
        </div>

        <span className="pb-1 text-[9px] font-bold text-black/30">
          {items.length} item
        </span>
      </div>

      {!items.length ? (
        <EmptyState
          icon={SearchX}
          title="Belum ada menu"
          message="Belum ada menu yang tersedia pada kategori ini."
        />
      ) : (
        <div className="space-y-3">
          {items.map(
            (item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                onClick={
                  onSelectItem
                }
              />
            ),
          )}
        </div>
      )}
    </section>
  );
}
