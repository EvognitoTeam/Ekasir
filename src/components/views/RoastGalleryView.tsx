"use client";

import { MenuItem } from '../../types/menu';
import { ChevronRight, Coffee } from 'lucide-react';
import { useMenuStore } from '@/store/menu.store'; 
import { formatPrice } from '../../utils/formatters';

interface Props {
  items: MenuItem[];
  onSelectItem: (item: MenuItem) => void;
}

// 1. Helper untuk membuat angka Romawi (I, II, III, IV, dst) untuk Chapter
const toRoman = (num: number) => {
  const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  return roman[num] || (num + 1).toString();
};

// 2. Sub-komponen Card Portofolio Editorial (Disesuaikan untuk Mobile)
function PortfolioCard({ item, onClick, aspect = 'aspect-[4/5]' }: { item: MenuItem, onClick: () => void, aspect?: string }) {
  const imageUrl = item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c';

  return (
    <div 
      onClick={onClick}
      // 🔴 Ditambahkan: break-inside-avoid agar kotak tidak terpotong antar kolom
      // 🔴 Ditambahkan: rounded-2xl agar lebih modern dan enak dilihat di HP
      className="group relative w-full overflow-hidden bg-stone-900 cursor-pointer mb-3 rounded-2xl break-inside-avoid shadow-sm"
    >
      <div className={`w-full ${aspect} relative overflow-hidden`}>
        <img 
          src={imageUrl} 
          alt={item.name} 
          className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
      </div>
      
      {/* 🔴 Padding dikurangi menjadi p-4 agar lega di layar kecil */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col justify-end pointer-events-none">
        <div className="flex flex-col items-start mb-1.5 gap-0.5">
          {/* 🔴 Ukuran teks judul diperkecil jadi text-sm */}
          <h3 className="text-white text-sm font-bold font-sans uppercase tracking-wide leading-tight line-clamp-2">
            {item.name}
          </h3>
          {/* 🔴 Ukuran teks harga diperkecil */}
          <span className="text-emerald-400 text-[10px] font-sans font-bold whitespace-nowrap relative z-10">
            {formatPrice(item.basePrice || 0)}
          </span>
        </div>
        
        {/* 🔴 Ukuran deskripsi diperkecil jadi text-[9px] */}
        <div 
          className="text-stone-300 text-[9px] leading-relaxed font-sans line-clamp-2 mb-2"
          dangerouslySetInnerHTML={{ __html: item.description || '' }}
        />

        <div className="flex items-center gap-1 text-[#0E5C37] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto mt-1">
          <span className="text-[9px] uppercase font-bold tracking-widest text-white">Discover</span>
          <ChevronRight className="w-3 h-3 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function RoastGalleryView({ items, onSelectItem }: Props) {
  const { categories } = useMenuStore();

  const categoriesWithItems = categories.map(category => {
    const categoryItems = items.filter(item => String(item.categoryId) === String(category.id));
    return {
      ...category,
      items: categoryItems
    };
  }).filter(cat => cat.items.length > 0); 

  // 🔴 Aspect ratio lebih ke arah portrait/kotak agar cocok di-grid 2 kolom
  const aspectRatios = ['aspect-[4/5]', 'aspect-square', 'aspect-[3/4]', 'aspect-[4/5]'];

  return (
    <div className="bg-stone-50 min-h-full font-sans pb-24">
      
      {/* Editorial Header */}
      <div className="px-6 py-10 bg-white text-center border-b border-stone-200">
        <p className="text-[9px] font-bold text-[#0E5C37] uppercase tracking-[0.3em] mb-2">
          Our Portfolio
        </p>
        <h1 className="text-3xl font-black text-stone-900 uppercase tracking-tight leading-none mb-3">
          The Art of <br/> Craft
        </h1>
        <p className="text-xs text-stone-500 max-w-[280px] mx-auto leading-relaxed">
          A curated exhibition of our finest roasts, precision-brewed beverages, and culinary masterpieces.
        </p>
      </div>

      {categoriesWithItems.length > 0 ? (
        categoriesWithItems.map((category, index) => (
          <section 
            key={category.id} 
            className={`pt-8 pb-4 ${index % 2 !== 0 ? 'bg-stone-100/50' : 'bg-white'}`}
          >
            <div className="px-6 mb-5">
              <h2 className="text-xs font-bold text-stone-900 uppercase tracking-widest border-l-2 border-[#0E5C37] pl-3">
                Chapter {toRoman(index)}: {category.name}
              </h2>
            </div>
            
            {/* 🔴 PERUBAHAN UTAMA: Menggunakan columns-2 untuk efek Masonry 2 Kolom */}
            <div className="px-4 columns-2 gap-3">
              {category.items.map((item, itemIndex) => {
                const dynamicAspect = aspectRatios[(index + itemIndex) % aspectRatios.length];
                
                return (
                  <PortfolioCard 
                    key={item.id} 
                    item={item} 
                    onClick={() => onSelectItem(item)} 
                    aspect={dynamicAspect} 
                  />
                );
              })}
            </div>
          </section>
        ))
      ) : (
        <div className="py-32 flex flex-col items-center justify-center text-center opacity-40">
          <Coffee className="w-12 h-12 text-stone-300 mb-4" />
          <p className="text-xs font-bold uppercase tracking-widest text-stone-500">
            Portfolio belum terisi data menu
          </p>
        </div>
      )}

    </div>
  );
}