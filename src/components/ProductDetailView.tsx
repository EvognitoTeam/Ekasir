/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, MinusCircle, PlusCircle, AlertCircle, ImageIcon } from 'lucide-react';
import { MenuItem } from '@/types/menu';
import { useParams } from 'next/navigation';
import { applyFallbackImage, normalizeImageSrc } from '@/utils/image';

// IMPORT TOAST SWEETALERT
import { Toast } from '@/utils/toast'; 

interface Props {
  item: MenuItem;
  onClose: () => void;
  onAddToCart: (slug: string, item: MenuItem, selections: any, quantity: number, options?: any, sku_code?: string) => void;
}

export default function ProductDetailView({ item, onClose, onAddToCart }: Props) {
  const params = useParams();
  const slug = (params.mitraSlug as string) || "";
  
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<number[]>([]);
  const [selectedSize, setSelectedSize] = useState(item.meta?.sizes?.[0]?.label || 'Regular');
  // const [totalPrice, setTotalPrice] = useState(item.basePrice);

  const stockNum = item.stock !== null && item.stock !== undefined ? Number(item.stock) : 0;
  const isSoldOut = (item.isAvailable === false) || (stockNum <= 0);
  const isLowStock = !isSoldOut && stockNum > 0 && stockNum <= 5; 

  // ─── Perhitungan Harga Otomatis ──────────────────────────────────────────
  // useEffect(() => {
  //   let base = Number(item.basePrice);
  //   let extra = 0;

  //   if (item.meta && item.meta.sizes) {
  //     const sizeDef = item.meta.sizes.find((s: any) => s.label === selectedSize);
  //     if (sizeDef) base = Number(sizeDef.price);
  //   }

  //   if (item.categorizedAddons && Array.isArray(item.categorizedAddons)) {
  //     selectedAddons.forEach(addonId => {
  //       item.categorizedAddons?.forEach((group: any) => {
  //         const addonData = group.addons?.find((a: any) => Number(a.id) === Number(addonId));
  //         if (addonData) {
  //           extra += Number(addonData.price);
  //         }
  //       });
  //     });
  //   }

  //   setTotalPrice((base + extra) * quantity);
  // }, [selectedSize, selectedAddons, item, quantity]);

  const totalPrice = useMemo(() => {
    let base = Number(item.basePrice);
    let extra = 0;

    // 1. Hitung berdasarkan Ukuran
    if (item.meta && item.meta.sizes) {
      const sizeDef = item.meta.sizes.find((s: any) => s.label === selectedSize);
      if (sizeDef) base = Number(sizeDef.price);
    }

    // 2. Hitung berdasarkan Kategori Add-ons
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

    // Langsung return hasilnya
    return (base + extra) * quantity;
  }, [selectedSize, selectedAddons, item, quantity]);

  // ─── Logika Validasi Pilihan Wajib (isRequired) ──────────────────────────
  const checkIsValid = () => {
    if (!item.categorizedAddons || !Array.isArray(item.categorizedAddons)) return true;

    for (const group of item.categorizedAddons) {
      // 🔴 Amankan pembacaan key isRequired / is_required
      const isRequired = Boolean(group.is_required || group.isRequired);
      
      if (isRequired) {
        const groupAddonIds = group.addons.map((a: any) => Number(a.id));
        const hasSelection = selectedAddons.some(id => groupAddonIds.includes(id));
        if (!hasSelection) return false;
      }
    }
    return true;
  };

  const isValid = checkIsValid();

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSelectAddon = (addonId: number, group: any) => {
    const maxSelected = Number(group.maxSelected || group.max_selected || 0);
    const isSingleChoice = maxSelected === 1; // <-- Ini penyebabnya
    const isRequired = Boolean(group.isRequired || group.is_required);
    const isRadioUI = maxSelected === 1 && isRequired;
    const groupAddonIds = group.addons.map((a: any) => Number(a.id));

    setSelectedAddons(prev => {
      const isAlreadySelected = prev.includes(addonId);

      if (maxSelected === 1) {
        if (isAlreadySelected) {
          // 🔴 KUNCI UTAMA: Jika tidak wajib (optional), izinkan untuk di-uncheck!
          if (!isRequired) return prev.filter(id => id !== addonId);
          return prev; // Jika wajib (required), tidak boleh kosong
        }
        // Bersihkan opsi lain di grup ini, lalu masukkan yang baru diklik
        const filteredPrev = prev.filter(id => !groupAddonIds.includes(id));
        return [...filteredPrev, addonId];
      } else {
        if (isAlreadySelected) {
          return prev.filter(id => id !== addonId);
        } else {
          if (maxSelected > 1) {
            const currentSelectedInGroup = prev.filter(id => groupAddonIds.includes(id)).length;
            if (currentSelectedInGroup >= maxSelected) return prev;
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

  const handleIncreaseQty = () => {
    if (quantity < stockNum) {
      setQuantity(quantity + 1);
    } else {
      Toast.fire({
        icon: 'warning',
        title: `Maksimal pembelian sisa ${stockNum} porsi!`
      });
    }
  };

  const handleAddToCart = () => {
    if (!isValid || isSoldOut) return; 

    const finalOptions = item.meta?.sizes ? { size: selectedSize } : undefined;
    const cleanAddons = selectedAddons.filter(id => !isNaN(id) && id !== null);

    onAddToCart(slug, item, cleanAddons, quantity, finalOptions, item.meta?.sku_code);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[120] flex flex-col overflow-hidden bg-white font-sans">
      <motion.div layoutId={`product-${item.id}`} className="w-full h-full flex flex-col relative z-10">
        
        {/* Header Image */}
        <div className="relative h-[190px] w-full flex-shrink-0 overflow-hidden bg-stone-100 sm:h-[220px]">
          {item.image ? (
            <img
              src={normalizeImageSrc(item.image)}
              alt={item.name}
              onError={applyFallbackImage}
              className="absolute inset-0 z-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center z-0">
              <ImageIcon className="w-12 h-12 text-stone-300" />
            </div>
          )}
          
          <button 
            onClick={onClose} 
            className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-[140] flex h-11 w-11 items-center justify-center rounded-full bg-stone-950/75 text-white shadow-xl ring-1 ring-white/20 backdrop-blur-md transition-transform active:scale-95"
          >
            <X className="w-5 h-5" strokeWidth={2.25} />
          </button>
        </div>

        {/* Content Container */}
        <div className="flex-1 flex flex-col min-h-0 bg-white relative z-10 -mt-4 rounded-t-2xl shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
          <div className="flex-1 overflow-y-auto custom-scrollbar pb-6">
            <header className="px-5 py-6 border-b border-stone-100">
              <div className="flex justify-between items-start gap-4 mb-1">
                <h1 className="text-xl font-bold text-stone-900 leading-tight">{item.name}</h1>
                {item.meta?.sku_code && (
                  <span className="font-mono text-[10px] px-2 py-1 bg-stone-100 text-stone-500 rounded uppercase tracking-widest shrink-0">{item.meta.sku_code}</span>
                )}
              </div>
              <span className="font-semibold text-lg text-[#0E5C37] block mb-2">{formatIDR(item.basePrice)}</span>
              <div className="text-sm text-stone-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: item.description || '' }} />
            </header>

            <div className="divide-y divide-stone-100">
              {item.categorizedAddons?.map((group: any) => {
                // 🔴 PERBAIKAN 2: Gunakan pembacaan yang sama untuk UI
                const maxSelected = Number(group.maxSelected || group.max_selected || 0);
                const isRequired = Boolean(group.isRequired || group.is_required);
                const isRadioUI = maxSelected === 1 && isRequired;
                
                return (
                  <section key={group.categoryName} className="py-5 px-5">
                    <div className="mb-3 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-stone-900">{group.categoryName}</h3>
                          {isRequired && <span className="bg-red-50 text-red-600 border border-red-200 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest">Required</span>}
                        </div>
                        {/* 🔴 Teks akan berubah menjadi "Pilihan (Opsional)" jika tidak wajib */}
                        <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">
                          {isRadioUI ? 'Pilih 1 Opsi' : maxSelected > 1 ? `Pilih Maks. ${maxSelected}` : 'Pilihan (Opsional)'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {group.addons?.map((addon: any) => {
                        const isSelected = selectedAddons.includes(Number(addon.id));
                        
                        return (
                          <label key={addon.id} className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer hover:bg-stone-50 transition-all ${isSelected ? 'border-[#0E5C37] bg-emerald-50' : 'border-stone-100'}`}>
                            <div className="flex items-center gap-3">
                              {/* 🔴 Gunakan isRadioUI di type dan className */}
                              <input 
                                type={isRadioUI ? "radio" : "checkbox"} 
                                name={`addon-group-${group.categoryName}`}
                                checked={isSelected} 
                                onChange={() => handleSelectAddon(Number(addon.id), group)} 
                                className={`w-5 h-5 accent-[#0E5C37] cursor-pointer ${isRadioUI ? 'rounded-full' : 'rounded'}`} 
                              />
                              <span className={`text-sm font-medium ${isSelected ? 'text-[#0E5C37]' : 'text-stone-700'}`}>{addon.name}</span>
                            </div>
                            <span className={`text-sm font-bold ${isSelected ? 'text-[#0E5C37]' : 'text-stone-900'}`}>{addon.price > 0 ? `+${formatIDR(addon.price)}` : 'Gratis'}</span>
                          </label>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-white border-t border-stone-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
            <div className="flex justify-between items-end mb-4 px-1">
              <div className="flex flex-col">
                <span className="text-stone-500 text-xs font-bold uppercase tracking-wide">Jumlah</span>
                {!isSoldOut ? (
                  <div className={`flex items-center gap-1 mt-0.5 ${isLowStock ? 'text-rose-500' : 'text-stone-400'}`}>
                    {isLowStock && <AlertCircle className="w-3 h-3" />}
                    <span className="text-[10px] font-bold">Sisa Stok: {stockNum}</span>
                  </div>
                ) : (
                  <span className="text-[10px] font-black text-rose-600 uppercase tracking-wide mt-0.5">Stok Habis</span>
                )}
              </div>

              {!isSoldOut && (
                <div className="flex items-center gap-4">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="text-stone-400 hover:text-stone-600 active:scale-90 transition-all"><MinusCircle className="w-8 h-8" /></button>
                  <span className="font-bold text-lg text-stone-900 w-6 text-center">{quantity}</span>
                  <button onClick={handleIncreaseQty} className="text-[#0E5C37] hover:text-emerald-700 active:scale-90 transition-all"><PlusCircle className="w-8 h-8" /></button>
                </div>
              )}
            </div>

            <button 
              onClick={handleAddToCart}
              disabled={!isValid || isSoldOut}
              className={`w-full text-white rounded-xl h-[56px] font-bold flex items-center justify-between px-6 transition-all shadow-lg ${
                isValid && !isSoldOut ? 'bg-[#0E5C37] active:scale-[0.98] shadow-emerald-900/20' : 'bg-stone-300 cursor-not-allowed shadow-none'
              }`}
            >
              <span>{isSoldOut ? 'Habis' : (isValid ? 'Tambahkan' : 'Pilih Opsi Wajib')}</span>
              {isValid && !isSoldOut && (
                <span className="bg-white/10 px-3 py-1 rounded-lg">{formatIDR(totalPrice)}</span>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}