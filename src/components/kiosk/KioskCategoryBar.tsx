'use client';

import type { KioskCategory } from './types';

type Props = {
  categories: KioskCategory[];
  activeCategoryId: number | string | null;
  onChange: (id: number | string | null) => void;
};

export default function KioskCategoryBar({ categories, activeCategoryId, onChange }: Props) {
  return (
    <div className="no-scrollbar flex gap-3 overflow-x-auto px-8 py-5">
      <button type="button" onClick={() => onChange(null)} className={`min-h-14 shrink-0 rounded-2xl px-6 text-base font-extrabold ${activeCategoryId === null ? 'bg-stone-950 text-white' : 'border border-stone-200 bg-white text-stone-600'}`}>
        Semua
      </button>
      {categories.map((category) => (
        <button key={category.id} type="button" onClick={() => onChange(category.id)} className={`min-h-14 shrink-0 rounded-2xl px-6 text-base font-extrabold ${activeCategoryId === category.id ? 'bg-stone-950 text-white' : 'border border-stone-200 bg-white text-stone-600'}`}>
          {category.name}
        </button>
      ))}
    </div>
  );
}
