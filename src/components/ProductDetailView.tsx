import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MinusCircle, PlusCircle, Coffee, Settings2 } from 'lucide-react';
import { MenuItem, POSOptions } from '../types/menu';
import { useParams } from 'next/navigation';

interface Props {
  item: MenuItem;
  onClose: () => void;
  onAddToCart: (slug: string, item: MenuItem, selections: any, quantity: number, options?: POSOptions, sku_code?: string) => void;
}

export default function ProductDetailView({ item, onClose, onAddToCart }: Props) {
  const params = useParams();
  const slug = (params.mitraSlug as string) || "";
  
  const [quantity, setQuantity] = useState(1);
  const [isBaristaMode, setIsBaristaMode] = useState(false);
  
  
  // State untuk menampung ID Add-on terpilih
  const [selectedAddons, setSelectedAddons] = useState<number[]>([]);
  
  // State untuk POS Options (Barista Spec / Metadata)
  // Ambil label dari item pertama di dalam array sizes jika ada
  const [selectedSize, setSelectedSize] = useState('Regular');

  const [posOptions, setPosOptions] = useState<POSOptions>({
    temperature: item.meta?.serve_temperature === 'cold' ? 'Serve Iced' : 'Serve Hot',
    shots: 1,
    milk: 'Standard Whole Milk',
    sweetness: 'Normal Sweet',
    syrup: []
  });

  const [totalPrice, setTotalPrice] = useState(item.basePrice);

  // ─── Perhitungan Harga Otomatis ──────────────────────────────────────────
  useEffect(() => {
    let base = Number(item.basePrice);
    let extra = 0;

    // 1. Hitung berdasarkan Ukuran (Meta POS)
    if (item.meta) {
      const sizeDef = item.meta.sizes?.find(s => s.label === selectedSize);
      if (sizeDef) base = Number(sizeDef.price);
      
      // Logika tambahan untuk kustomisasi POS (Contoh: Extra Shots)
      if (posOptions.shots && posOptions.shots > 1) {
        extra += (posOptions.shots - 1) * 8000;
      }
    }

    // 2. Hitung berdasarkan Kategori Add-ons (Deep Search)
    if (item.categorizedAddons && Array.isArray(item.categorizedAddons)) {
      selectedAddons.forEach(addonId => {
        item.categorizedAddons?.forEach((group: any) => {
          const addonData = group.addons?.find((a: any) => Number(a.id) === Number(addonId));
          if (addonData) {
            extra += Number(addonData.price);
          }
        });
      });
    }

    setTotalPrice((base + extra) * quantity);
  }, [selectedSize, posOptions, selectedAddons, item, quantity]);


  // ─── Logika Validasi Pilihan Wajib (isRequired) ──────────────────────────
  const checkIsValid = () => {
    if (!item.categorizedAddons || !Array.isArray(item.categorizedAddons)) return true;

    for (const group of item.categorizedAddons) {
      const isRequired = group.is_required || group.isRequired;
      
      if (isRequired) {
        const groupAddonIds = group.addons.map((a: any) => Number(a.id));
        const hasSelection = selectedAddons.some(id => groupAddonIds.includes(id));
        // Jika ada grup wajib yang belum dipilih, langsung return false
        if (!hasSelection) return false;
      }
    }
    return true;
  };

  const isValid = checkIsValid();


  // ─── Handlers Dinamis Radio & Checkbox ───────────────────────────────────
  const handleSelectAddon = (addonId: number, group: any) => {
    const maxSelected = group.max_selected || 0; 
    const isRequired = group.is_required || group.isRequired;
    const groupAddonIds = group.addons.map((a: any) => Number(a.id));

    setSelectedAddons(prev => {
      const isAlreadySelected = prev.includes(addonId);

      // LOGIKA RADIO (Maksimal 1 Opsi)
      if (maxSelected === 1) {
        if (isAlreadySelected) {
          // Boleh di-uncheck HANYA JIKA tidak wajib
          if (!isRequired) return prev.filter(id => id !== addonId);
          return prev;
        }
        // Hapus pilihan lama di grup ini, masukkan yang baru
        const filteredPrev = prev.filter(id => !groupAddonIds.includes(id));
        return [...filteredPrev, addonId];
      } 
      
      // LOGIKA CHECKBOX (Lebih dari 1 Opsi atau Bebas)
      else {
        if (isAlreadySelected) {
          return prev.filter(id => id !== addonId);
        } else {
          // Cek batas maksimal pilihan
          if (maxSelected > 1) {
            const currentSelectedInGroup = prev.filter(id => groupAddonIds.includes(id)).length;
            if (currentSelectedInGroup >= maxSelected) {
              return prev; // Jangan tambahkan jika sudah mencapai batas maksimal
            }
          }
          return [...prev, addonId];
        }
      }
    });
  };

  const formatIDR = (price: number) => {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR', 
      minimumFractionDigits: 0 
    }).format(price).replace(/\s/g, '');
  };

  const handleAddToCart = () => {
    
    if (!isValid) return; // Keamanan ganda

    const completeOptions = { ...posOptions, size: selectedSize };
    const cleanAddons = selectedAddons.filter(id => !isNaN(id) && id !== null);

    onAddToCart(
      slug,
      item, 
      cleanAddons, 
      quantity, 
      item.meta ? completeOptions : undefined, 
      item.meta?.sku_code
    );
    
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col bg-white overflow-hidden font-sans"
    >
      <motion.div layoutId={`product-${item.id}`} className="w-full h-full flex flex-col relative z-10">
        
        {/* Header Image */}
        <div className="w-full h-[220px] sm:h-[280px] relative bg-stone-100 flex-shrink-0">
          <img 
            src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'} 
            alt={item.name} 
            className="w-full h-full object-cover"
          />
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-50 w-9 h-9 bg-white/90 backdrop-blur-sm text-stone-900 rounded-full flex items-center justify-center shadow-sm active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
          
          {item.meta?.barista_recipe && (
            <button 
              onClick={() => setIsBaristaMode(!isBaristaMode)}
              className={`absolute bottom-6 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg border backdrop-blur-md transition-colors ${
                isBaristaMode ? 'bg-[#0E5C37] text-white border-[#0E5C37]' : 'bg-white/90 text-stone-700 border-white/20'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-wider font-bold">Barista Spec</span>
            </button>
          )}
        </div>

        {/* Content Container */}
        <div className="flex-1 flex flex-col min-h-0 bg-white relative z-10 -mt-4 rounded-t-2xl shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
          <div className="flex-1 overflow-y-auto custom-scrollbar pb-6">
            
            <header className="px-5 py-6 border-b border-stone-100">
              <div className="flex justify-between items-start gap-4 mb-1">
                <h1 className="text-xl font-bold text-stone-900 leading-tight">{item.name}</h1>
                {item.meta?.sku_code && (
                  <span className="font-mono text-[10px] px-2 py-1 bg-stone-100 text-stone-500 rounded uppercase tracking-widest">
                    {item.meta.sku_code}
                  </span>
                )}
              </div>
              <span className="font-semibold text-lg text-[#0E5C37] block mb-2">
                {formatIDR(item.basePrice)}
              </span>
              <div 
                className="text-sm text-stone-600 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: item.description || '' }}
              />
            </header>

            {/* Barista Spec Overlay (Jika Aktif) */}
            <AnimatePresence>
              {isBaristaMode && item.meta?.barista_recipe && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-stone-900 text-stone-50 overflow-hidden"
                >
                  <div className="p-5 border-l-4 border-emerald-500 font-mono">
                    <div className="flex items-center gap-2 mb-4 text-emerald-400 font-bold uppercase tracking-widest text-sm">
                      <Coffee className="w-5 h-5" /> Extraction Targets
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div><span className="text-stone-500 block">Dose</span>{item.meta.barista_recipe.dose_grams}g</div>
                      <div><span className="text-stone-500 block">Yield</span>{item.meta.barista_recipe.yield_ml}ml</div>
                      <div><span className="text-stone-500 block">Time</span>{item.meta.barista_recipe.extraction_time_seconds}s</div>
                      <div><span className="text-stone-500 block">Steam</span>{item.meta.barista_recipe.steam_temperature_celsius}°C</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Render Customization / Addons Berdasarkan Kategori */}
            <div className="divide-y divide-stone-100">
              {item.categorizedAddons?.map((group: any) => {
                const isSingleChoice = group.maxSelected === 1;
                const isRequired = group.is_required || group.isRequired;

                return (
                  <section key={group.categoryName} className="py-5 px-5">
                    <div className="mb-3 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-stone-900">{group.categoryName}</h3>
                          {/* 🔴 Badge WAJIB */}
                          {isRequired && (
                            <span className="bg-red-50 text-red-600 border border-red-200 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest">
                              Required
                            </span>
                          )}
                        </div>
                        {/* 🔴 Teks Max Selected */}
                        <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">
                          {isSingleChoice 
                            ? 'Pilih 1 Opsi' 
                            : group.maxSelected > 1 
                              ? `Pilih Maks. ${group.maxSelected}` 
                              : 'Pilihan (Opsional)'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {group.addons?.map((addon: any) => (
                        <label 
                          key={addon.id} 
                          className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer hover:bg-stone-50 transition-all ${
                            selectedAddons.includes(addon.id) ? 'border-[#0E5C37] bg-emerald-50' : 'border-stone-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input 
                              type={isSingleChoice ? "radio" : "checkbox"} // 🔴 Dinamis: Radio atau Checkbox
                              name={`addon-group-${group.categoryName}`}
                              checked={selectedAddons.includes(addon.id)}
                              onChange={() => handleSelectAddon(addon.id, group)}
                              className={`w-5 h-5 accent-[#0E5C37] cursor-pointer ${
                                isSingleChoice ? 'rounded-full' : 'rounded'
                              }`}
                            />
                            <span className={`text-sm font-medium ${selectedAddons.includes(addon.id) ? 'text-[#0E5C37]' : 'text-stone-700'}`}>
                              {addon.name}
                            </span>
                          </div>
                          <span className={`text-sm font-bold ${selectedAddons.includes(addon.id) ? 'text-[#0E5C37]' : 'text-stone-900'}`}>
                            {addon.price > 0 ? `+${formatIDR(addon.price)}` : 'Gratis'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </section>
                );
              })}

              {/* Ukuran (Jika ada di Meta) */}
              {item.meta?.sizes && (
                <section className="py-5 px-5">
                  <h3 className="text-sm font-bold text-stone-900 mb-3">Pilih Ukuran</h3>
                  <div className="flex gap-2">
                    {item.meta.sizes.map(size => (
                      <button
                        key={size.label}
                        onClick={() => setSelectedSize(size.label)}
                        className={`flex-1 py-3 rounded-xl border font-semibold transition-all ${
                          selectedSize === size.label 
                            ? 'border-[#0E5C37] bg-emerald-50 text-[#0E5C37]' 
                            : 'border-stone-200 text-stone-600'
                        }`}
                      >
                        {size.label}
                        <span className="block text-[10px] font-normal opacity-70">{size.volume_ml}ml</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* Bottom Bar: Quantity & Add Button */}
          <div className="p-4 bg-white border-t border-stone-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
            <div className="flex justify-between items-center mb-4 px-1">
              <span className="text-stone-500 text-xs font-bold uppercase tracking-wide">Jumlah</span>
              <div className="flex items-center gap-4">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="text-stone-400 active:scale-90 transition-transform">
                  <MinusCircle className="w-8 h-8" />
                </button>
                <span className="font-bold text-lg text-stone-900 w-6 text-center">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="text-[#0E5C37] active:scale-90 transition-transform">
                  <PlusCircle className="w-8 h-8" />
                </button>
              </div>
            </div>

            <button 
              onClick={handleAddToCart}
              disabled={!isValid}
              className={`w-full text-white rounded-xl h-[56px] font-bold flex items-center justify-between px-6 transition-all shadow-lg ${
                isValid 
                  ? 'bg-[#0E5C37] active:scale-[0.98] shadow-emerald-900/20' 
                  : 'bg-stone-300 cursor-not-allowed shadow-none'
              }`}
            >
              {/* 🔴 Teks Dinamis: Jika belum valid, teks akan menyuruh melengkapi */}
              <span>{isValid ? 'Tambahkan' : 'Pilih Opsi Wajib'}</span>
              
              {isValid && (
                <span className="bg-white/10 px-3 py-1 rounded-lg">{formatIDR(totalPrice)}</span>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}