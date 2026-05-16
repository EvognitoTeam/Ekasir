import { MenuItem } from '../../types/menu';
import { ArrowRight } from 'lucide-react';

interface Props {
  item: MenuItem;
  onExplore: (item: MenuItem) => void;
}

export default function FeaturedHero({ item, onExplore }: Props) {
  return (
    <section className="px-6 py-4 bg-white">
      <div 
        onClick={() => onExplore(item)}
        className="relative overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-stone-200 flex flex-col cursor-pointer active:scale-[0.98] transition-all"
      >
        {/* Banner Image */}
        <div className="w-full relative h-40 md:h-48 overflow-hidden bg-stone-100">
          <img 
            src={item.image} 
            alt={item.name} 
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="px-3 py-1 bg-white/90 backdrop-blur text-stone-900 text-[10px] font-sans font-bold uppercase tracking-wider rounded-md shadow-sm border border-stone-100">
              Featured Standard
            </span>
          </div>
        </div>

        {/* Content Block */}
        <div className="w-full p-4 flex justify-between items-center bg-white">
          <div className="flex flex-col">
            <h2 className="text-sm font-bold font-sans text-stone-900 mb-1">
              {item.name}
            </h2>
            <p className="text-xs font-sans text-stone-500 font-medium">
              Rp {(item.basePrice || 0).toLocaleString('id-ID')}
            </p>
          </div>
          
          <button className="h-8 px-4 rounded-md border border-[#14532d] text-[#14532d] bg-white text-xs font-bold font-sans flex items-center gap-1 active:bg-stone-50">
            View <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </section>
  );
}
