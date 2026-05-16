import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Category, MenuItem } from '../../types/menu';

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
  const previewImages = items
    .filter(i => i.isAvailable)
    .slice(0, 2)
    .map(i => i.image);

  const words = category.name.split(' ');
  const half = Math.ceil(words.length / 2);
  const line1 = words.slice(0, half).join(' ');
  const line2 = words.slice(half).join(' ');

  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.22 }}
      onClick={onClick}
      className="w-full bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100 active:scale-[0.98] transition-transform text-left"
    >
      {/* Banner */}
      <div className="relative h-[130px] overflow-hidden bg-stone-50">
        {/* Ghost watermark */}
        <span
          className="absolute right-2 bottom-[-10px] text-[86px] font-black leading-none select-none pointer-events-none uppercase"
          style={{ color: 'rgba(0,0,0,0.04)', letterSpacing: '-0.04em' }}
        >
          {words[0]}
        </span>

        {/* + icon */}
        <span
          className="absolute top-4 left-4 text-2xl font-black leading-none"
          style={{ color: 'var(--color-primary)' }}
        >
          +
        </span>

        {/* Category name */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-10 max-w-[55%]">
          <p className="text-[22px] font-black leading-tight uppercase tracking-tight text-stone-900">
            {line1}
          </p>
          {line2 && (
            <p
              className="text-[22px] font-black leading-tight uppercase tracking-tight"
              style={{ color: 'var(--color-primary)' }}
            >
              {line2}
            </p>
          )}
        </div>

        {/* Food images — stacked on right */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
          {previewImages.map((src, i) => (
            <div
              key={i}
              className="w-[90px] h-[90px] rounded-2xl overflow-hidden border-2 border-white shadow-md flex-shrink-0"
              style={{ marginLeft: i > 0 ? '-18px' : '0', zIndex: previewImages.length - i }}
            >
              <img
                src={src}
                alt=""
                className="w-full h-full object-cover"
                onError={e => {
                  e.currentTarget.src =
                    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=200&q=60';
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Caption row */}
      <div className="px-4 py-2.5 border-t border-stone-100 flex items-center justify-between">
        <span className="text-[10px] font-label uppercase tracking-wider text-stone-500">
          {category.name}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-sans text-stone-400">{items.length} items</span>
          <ArrowRight className="w-3 h-3 text-stone-300" />
        </div>
      </div>
    </motion.button>
  );
}

export default function CategoryList({ categories, allItems, onSelectCategory }: Props) {
  return (
    <section className="px-4 pt-2 pb-4 space-y-3">
      {/* Section label */}
      <div className="flex items-center gap-3 pt-2 pb-0.5">
        <div className="w-6 h-px" style={{ backgroundColor: 'var(--color-primary)', opacity: 0.4 }} />
        <p className="text-[10px] font-label uppercase tracking-[0.25em]" style={{ color: 'var(--color-on-surface-variant)' }}>
          Category List
        </p>
      </div>

      {categories.map((category, i) => {
        const catItems = allItems.filter(item => item.categoryId === category.id);
        if (catItems.length === 0) return null;
        return (
          <CategoryCard
            key={category.id}
            category={category}
            items={catItems}
            onClick={() => onSelectCategory(category.id)}
            index={i}
          />
        );
      })}
    </section>
  );
}
