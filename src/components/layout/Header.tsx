import { motion } from 'framer-motion';
import { MapPin, Radio, Search } from 'lucide-react';

import { useTableStore } from '@/store/table.store';

interface HeaderProps {
  mitraName?: string;
  branchName?: string | null;
  onSearch?: () => void;
}

export default function Header({
  mitraName = 'KALOO POS',
  branchName,
  onSearch,
}: HeaderProps) {
  const { tableName } = useTableStore();

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-[var(--color-surface)]/95 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        <div className="min-w-0 md:hidden">
          <div className="mb-1 flex items-center gap-1.5">
            {branchName ? (
              <MapPin className="h-3 w-3 text-[var(--color-primary)]" />
            ) : null}
            <span className="truncate text-[8px] font-label uppercase tracking-[0.32em] text-stone-500">
              {branchName || 'Digital menu'}
            </span>
          </div>
          <h1 className="truncate font-display text-[22px] font-bold leading-none tracking-tight text-[var(--color-on-surface)]">
            {mitraName}
          </h1>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2.5">
          {onSearch && (
            <button
              type="button"
              onClick={onSearch}
              aria-label="Cari menu"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-sm transition hover:bg-stone-50 active:scale-95"
            >
              <Search className="h-4.5 w-4.5" />
            </button>
          )}
          {tableName && (
            <div className="flex h-10 items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 shadow-sm md:hidden">
              <div className="relative flex items-center justify-center">
                <Radio className="h-3 w-3 text-[var(--color-primary)]" />
                <motion.div
                  animate={{ scale: [1, 2.2, 1], opacity: [0.35, 0, 0.35] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 rounded-full bg-[var(--color-primary)]"
                />
              </div>
              <span className="max-w-[90px] truncate text-[9px] font-label uppercase tracking-widest text-stone-600">
                {tableName}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
