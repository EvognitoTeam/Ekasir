import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation'; // Untuk mengambil slug kedai
import { useCartStore } from '../store/cart.store';
import { useMenuStore } from '../store/menu.store';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Trash2, ShoppingBag, Sparkles, Receipt, ArrowRight } from 'lucide-react';
import { CartItem, MenuItem } from '../types/menu';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

// Helper untuk format mata uang
const formatIDR = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
    .format(n).replace(/\s/g, '');

export default function CartSheet({ isOpen, onClose, onCheckout }: Props) {
  const params = useParams();
  const slug = params.mitraSlug as string;

  const { items: cartItems, updateQuantity, removeItem, calculateTotal } = useCartStore();
  const { items: menuItems } = useMenuStore();

  // 1. State untuk menyimpan pengaturan dari database
  const [settings, setSettings] = useState({ taxRate: 0, serviceRate: 0, isTaxIncluded: false });

  // 2. Ambil Settings Pajak dari API
  useEffect(() => {
    const fetchSettings = async () => {
      if (!slug || !isOpen) return; // Hanya fetch jika cart terbuka agar hemat resource
      
      try {
        const res = await fetch(`/api/settings?slug=${slug}`);
        const data = await res.json();
        
        if (data.success) {
          setSettings({
            taxRate: data.data.taxRate || 0,
            serviceRate: data.data.serviceRate || 0,
            isTaxIncluded: data.data.isTaxIncluded === 1
          });
        }
      } catch (error) {
        console.warn("Gagal fetch settings di cart, menggunakan nilai 0.");
      }
    };
    fetchSettings();
  }, [slug, isOpen]);

  // 3. Kalkulasi dinamis berdasarkan pengaturan
  const getCartTotals = () => {
    const subtotal = calculateTotal(menuItems);
    let tax = 0;
    let service = 0;

    if (!settings.isTaxIncluded) {
      service = subtotal * (settings.serviceRate / 100);
      tax = subtotal * (settings.taxRate / 100);
    }

    const total = subtotal + tax + service;
    return { subtotal, tax, service, total };
  };

  const { subtotal, tax, service, total } = getCartTotals();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
            className="fixed top-0 right-0 w-full max-w-md h-full bg-white z-50 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <header className="px-8 pt-12 pb-8 border-b border-stone-100">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0E5C37] text-white flex items-center justify-center shadow-lg">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 block">Your Order</span>
                    <span className="text-sm font-bold text-stone-900">{cartItems.length} Items Selected</span>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="w-10 h-10 rounded-full border border-stone-100 flex items-center justify-center hover:bg-stone-50 transition-all"
                >
                  <X className="w-4 h-4 text-stone-500" />
                </button>
              </div>
            </header>

            {/* List Items */}
            <div className="flex-1 overflow-y-auto px-8 py-6 no-scrollbar">
              {cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                  <Sparkles className="w-12 h-12 mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">Keranjang Kosong</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {cartItems.map((item: CartItem) => {
                    const product = menuItems.find((i: MenuItem) => i.id === item.menuItemId);
                    if (!product) return null;

                    // Hitung harga per item secara dinamis
                    let unitPrice = Number(product.basePrice);
                    const labels: string[] = [];

                    // 1. Logika Size & POS Meta
                    if (item.options && product.meta) {
                      const sizeDef = product.meta.sizes?.find((s: any) => s.label === item.options!.size);
                      if (sizeDef) unitPrice = Number(sizeDef.price);
                      if (item.options.size) labels.push(item.options.size);
                      if (item.options.temperature) labels.push(item.options.temperature.replace('Serve ', ''));
                    }

                    // 2. Logika Categorized Addons (New System)
                    if (Array.isArray(item.selectedAddOns) && product.categorizedAddons) {
                      item.selectedAddOns.forEach((id: any) => {
                        product.categorizedAddons?.forEach((group: any) => {
                          const addon = group.addons.find((a: any) => Number(a.id) === Number(id));
                          if (addon) {
                            unitPrice += Number(addon.price);
                            labels.push(addon.name);
                          }
                        });
                      });
                    }

                    return (
                      <motion.div key={item.id} layout className="flex gap-4 group">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-stone-100 shadow-sm">
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h4 className="text-sm font-bold text-stone-900 truncate pr-2">{product.name}</h4>
                            <button 
                              onClick={() => removeItem(item.id)}
                              className="text-stone-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          {labels.length > 0 && (
                            <p className="text-[10px] text-stone-400 mt-1 font-medium italic">
                              {labels.join(' · ')}
                            </p>
                          )}

                          <div className="flex justify-between items-center mt-3">
                            <span className="text-sm font-bold text-[#0E5C37]">
                              {formatIDR(unitPrice * item.quantity)}
                            </span>
                            <div className="flex items-center gap-3 bg-stone-50 rounded-full px-3 py-1 border border-stone-100">
                              <button onClick={() => updateQuantity(item.id, -1)} className="hover:text-red-500 transition-colors">
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, 1)} className="hover:text-[#0E5C37] transition-colors">
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Total Settlement */}
            <div className="bg-stone-50 p-8 border-t border-stone-100">
              <div className="space-y-3 mb-8">
                <div className="flex justify-between text-xs text-stone-500">
                  <span>Subtotal</span>
                  <span className="font-bold text-stone-900">{formatIDR(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-stone-500">
                  <div className="flex items-center gap-1">
                    {/* Tulisan berubah sesuai database */}
                    <span>Tax & Service</span>
                    <Receipt className="w-3 h-3 opacity-30" />
                  </div>
                  <span className="font-bold text-stone-900">
                    {/* Tampilkan 'Included' jika pajak sudah digabung harga */}
                    {settings.isTaxIncluded ? 'Included' : formatIDR(tax + service)}
                  </span>
                </div>
                <div className="pt-4 border-t border-stone-200 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Total Settlement</p>
                    <p className="text-2xl font-bold text-[#0E5C37]">{formatIDR(total)}</p>
                  </div>
                </div>
              </div>

              <button
                disabled={cartItems.length === 0}
                onClick={onCheckout}
                className="w-full bg-[#0E5C37] disabled:opacity-30 text-white py-4 rounded-2xl flex items-center justify-center gap-3 font-bold shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all"
              >
                <span>Checkout Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}