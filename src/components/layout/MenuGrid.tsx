import { useRef, useCallback } from 'react';
import ProductCard from './ProductCard';
import SkeletonLoader from '../SkeletonLoader';
import EmptyState from './EmptyState';
import { SearchX, ChevronRight } from 'lucide-react';
import { MenuItem, Category } from '../../types/menu';

interface MenuGridProps {
  items: MenuItem[];
  categories: Category[];
  selectedCategoryId: string | null;
  isLoading: boolean;
  onSelectItem: (item: MenuItem) => void;
  onSelectCategory: (id: string) => void;
}

// PERBAIKAN 1: Tambahkan onSelectCategory di parameter penerima CategoryCarousel
function CategoryCarousel({ category, items, onSelectItem, onSelectCategory }: { category: Category, items: MenuItem[], onSelectItem: (item: MenuItem) => void, onSelectCategory: (id: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const dragDistance = useRef(0);

  // Mouse drag support (desktop)
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDragging.current = true;
    dragDistance.current = 0;
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
    scrollRef.current.style.cursor = 'grabbing';
    scrollRef.current.style.userSelect = 'none';
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const delta = x - startX.current;
    dragDistance.current = Math.abs(delta);
    scrollRef.current.scrollLeft = scrollLeft.current - delta;
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grab';
      scrollRef.current.style.userSelect = '';
    }
  }, []);

  // Item click — only fires if it was a real tap (not a drag)
  const handleItemClick = useCallback((item: MenuItem, e: React.MouseEvent) => {
    if (dragDistance.current > 8) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onSelectItem(item);
  }, [onSelectItem]);

  return (
    <section className="flex flex-col bg-white pt-6 pb-2">
      <header className="px-6 flex justify-between items-center mb-4">
        <h2 className="text-sm font-bold font-sans text-stone-900 uppercase tracking-wide">
          {category.name}
        </h2>
        <button onClick={() => onSelectCategory(category.id)} className="flex items-center gap-1 text-sm font-sans text-stone-600 hover:text-[var(--color-primary)]">
          View All <ChevronRight className="w-4 h-4" />
        </button>
      </header>

      {/* Horizontally scrollable carousel — works on both mouse and touch */}
      <div
        ref={scrollRef}
        className="overflow-x-auto pb-8 pt-2 cursor-grab select-none no-scrollbar"
        // Suppress the default overflow scroll indicator
        style={{ WebkitOverflowScrolling: 'touch' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div className="flex w-max">
          {/* Left Padding Spacer */}
          <div className="w-6 flex-shrink-0" />
          
          {items.map((item, index) => (
            <div
              key={item.id}
              onClick={(e) => handleItemClick(item, e)}
              className={`w-[calc(50vw-28px)] sm:w-[180px] md:w-[200px] flex-shrink-0 ${
                index === items.length - 1 ? 'mr-0' : 'mr-4'
              }`}
            >
              <ProductCard item={item} onClick={() => {}} />
            </div>
          ))}

          {/* Right Padding Spacer */}
          <div className="w-6 flex-shrink-0" />
        </div>
      </div>
    </section>
  );
}

// PERBAIKAN 2: Pastikan fungsi onSelectCategory diterima di sini (Sudah kamu lakukan sebelumnya)
export default function MenuGrid({ items, categories, selectedCategoryId, isLoading, onSelectItem, onSelectCategory }: MenuGridProps) {
  if (isLoading) return <section className="px-6 mt-10"><SkeletonLoader /></section>;

  if (items.length === 0) {
    return (
      <section className="px-6 mt-10">
        <EmptyState
          icon={SearchX}
          title="No Fragments Found"
          message="Adjust your filters to explore our other artisanal offerings."
        />
      </section>
    );
  }

  // Active category grid
  if (selectedCategoryId) {
    const activeCategory = categories.find(c => c.id === selectedCategoryId);
    return (
      <main className="px-6 pb-32 pt-8 bg-[#F4F4F5] min-h-screen">
        <header className="mb-6 flex justify-between items-end border-b border-stone-200 pb-4">
          <h2 className="text-xl font-bold font-sans text-stone-900 uppercase">
            {activeCategory?.name || 'Category'}
          </h2>
          <span className="text-xs font-sans text-[var(--color-primary)] opacity-60 font-bold">{items.length} items</span>
        </header>

        <div className="grid grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item.id} className="w-full">
              <ProductCard item={item} onClick={onSelectItem} />
            </div>
          ))}
        </div>
      </main>
    );
  }

  // Default mode: group all items into categorical horizontal sliders
  return (
    <main className="flex flex-col gap-2 bg-[#F4F4F5] min-h-screen">
      {categories.map(category => {
        const categoryItems = items.filter(item => item.categoryId === category.id);
        if (categoryItems.length === 0) return null;
        
        // PERBAIKAN 3: Lempar onSelectCategory ke dalam CategoryCarousel
        return (
          <CategoryCarousel 
            key={category.id} 
            category={category} 
            items={categoryItems} 
            onSelectItem={onSelectItem} 
            onSelectCategory={onSelectCategory} 
          />
        );
      })}
    </main>
  );
}