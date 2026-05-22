import { MenuItem } from '../../types/menu';
import { ArrowRight, Image as ImageIcon } from 'lucide-react'; // 🔴 1. Import ImageIcon
import Image from 'next/image';

interface Props {
  item: MenuItem;
  onExplore: (item: MenuItem) => void;
}

export default function FeaturedHero({ item, onExplore }: Props) {
  return (
    <section className="px-6 py-4 bg-white">
      <div 
        onClick={() => onExplore(item)}
        className="relative overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-stone-200 flex flex-col cursor-pointer active:scale-[0.98] transition-all group"
      >
        {/* Banner Image / Placeholder */}
        {/* 🔴 2. Tambah flex center di container untuk posisi icon */}
        <div className="w-full relative h-40 md:h-48 overflow-hidden bg-stone-50 flex items-center justify-center">
          
          {/* 🔴 3. Logic: Tampilkan gambar jika ada, jika tidak render icon */}
          {item.image ? (
            <Image 
              src={item.image} 
              alt={item.name} 
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              priority 
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-stone-300">
              <ImageIcon className="w-10 h-10" strokeWidth={1.5} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                No Image
              </span>
            </div>
          )}
          
          {/* Badge */}
          <div className="absolute top-4 left-4 flex gap-2 z-10">
            <span className="px-3 py-1 bg-white/90 backdrop-blur text-stone-900 text-[10px] font-sans font-bold uppercase tracking-wider rounded-md shadow-sm border border-stone-100">
              Featured Standard
            </span>
          </div>
        </div>

        {/* Content Block */}
        <div className="w-full p-4 flex justify-between items-center bg-white z-10">
          <div className="flex flex-col">
            <h2 className="text-sm font-bold font-sans text-stone-900 mb-1">
              {item.name}
            </h2>
            <p className="text-xs font-sans text-stone-500 font-medium">
              Rp {(item.basePrice || 0).toLocaleString('id-ID')}
            </p>
          </div>
          
          <button className="h-8 px-4 rounded-md border border-[#0E5C37] text-[#0E5C37] bg-white text-xs font-bold font-sans flex items-center gap-1 active:bg-stone-50 transition-colors">
            View <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </section>
  );
}