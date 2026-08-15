import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, MenuItem } from '../types/menu';

export interface CouponData {
  id: string | number;
  code?: string;
  coupon_code?: string;
  
  // Format Data Asli dari Backend / Database
  discountRate?: number | null;
  discount_rate?: number | null;
  discountPrice?: number | string | null;
  discount_price?: number | string | null;
  
  // Format Mapped (Opsional)
  type?: 'percentage' | 'fixed';
  value?: number;
  max_discount?: number;

  min_purchase?: number;
  is_auto_apply?: boolean | number;
  applicable_items?: any; // Bisa string JSON atau Array
}

export interface CartCalculation {
  subtotal: number;
  discountAmount: number;
  total: number;
}

interface CartState {
  cartsBySlug: Record<string, CartItem[]>;
  appliedCouponsBySlug: Record<string, CouponData | null>;
  
  addItem: (slug: string, product: MenuItem, selections: any, quantity: number, options?: any, sku_code?: string) => void;
  removeItem: (slug: string, id: string) => void;
  updateQuantity: (slug: string, id: string, delta: number) => void;
  clearCart: (slug: string) => void;
  getTotalItems: (slug: string) => number;
  
  calculateTotal: (slug: string, menuItems: MenuItem[]) => CartCalculation;
  
  getCartBySlug: (slug: string) => CartItem[];
  getAppliedCoupon: (slug: string) => CouponData | null;
  applyCouponManual: (slug: string, coupon: CouponData) => void;
  removeCoupon: (slug: string) => void;
  autoApplyBestCoupon: (slug: string, menuItems: MenuItem[], availableCoupons: CouponData[]) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cartsBySlug: {},
      appliedCouponsBySlug: {}, 
      
      getCartBySlug: (slug) => {
        return get().cartsBySlug[slug] || [];
      },

      getAppliedCoupon: (slug) => {
        return get().appliedCouponsBySlug[slug] || null;
      },

      applyCouponManual: (slug, coupon) => {
        set((state) => ({
          appliedCouponsBySlug: { ...state.appliedCouponsBySlug, [slug]: coupon }
        }));
      },

      removeCoupon: (slug) => {
        set((state) => ({
          appliedCouponsBySlug: { ...state.appliedCouponsBySlug, [slug]: null }
        }));
      },

