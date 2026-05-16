import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, MenuItem } from '../types/menu';

interface CartState {
  items: CartItem[];
  addItem: (product: MenuItem, selections: any, quantity: number, options?: any, sku_code?: string) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  calculateTotal: (menuItems: MenuItem[]) => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product, selections, quantity, options, sku_code) => {
        let sanitized: number[] = [];

        // Konversi masukan menjadi array angka murni [1, 2]
        if (Array.isArray(selections)) {
          sanitized = selections
            .map(item => {
              // Jika tidak sengaja menerima format objek legacy, ambil choiceIds-nya
              if (typeof item === 'object' && item !== null && 'choiceIds' in item) {
                return Number(item.choiceIds);
              }
              // Jika sudah benar (ID murni), langsung konversi ke Number
              return Number(item);
            })
            .filter(id => !isNaN(id) && id !== 0)
            .sort();
        }

        // Cari item yang sama untuk penggabungan kuantitas
        const existingItem = get().items.find(item => 
          item.menuItemId === product.id && 
          JSON.stringify(item.selectedAddOns) === JSON.stringify(sanitized) &&
          JSON.stringify(item.options) === JSON.stringify(options)
        );

        if (existingItem) {
          set({ 
            items: get().items.map(i => 
              i.id === existingItem.id ? { ...i, quantity: i.quantity + quantity } : i
            )
          });
        } else {
          set({ 
            items: [
              ...get().items, 
              { 
                id: Math.random().toString(36).substring(2, 9), 
                menuItemId: product.id, 
                quantity, 
                selectedAddOns: sanitized, 
                options,
                sku_code
              }
            ]
          });
        }
      },

      removeItem: (id) => set({ items: get().items.filter(i => i.id !== id) }),

      updateQuantity: (id, delta) => set({
        items: get().items.map(i => 
          i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
        ).filter(i => i.quantity > 0)
      }),

      clearCart: () => set({ items: [] }),

      getTotalItems: () => get().items.reduce((acc, item) => acc + item.quantity, 0),

      calculateTotal: (menuItems) => {
        return get().items.reduce((total, cartItem) => {
          const product = menuItems.find(i => i.id === cartItem.menuItemId);
          
          // console.log(`Produk: ${product?.name}`, "Addons yang tersedia di produk ini:", product?.addons);
          // console.log("Addons yang dipilih user (ID):", cartItem.selectedAddOns);
          if (!product) return total;
          
          let itemPrice = Number(product.basePrice);
          
          if (cartItem.options && product.meta) {
            const sizeDef = product.meta.sizes?.find((s: any) => s.label === cartItem.options!.size);
            if (sizeDef) itemPrice = Number(sizeDef.price);
          }

          // 2. Gunakan perbandingan Number yang aman
          if (Array.isArray(cartItem.selectedAddOns) && product.categorizedAddons) {
            cartItem.selectedAddOns.forEach((id: any) => {
              // Kita iterasi setiap kategori untuk mencari addon yang cocok
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
      name: 'evokasir-cart-v2', // Ganti nama storage agar tidak bentrok dengan versi lama
    }
  )
);