/* eslint-disable @next/next/no-img-element */
import { motion } from 'framer-motion';
import { ArrowRight, ImageIcon } from 'lucide-react';

import type { Category, MenuItem } from '@/types/menu';
import { applyFallbackImage, normalizeImageSrc } from '@/utils/image';

interface Props {
  categories: Category[];
  allItems: MenuItem[];
  onSelectCategory: (categoryId: string) => void;
}

function CategoryCard({
  category,
  items,
  onClick,
  index,
}: {
  category: Category;
  items: MenuItem[];
  onClick: () => void;
  index: number;
}) {
  const previewItems = items
    .filter((item) => item.isAvailable && item.image)
    .slice(0, 2);
  const words = category.name.trim().split(/\s+/);
  const splitAt = Math.ceil(words.length / 2);
  const line1 = words.slice(0, splitAt).join(' ');
  const line2 = words.slice(splitAt).join(' ');

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.045, duration: 0.24 }}
      onClick={onClick}
      className="block min-h-0 w-full overflow-hidden rounded-2xl border border-stone-100 bg-white text-left shadow-sm active:scale-[0.985]"
    >
      <div className="relative h-[132px] overflow-hidden bg-stone-50">
        <span className="pointer-events-none absolute bottom-[-12px] right-2 select-none text-[84px] font-black uppercase leading-none tracking-[-0.05em] text-black/[0.035]">
          {words[0]}
        </span>

        <span className="absolute left-4 top-4 text-2xl font-black leading-none text-[var(--color-primary)]">
          +
        </span>

        <div className="absolute left-6 top-1/2 z-10 max-w-[54%] -translate-y-1/2">
          <p className="text-[21px] font-black uppercase leading-tight tracking-tight text-stone-900">
            {line1}
          </p>
          {line2 && (
            <p className="text-[21px] font-black uppercase leading-tight tracking-tight text-[var(--color-primary)]">
              {line2}
            </p>
          )}
        </div>

        <div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center">
          {previewItems.length > 0 ? (
            previewItems.map((item, imageIndex) => (
              <div
                key={item.id}
                className="relative h-[88px] w-[88px] flex-shrink-0 overflow-hidden rounded-2xl border-2 border-white bg-stone-100 shadow-md"
                style={{
                  marginLeft: imageIndex > 0 ? '-20px' : '0',
                  zIndex: previewItems.length - imageIndex,
                }}
              >
                <img
                  src={normalizeImageSrc(item.image)}
                  alt=""
                  onError={applyFallbackImage}
                  className="h-full w-full object-cover"
                />
              </div>
            ))
          ) : (
            <div className="flex h-[88px] w-[88px] items-center justify-center rounded-2xl border-2 border-white bg-stone-100 text-stone-300 shadow-md">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-stone-100 px-4 py-2.5">
        <span className="text-[10px] font-label uppercase tracking-wider text-stone-500">
          {category.name}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-stone-500">{items.length} menu</span>
          <ArrowRight className="h-3 w-3 text-stone-300" />
        </div>
      </div>
    </motion.button>
  );
}

export default function CategoryList({ categories, allItems, onSelectCategory }: Props) {
  const categoriesWithItems = categories
    .map((category) => ({
      category,
      items: allItems.filter(
        (item) => item.categoryId?.toString() === category.id?.toString(),
      ),
    }))
    .filter(({ items }) => items.length > 0);

  if (categoriesWithItems.length === 0) return null;

  return (
    <section className="bg-[var(--color-surface)] px-4 pb-8 pt-2">
      <div className="flex items-center gap-3 pb-2 pt-2">
        <div className="h-px w-6 bg-[var(--color-primary)] opacity-40" />
        <p className="text-[10px] font-label uppercase tracking-[0.25em] text-[var(--color-on-surface-variant)]">
          Jelajahi semua kategori
        </p>
      </div>

      <div className="mt-1 space-y-3">
        {categoriesWithItems.map(({ category, items }, index) => (
          <CategoryCard
            key={category.id}
            category={category}
            items={items}
            onClick={() => onSelectCategory(category.id.toString())}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}