      addItem: (slug, product, selections, quantity, options, sku_code) => {
        let sanitized: number[] = [];

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

        const currentCart = get().cartsBySlug[slug] || [];

        const existingItem = currentCart.find(item => 
          item.menuItemId === product.id && 
          JSON.stringify(item.selectedAddOns) === JSON.stringify(sanitized) &&
          JSON.stringify(item.options) === JSON.stringify(options)
        );

        if (existingItem) {
          const updatedCart = currentCart.map(i => 
            i.id === existingItem.id ? { ...i, quantity: i.quantity + quantity } : i
          );
          set((state) => ({ 
            cartsBySlug: { ...state.cartsBySlug, [slug]: updatedCart } 
          }));
        } else {
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
          cartsBySlug: { ...state.cartsBySlug, [slug]: [] },
          appliedCouponsBySlug: { ...state.appliedCouponsBySlug, [slug]: null }
        }));
      },

      getTotalItems: (slug) => {
        const currentCart = get().cartsBySlug[slug] || [];
        return currentCart.reduce((acc, item) => acc + item.quantity, 0);
      },

      // 🟢 1. KALKULASI DISKON SEKARANG MENDUKUNG FORMAT API ASLI
      calculateTotal: (slug, menuItems) => {
        const currentCart = get().cartsBySlug[slug] || [];
        const appliedCoupon = get().appliedCouponsBySlug[slug] || null;
        
        // A. Hitung Subtotal Harga Barang per Item
        const cartWithPrices = currentCart.map(cartItem => {
          const product = menuItems.find(i => i.id === cartItem.menuItemId);
          if (!product) return { ...cartItem, itemTotal: 0 };
          
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
          
          return { ...cartItem, itemTotal: itemPrice * cartItem.quantity };
        });

        const subtotal = cartWithPrices.reduce((sum, item) => sum + item.itemTotal, 0);
        let discountAmount = 0;

        // B. Eksekusi Pemotongan Kupon
        if (appliedCoupon) {
          const minPurchase = Number(appliedCoupon.min_purchase || 0);

          if (subtotal >= minPurchase) {
            // Amankan pembacaan JSON Array applicable_items dari MySQL
            let applicableItemsArray: number[] = [];
            if (typeof appliedCoupon.applicable_items === 'string') {
              try {
                applicableItemsArray = JSON.parse(appliedCoupon.applicable_items);
              } catch (e) {}
            } else if (Array.isArray(appliedCoupon.applicable_items)) {
              applicableItemsArray = appliedCoupon.applicable_items.map(Number);
            }

            const hasSpecificItems = applicableItemsArray.length > 0;
            
            // Hitung subtotal HANYA dari produk yang masuk daftar applicable_items
            const applicableSubtotal = hasSpecificItems 
              ? cartWithPrices.reduce((sum, item) => {
                  if (applicableItemsArray.includes(Number(item.menuItemId))) {
                    return sum + item.itemTotal;
                  }
                  return sum;
                }, 0)
              : subtotal;

            if (applicableSubtotal > 0) {
              // Toleransi berbagai varian format API backend Anda
              let rate = Number(appliedCoupon.discountRate || appliedCoupon.discount_rate || 0);
              let capOrFixed = Number(appliedCoupon.discountPrice || appliedCoupon.discount_price || 0);

              // Fallback proteksi jika format menggunakan type & value (format lama code kita)
              if (appliedCoupon.type === 'percentage') {
                rate = Number(appliedCoupon.value || 0);
                capOrFixed = Number(appliedCoupon.max_discount || 0);
              } else if (appliedCoupon.type === 'fixed') {
                capOrFixed = Number(appliedCoupon.value || 0);
              }

              const hasRate = rate > 0;
              const hasPriceCap = capOrFixed > 0;

              if (hasRate && hasPriceCap) {
                // Persentase dengan batas maksimal
                const calculatedPercentage = applicableSubtotal * (rate / 100);
                discountAmount = Math.min(calculatedPercentage, capOrFixed);
              } else if (hasRate) {
                // Persentase tanpa batas
                discountAmount = applicableSubtotal * (rate / 100);
              } else if (hasPriceCap) {
                // Diskon Fix (Flat Amount)
                discountAmount = Math.min(capOrFixed, applicableSubtotal);
              }
            }
          }
        }

        // Bulatkan agar tidak ada nilai desimal bocor
        discountAmount = Math.floor(discountAmount);
        const total = Math.max(0, subtotal - discountAmount);
        
        return { subtotal, discountAmount, total };
      },

      // 🟢 2. PENCARIAN AUTO APPLY DENGAN AMAN
      autoApplyBestCoupon: (slug, menuItems, availableCoupons) => {
        const currentCoupon = get().appliedCouponsBySlug[slug];
        
        // Cek secara aman (menghindari error jika properti belum exist)
        const isCurrentCouponAuto = currentCoupon ? (currentCoupon.is_auto_apply === true || Number(currentCoupon.is_auto_apply) === 1) : false;

        // Jangan timpa jika user sudah sengaja apply kupon manual yg butuh kode
        if (currentCoupon && !isCurrentCouponAuto) return;

        // Tarik subtotal asli (tanpa potongan diskon)
        const { subtotal } = get().calculateTotal(slug, menuItems);

        // Filter kupon Auto Apply yang memenuhi minimal pembelian
        const eligibleCoupons = availableCoupons.filter(c => {
          const isAuto = c.is_auto_apply === true || Number(c.is_auto_apply) === 1;
          const minP = Number(c.min_purchase || 0);
          return isAuto && subtotal >= minP;
        });

        // Jika subtotal turun (misal: user menghapus item), cabut kupon yang nyangkut
        if (eligibleCoupons.length === 0) {
          if (isCurrentCouponAuto) {
             get().removeCoupon(slug); 
          }
          return;
        }

        let bestCoupon = null;
        let maxDiscount = 0;

        // Loop untuk mensimulasikan penerapan diskon & cari nominal diskon terbesar
        eligibleCoupons.forEach(coupon => {
          get().applyCouponManual(slug, coupon);
          const { discountAmount } = get().calculateTotal(slug, menuItems);
          
          if (discountAmount > maxDiscount) {
            maxDiscount = discountAmount;
            bestCoupon = coupon;
          }
        });

        if (maxDiscount > 0 && bestCoupon) {
          get().applyCouponManual(slug, bestCoupon);
        } else {
          get().removeCoupon(slug);
        }
      }

    }),
    {
      name: 'ekasir-multi-cart-v2', // 🟢 Naik versi cache agar NaN lama hilang otomatis!
    }
  )
);