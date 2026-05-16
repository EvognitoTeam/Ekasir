import { Search, X, ChefHat } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MenuItem } from '../types/menu';
import ProductCard from './layout/ProductCard';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  results: MenuItem[];
  onSelectResult: (item: MenuItem) => void;
}

export default function SearchOverlay({ isOpen, onClose, searchQuery, setSearchQuery, results, onSelectResult }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-[#F4F4F5] flex flex-col"
        >
          {/* Search Header */}
          <div className="bg-white pt-10 pb-6 px-6 border-b border-stone-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <ChefHat className="w-5 h-5 text-stone-800" />
                <span className="font-sans text-sm font-bold uppercase tracking-wider text-stone-800">Menu Search</span>
              </div>
              <button 
                onClick={onClose}
                className="p-3 bg-stone-100 rounded-full hover:bg-stone-200 transition-all text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 focus-within:text-stone-800 transition-colors" />
              <input 
                autoFocus
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-100 rounded-xl py-4 flex pl-12 pr-12 text-lg font-sans font-medium text-stone-900 focus:outline-none focus:bg-stone-200 transition-all placeholder:text-stone-400"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-sans font-bold text-stone-500 hover:text-stone-900"
                >
                  CLEAR
                </button>
              )}
            </div>
          </div>

          {/* Results Area */}
          <div className="flex-1 overflow-y-auto pb-32 no-scrollbar px-6 bg-[#F4F4F5]">
            <div className="pt-6">
              {searchQuery === '' ? (
                 <div>
                    <h3 className="text-xs font-sans font-bold text-stone-500 mb-4 tracking-wider uppercase">Type to discover</h3>
                 </div>
              ) : results.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 pb-20">
                  {results.map((item) => (
                    <div key={item.id} className="w-full">
                       <ProductCard item={item} onClick={() => onSelectResult(item)} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-20 text-center max-w-md mx-auto">
                   <div className="w-16 h-16 bg-stone-200 rounded-full flex items-center justify-center mx-auto mb-6 text-stone-400">
                      <Search className="w-8 h-8" />
                   </div>
                   <h3 className="text-xl font-sans font-bold text-stone-900 mb-2">No results found</h3>
                   <p className="text-sm text-stone-500 font-sans">
                      We couldn't find any items matching "{searchQuery}". Try a different keyword.
                   </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
