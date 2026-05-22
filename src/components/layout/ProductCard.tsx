import { MenuItem } from '../../types/menu';
import { ChevronRight, Coffee, ImageIcon, AlertCircle } from 'lucide-react';

interface Props {
  item: MenuItem;
  onClick: (item: MenuItem) => void;
}

export default function ProductCard({ item, onClick }: Props) {
  // 1. Fungsi Helper di luar komponen agar tidak mendefinisikan ulang fungsi setiap render
  const checkIsAvailable = (status: any): boolean => {
    return status === true || status === 1 || status === '1' || status === 'true';
  };

  // 2. Normalisasi Status & Stok
  const isStatusActive = checkIsAvailable(item.status);
  const isAvailableFlag = Boolean(item.isAvailable); 
  const isReallyAvailable = isStatusActive || isAvailableFlag;

  const stockNum = item.stock !== null && item.stock !== undefined && item.stock !== '' ? Number(item.stock) : null;
  
  // 3. Status Sold Out: Jika salah satu penanda tidak tersedia ATAU stok <= 0
  const isSoldOut = !isReallyAvailable || (stockNum !== null && stockNum <= 0);
  
  // 4. Badge Low Stock (Hanya muncul jika stok sisa 1-5 dan barang tidak sold out)
  const isLowStock = stockNum !== null && stockNum > 0 && stockNum <= 5;

  const handleCardClick = () => {
    if (!isSoldOut) onClick(item);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`w-full flex flex-col bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-stone-100 overflow-hidden transition-all duration-300 relative ${
        isSoldOut ? 'opacity-60 grayscale cursor-not-allowed pointer-events-none' : 'cursor-pointer active:scale-[0.98]'
      }`}
    >
      {/* Product Image */}
      <div className="relative w-full aspect-[4/3] shrink-0 bg-stone-100 overflow-hidden flex items-center justify-center">
        {item.image ? (
          <img 
            src={item.image.startsWith('blob:') ? item.image : "/" + item.image} 
            alt={item.name} 
            className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
          />
        ) : (
          <ImageIcon className="w-12 h-12 text-stone-300" />
        )}

        {isLowStock && !isSoldOut && (
          <div className="absolute top-2 left-2 bg-rose-500 text-white px-2 py-1 rounded flex items-center gap-1 z-20 shadow-sm">
            <AlertCircle className="w-2.5 h-2.5" />
            <span className="text-[9px] font-black uppercase tracking-wider leading-none">Sisa {stockNum}</span>
          </div>
        )}

        {isSoldOut && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] flex items-center justify-center z-20">
            <span className="bg-stone-900/90 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-stone-800">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Product Information */}
      <div className="p-3 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="text-[13px] font-bold text-stone-900 leading-snug line-clamp-2 mb-1 font-sans">
            {item.name}
          </h3>
          {item.description && (
            <div 
              className="text-[11px] text-stone-500 font-sans line-clamp-2 mb-2 leading-relaxed prose prose-sm"
              dangerouslySetInnerHTML={{ __html: item.description }} 
            />
          )}
          <p className="text-[13px] font-bold text-stone-900 font-sans mt-auto">
            Rp{(item.basePrice).toLocaleString('id-ID')}
          </p>
        </div>

        <button 
          disabled={isSoldOut}
          className={`mt-3 w-full py-1.5 rounded-md text-xs font-bold transition-colors font-sans ${
            isSoldOut 
              ? 'border border-stone-200 text-stone-400 bg-stone-50 cursor-not-allowed' 
              : 'border border-[#14532d] text-[#14532d] bg-white active:bg-stone-50'
          }`}
        >
          {isSoldOut ? 'Habis' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}