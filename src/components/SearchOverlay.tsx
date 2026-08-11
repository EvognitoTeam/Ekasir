import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from 'lucide-react';

import type { MenuItem } from '@/types/menu';
import ProductCard from './layout/ProductCard';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  results: MenuItem[];
  onSelectResult: (item: MenuItem) => void;
}

export default function SearchOverlay({
  isOpen,
  onClose,
  searchQuery,
  setSearchQuery,
  results,
  onSelectResult,
}: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex justify-center bg-stone-900/35 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Pencarian menu"
        >
          <motion.div
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="flex h-[100dvh] w-full max-w-[480px] flex-col bg-[#F4F4F5] shadow-2xl"
          >
            <div className="border-b border-stone-200 bg-white px-4 pb-5 pt-[calc(1rem+env(safe-area-inset-top))] shadow-sm sm:px-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-label uppercase tracking-[0.24em] text-stone-400">
                    EKASIR discovery
                  </p>
                  <h2 className="font-display text-xl font-bold text-stone-900">Cari menu</h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Tutup pencarian"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                <input
                  autoFocus
                  type="search"
                  placeholder="Cari kopi, makanan, atau minuman..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full rounded-2xl bg-stone-100 py-3.5 pl-12 pr-14 text-sm font-medium text-stone-900 outline-none ring-[var(--color-primary)] placeholder:text-stone-400 focus:ring-2"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 h-8 min-h-0 -translate-y-1/2 rounded-full px-2 text-[9px] font-label uppercase tracking-widest text-stone-500"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-20 pt-5 no-scrollbar sm:px-6">
              {!searchQuery.trim() ? (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white/60 p-8 text-center">
                  <Search className="mx-auto mb-3 h-8 w-8 text-stone-300" />
                  <p className="text-sm font-semibold text-stone-700">Mulai ketik nama menu</p>
                  <p className="mt-1 text-xs text-stone-400">Hasil dari seluruh kategori akan muncul di sini.</p>
                </div>
              ) : results.length > 0 ? (
                <>
                  <p className="mb-4 text-[10px] font-label uppercase tracking-widest text-stone-500">
                    {results.length} hasil ditemukan
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {results.map((item) => (
                      <ProductCard key={item.id} item={item} onClick={onSelectResult} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="mt-16 text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-stone-200 text-stone-400">
                    <Search className="h-7 w-7" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-stone-900">Menu tidak ditemukan</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm text-stone-500">
                    Tidak ada menu yang cocok dengan “{searchQuery}”. Coba kata kunci lain.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
