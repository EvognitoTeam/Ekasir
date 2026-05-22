import { useRef, useEffect } from 'react';
import { 
  Coffee, 
  Leaf, 
  UtensilsCrossed, 
  Beer, 
  Cake, 
  Sparkles,
  Waves
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Category } from '../../types/menu';

interface CategoryBarProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}

const categoryIcons: { [key: string]: any } = {
  'coffee': Coffee,
  'tea': Leaf,
  'signature-brews': Coffee,
  'the-morning-bakery': Cake,
  'savory-mains': UtensilsCrossed,
  'cold-pressed': Waves,
  'drinks': Beer,
  'desserts': Cake,
  'specialties': Sparkles,
};

export default function CategoryBar({ categories, selectedCategoryId, onSelectCategory }: CategoryBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Allow horizontal wheel scroll on desktop
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <nav className="sticky top-[65px] md:top-[77px] z-40 bg-[var(--color-surface)] border-b border-stone-200 shadow-sm overflow-hidden">
      <div ref={scrollRef} className="overflow-x-auto no-scrollbar px-6 md:px-8 cursor-default">
        <div className="flex items-center gap-3 min-w-max py-4">
            <button
              onClick={() => onSelectCategory(null)}
              className={`relative px-5 py-2.5 rounded-full flex items-center gap-2 transition-colors ${
                selectedCategoryId === null ? 'text-white' : 'text-stone-500 hover:text-stone-900 bg-stone-100/50 hover:bg-stone-100'
              }`}
            >
              {selectedCategoryId === null && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute inset-0 bg-[#14532d] shadow-md rounded-full pointer-events-none"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-[11px] font-sans uppercase tracking-wider font-bold">The Discovery</span>
              </div>
            </button>

            {categories.map((category) => {
              const Icon = categoryIcons[category.name] || Coffee;
              const isActive = selectedCategoryId === category.id;

              return (
                <button
                  key={category.id}
                  onClick={() => onSelectCategory(category.id)}
                  className={`relative px-5 py-2.5 rounded-full flex items-center gap-2 transition-colors ${
                    isActive ? 'text-white' : 'text-stone-500 hover:text-stone-900 bg-stone-100/50 hover:bg-stone-100'
                  }`}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="active-pill"
                      className="absolute inset-0 bg-[#14532d] shadow-md rounded-full pointer-events-none"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <div className="relative z-10 flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-sans uppercase tracking-wider font-bold">
                      {category.name}
                    </span>
                  </div>
                </button>
              );
            })}
        </div>
      </div>
    </nav>
  );
}
