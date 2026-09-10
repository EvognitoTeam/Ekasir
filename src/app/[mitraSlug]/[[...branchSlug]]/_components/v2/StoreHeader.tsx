'use client';

import {
  MapPin,
  Search,
} from 'lucide-react';

import {
  useTableStore,
} from '@/store/table.store';

type StoreHeaderProps = {
  mitraName: string;
  branchName: string | null;
  onSearch: () => void;
};

export default function StoreHeader({
  mitraName,
  branchName,
  onSearch,
}: StoreHeaderProps) {
  const {
    tableName,
  } = useTableStore();

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-stone-50/95 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-black/35">
            {branchName ? (
              <>
                <MapPin className="h-3 w-3" />
                <span className="truncate">
                  {branchName}
                </span>
              </>
            ) : (
              <span>
                Digital ordering
              </span>
            )}
          </div>

          <h1 className="truncate text-2xl font-black leading-none tracking-[-0.045em]">
            {mitraName}
          </h1>
        </div>

        <button
          type="button"
          onClick={onSearch}
          aria-label="Cari menu"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-white active:scale-95"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      {tableName && (
        <div className="px-4 pb-3">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-stone-200 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.13em] text-black/50">
            <span className="h-1.5 w-1.5 rounded-full bg-black" />
            <span className="truncate">
              Order untuk {tableName}
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
