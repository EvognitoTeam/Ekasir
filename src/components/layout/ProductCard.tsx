import { MenuItem } from '../../types/menu';

interface Props {
  item: MenuItem;
  onClick: (item: MenuItem) => void;
}

export default function ProductCard({ item, onClick }: Props) {
  const isSoldOut = !item.isAvailable;

  // 1. UBAH GAMBAR DEFAULT DI SINI
  // Kamu bisa menggantinya dengan URL gambarmu sendiri atau path lokal seperti '/images/default-menu.jpg'
  const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'; 
  
  // Jika item.image dari database kosong (null), langsung pakai default
  const imageSrc = item.image || DEFAULT_IMAGE;

  return (
    <div
      onClick={() => !isSoldOut && onClick(item)}
      className={`w-full flex flex-col bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-stone-100 overflow-hidden transition-all duration-300 ${
        isSoldOut ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'
      }`}
    >
      {/* Product Image */}
      <div className="w-full pt-[75%] flex-shrink-0 bg-stone-50 relative overflow-hidden">
        <img
          src={imageSrc}
          alt={item.name}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = DEFAULT_IMAGE;
          }}
        />
        {!item.isAvailable && (
           <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] flex items-center justify-center">
             <span className="bg-stone-800 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
               Sold Out
             </span>
           </div>
        )}
      </div>

      {/* Product Information */}
      <div className="p-3 flex flex-col flex-1 justify-between">
        <div>
          {/* Saya hilangkan fixed height (h-[38px]) agar tidak bertabrakan dengan deskripsi di bawahnya */}
          <h3 className="text-[13px] font-bold text-stone-900 leading-snug line-clamp-2 mb-1 font-sans">
            {item.name}
          </h3>
          
          {/* 2. RENDER HTML DESKRIPSI DI SINI */}
          {item.description && (
            <div 
              className="text-[11px] text-stone-500 font-sans line-clamp-2 mb-2 leading-relaxed prose prose-sm max-w-none"
              // Ini adalah cara React membaca format HTML (seperti <b>, <i>, <p>, dll)
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
              ? 'border border-stone-200 text-stone-400 bg-stone-50' 
              : 'border border-[#14532d] text-[#14532d] bg-white active:bg-stone-50'
          }`}
        >
          Add
        </button>
      </div>
    </div>
  );
}