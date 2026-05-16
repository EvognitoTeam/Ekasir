import { Search, Radio } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTableStore } from '../../store/table.store'; // Sesuaikan path-nya

interface HeaderProps {
  onOpenSearch: () => void;
  mitraName?: string;
}

export default function Header({ onOpenSearch, mitraName = "Evognito" }: HeaderProps) {
  // Ambil data nama meja dari session store
  const { tableName } = useTableStore();

  return (
    <header className="sticky top-0 z-10 bg-[var(--color-surface)] border-b border-stone-200">
      <div className="px-6 py-4 flex justify-between items-center gap-4">
        <div className="flex items-center gap-6 min-w-0">
          {/* Logo */}
          <div className="flex flex-col">
             <span className="text-[8px] font-label uppercase tracking-[0.4em] opacity-30 mb-1">The Original</span>
             <h2 className="text-2xl font-display text-[var(--color-on-surface)] leading-none tracking-tighter">
                {mitraName} <span className="opacity-20 italic">.</span>
             </h2>
          </div>

          {/* Menampilkan Nama Meja jika ada di session */}
          {tableName && (
            <div className="flex items-center gap-4 py-2 px-6 bg-stone-50 rounded-full border border-stone-200 group ">
               <div className="relative">
                  <Radio className="w-3 h-3 text-[#0E5C37] opacity-40 group-hover:opacity-100 transition-opacity" />
                  <motion.div 
                    animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-[#0E5C37] rounded-full"
                  />
               </div>
               <span className="text-[10px] font-label font-bold uppercase tracking-widest text-stone-600">
                 {tableName}
               </span>
            </div>
          )}
        </div>
        
        {/* Tombol Search (Bisa di-uncomment jika dipakai) */}
        {/* <div className="flex items-center gap-6">
          <button 
            onClick={onOpenSearch}
            className="w-10 h-10 bg-white border border-stone-200 rounded-full flex items-center justify-center hover:bg-[var(--color-on-surface)] hover:text-white transition-all group shadow-sm"
          >
            <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>
        </div> */}
      </div>
    </header>
  );
}