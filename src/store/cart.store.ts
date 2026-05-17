import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, MenuItem } from '../types/menu';

// State baru: Keranjang disimpan berdasarkan Slug Toko (Record<string, CartItem[]>)
interface CartState {
  cartsBySlug: Record<string, CartItem[]>;
  
  // Semua fungsi sekarang menerima parameter 'slug' pertama kali
  addItem: (slug: string, product: MenuItem, selections: any, quantity: number, options?: any, sku_code?: string) => void;
  removeItem: (slug: string, id: string) => void;
  updateQuantity: (slug: string, id: string, delta: number) => void;
  clearCart: (slug: string) => void;
  getTotalItems: (slug: string) => number;
  calculateTotal: (slug: string, menuItems: MenuItem[]) => number;
  
  // Utility untuk mengambil item keranjang di toko tertentu
  getCartBySlug: (slug: string) => CartItem[];
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      // Inisialisasi awal objek kosong
      cartsBySlug: {},
      
      getCartBySlug: (slug) => {
        return get().cartsBySlug[slug] || [];
      },

      addItem: (slug, product, selections, quantity, options, sku_code) => {
        let sanitized: number[] = [];

        // Konversi masukan menjadi array angka murni
        if (Array.isArray(selections)) {
          sanitized = selections
            .map(item => {
              if (typeof item === 'object' && item !== null && 'choiceIds' in item) {
                return Number(item.choiceIds);
              }
              return Number(item);
            })
            .filter(id => !isNaN(id) && id !== 0)
            .sort();
        }

        // Ambil keranjang milik toko tersebut (atau array kosong jika belum ada)
        const currentCart = get().cartsBySlug[slug] || [];

        // Cari item yang sama untuk penggabungan kuantitas
        const existingItem = currentCart.find(item => 
          item.menuItemId === product.id && 
          JSON.stringify(item.selectedAddOns) === JSON.stringify(sanitized) &&
          JSON.stringify(item.options) === JSON.stringify(options)
        );

        if (existingItem) {
          // Update kuantitas item yang sudah ada
          const updatedCart = currentCart.map(i => 
            i.id === existingItem.id ? { ...i, quantity: i.quantity + quantity } : i
          );
          set((state) => ({ 
            cartsBySlug: { ...state.cartsBySlug, [slug]: updatedCart } 
          }));
        } else {
          // Tambahkan item baru ke keranjang toko tersebut
          const newItem = { 
            id: Math.random().toString(36).substring(2, 9), 
            menuItemId: product.id, 
            quantity, 
            selectedAddOns: sanitized, 
            options,
            sku_code
          };
          set((state) => ({ 
            cartsBySlug: { ...state.cartsBySlug, [slug]: [...currentCart, newItem] } 
          }));
        }
      },

      removeItem: (slug, id) => {
        const currentCart = get().cartsBySlug[slug] || [];
        const updatedCart = currentCart.filter(i => i.id !== id);
        set((state) => ({ 
          cartsBySlug: { ...state.cartsBySlug, [slug]: updatedCart } 
        }));
      },

      updateQuantity: (slug, id, delta) => {
        const currentCart = get().cartsBySlug[slug] || [];
        const updatedCart = currentCart.map(i => 
          i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
        ).filter(i => i.quantity > 0);
        
        set((state) => ({ 
          cartsBySlug: { ...state.cartsBySlug, [slug]: updatedCart } 
        }));
      },

      clearCart: (slug) => {
        set((state) => ({ 
          cartsBySlug: { ...state.cartsBySlug, [slug]: [] } 
        }));
      },

      getTotalItems: (slug) => {
        const currentCart = get().cartsBySlug[slug] || [];
        return currentCart.reduce((acc, item) => acc + item.quantity, 0);
      },

      calculateTotal: (slug, menuItems) => {
        const currentCart = get().cartsBySlug[slug] || [];
        
        return currentCart.reduce((total, cartItem) => {
          const product = menuItems.find(i => i.id === cartItem.menuItemId);
          
          if (!product) return total;
          
          let itemPrice = Number(product.basePrice);
          
          if (cartItem.options && product.meta) {
            const sizeDef = product.meta.sizes?.find((s: any) => s.label === cartItem.options!.size);
            if (sizeDef) itemPrice = Number(sizeDef.price);
          }

          if (Array.isArray(cartItem.selectedAddOns) && product.categorizedAddons) {
            cartItem.selectedAddOns.forEach((id: any) => {
              product.categorizedAddons?.forEach((category: any) => {
                const addonData = category.addons?.find((a: any) => Number(a.id) === Number(id));
                if (addonData) {
                  itemPrice += Number(addonData.price);
                }
              });
            });
          }
          
          return total + (itemPrice * cartItem.quantity);
        }, 0);
      },
    }),
    {
      name: 'evokasir-multi-cart', // Ganti nama agar bersih dari cache lama
    }
  )
);