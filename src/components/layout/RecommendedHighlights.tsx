import { useMemo, useRef, useCallback } from 'react';
import { MenuItem } from '../../types/menu';
import ProductCard from './ProductCard';
import { Sparkles } from 'lucide-react';

interface Props {
  items: MenuItem[];
  onSelectItem: (item: MenuItem) => void;
}

export default function RecommendedHighlights({ items, onSelectItem }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const dragDistance = useRef(0);

  // Curate 3 random highlights (one from Coffee, Non-Coffee, Main Food)
  const highlightedItems = useMemo(() => {
    if (items.length === 0) return [];
    
    const coffees = items.filter(i => i.categoryId === 'cat-1' || i.categoryId === 'cat-1b');
    const nonCoffees = items.filter(i => i.categoryId === 'cat-2');
    const mainFoods = items.filter(i => i.categoryId === 'cat-4');
    
    const pickN = (arr: MenuItem[], n: number) => {
      const shuffled = [...arr].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, n);
    };
    
    // Pick up to 9 items (3 from each category)
    const picks = [
      ...pickN(coffees, 3),
      ...pickN(nonCoffees, 3),
      ...pickN(mainFoods, 3)
    ].filter(Boolean) as MenuItem[];
    return picks;
  }, [items]);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (scrollRef.current) {
      if (e.deltaY !== 0 && Math.abs(e.deltaX) < 10) {
        e.preventDefault();
        scrollRef.current.scrollBy({
          left: e.deltaY > 0 ? 250 : -250,
          behavior: 'smooth'
        });
      }
    }
  };

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDragging.current = true;
    dragDistance.current = 0;
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
    scrollRef.current.style.cursor = 'grabbing';
    scrollRef.current.style.userSelect = 'none';
    scrollRef.current.style.scrollBehavior = 'auto'; // Disable CSS smooth scroll lag
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
      scrollRef.current.style.scrollBehavior = ''; // Restore default scroll behavior
    }
  }, []);

  const handleItemClickCapture = useCallback((e: React.MouseEvent) => {
    // If the user dragged more than 8 pixels, block the click event completely
    if (dragDistance.current > 8) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  if (highlightedItems.length === 0) return null;

  return (
    <section className="px-4 pt-6 pb-2">
      {/* Section label */}
      <div className="flex items-center gap-3 pt-2 pb-3">
        <div className="w-6 h-px" style={{ backgroundColor: 'var(--color-primary)', opacity: 0.4 }} />
        <p className="text-[10px] font-label uppercase tracking-[0.25em] flex items-center gap-1.5" style={{ color: 'var(--color-on-surface-variant)' }}>
          <Sparkles className="w-3 h-3 text-[var(--color-primary)]" />
          Editor's Picks
        </p>
      </div>

      <div 
        ref={scrollRef}
        onWheel={handleWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onDragStart={(e) => e.preventDefault()}
        className="flex overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 gap-4 cursor-grab select-none"
      >
        {highlightedItems.map((item) => (
          <div 
            key={item.id} 
            onClickCapture={handleItemClickCapture}
            className="w-[85vw] max-w-[280px] flex-shrink-0"
          >
            <ProductCard item={item} onClick={onSelectItem} />
          </div>
        ))}
      </div>
    </section>
  );
}
