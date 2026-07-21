import { useCallback, useMemo, useRef } from 'react';
import { Sparkles } from 'lucide-react';

import type { MenuItem } from '@/types/menu';
import ProductCard from './ProductCard';

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

  const highlightedItems = useMemo(() => {
    const available = items.filter((item) => item.isAvailable);
    const selected: MenuItem[] = [];
    const usedCategories = new Set<string>();

    for (const item of available) {
      const categoryId = item.categoryId?.toString() ?? 'uncategorized';

      if (!usedCategories.has(categoryId)) {
        selected.push(item);
        usedCategories.add(categoryId);
      }

      if (selected.length === 4) break;
    }

    for (const item of available) {
      if (selected.some((selectedItem) => selectedItem.id === item.id)) continue;
      selected.push(item);
      if (selected.length === 6) break;
    }

    return selected;
  }, [items]);

  const onMouseDown = useCallback((event: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDragging.current = true;
    dragDistance.current = 0;
    startX.current = event.pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
    scrollRef.current.style.cursor = 'grabbing';
    scrollRef.current.style.userSelect = 'none';
  }, []);

  const onMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    event.preventDefault();
    const x = event.pageX - scrollRef.current.offsetLeft;
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

  if (highlightedItems.length === 0) return null;

  return (
    <section className="bg-[var(--color-surface)] px-4 pb-2 pt-5">
      <div className="flex items-center gap-3 pb-3 pt-1">
        <div className="h-px w-6 bg-[var(--color-primary)] opacity-40" />
        <p className="flex items-center gap-1.5 text-[10px] font-label uppercase tracking-[0.25em] text-[var(--color-on-surface-variant)]">
          <Sparkles className="h-3 w-3 text-[var(--color-primary)]" />
          Rekomendasi untuk Anda
        </p>
      </div>

      <div
        ref={scrollRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onDragStart={(event) => event.preventDefault()}
        className="-mx-4 flex cursor-grab select-none gap-4 overflow-x-auto px-4 pb-4 no-scrollbar"
      >
        {highlightedItems.map((item) => (
          <div
            key={item.id}
            onClickCapture={(event) => {
              if (dragDistance.current > 8) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
            className="w-[72vw] max-w-[250px] flex-shrink-0"
          >
            <ProductCard item={item} onClick={onSelectItem} />
          </div>
        ))}
      </div>
    </section>
  );
}
