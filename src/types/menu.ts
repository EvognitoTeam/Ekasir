// 🔴 1. IMPORT DRIZZLE & SCHEMA KAMU
import type { InferSelectModel } from 'drizzle-orm';
import { products, categories } from '@/db/schema'; // Sesuaikan path ini jika folder skemamu berbeda

// 🔴 2. EKSTRAK TIPE ASLI DARI DATABASE
export type DbProduct = InferSelectModel<typeof products>;
export type DbCategory = InferSelectModel<typeof categories>;

export interface TableSession {
  tableId: string;
  sessionId: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'invalid';
}

export interface AddOnChoice {
  id: string;
  name: string;
  priceDelta: number;
  isAvailable: boolean;
}

export interface AddOnGroup {
  id: string;
  name: string;
  minSelection: number;
  maxSelection: number;
  choices: AddOnChoice[];
}

export interface SensoryProfile {
  name: string;
  value: number; // 0-100
}

export interface BaristaRecipe {
  coffee_origin_or_blend: string;
  roast_level: string;
  dose_grams: number;
  yield_ml: number;
  extraction_time_seconds: number;
  milk_type?: string;
  milk_volume_ml?: number;
  steam_temperature_celsius?: number;
  syrup_pumps_per_size?: Record<string, number>;
  presentation_notes?: string;
}

export interface MenuItemMeta {
  schema_version: string;
  sku_code: string;
  category: string;
  short_description: string;
  flavor_profile: string;
  strength: string | number;
  serve_temperature: 'hot' | 'cold' | 'ambient' | string;
  sizes: { label: string; volume_ml: number; price: number }[];
  add_ons: { id: string; name: string; price: number; type: string }[];
  allergens: string[];
  barista_recipe: BaristaRecipe;
  prep_time_estimate_seconds: number;
  recommended_pairings: string[];
}

// 🔴 3. HYBRID TYPE UNTUK MENU ITEM
//
// DbProduct tetap tersedia sebagai tipe database penuh.
// MenuItem adalah view-model frontend, jadi metadata internal database
// tidak boleh dipaksa wajib pada semua response API / Zustand store.
export type MenuItem =
  Partial<
    Omit<
      DbProduct,
      | 'id'
      | 'price'
      | 'status'
      | 'categories_id'
      | 'addon_id'
      | 'branch_id'
    >
  > & {
    id: string;
    name: string;
    categoryId: string | number | null;
    basePrice: number;
    isAvailable: boolean;

    status?: number | boolean | string;
    branch_id?: number | string | null;
    addonGroups?: Array<number | string>;

    categorizedAddons?: any[];
    meta?: Partial<MenuItemMeta>;
  };

// 🔴 4. HYBRID TYPE UNTUK CATEGORY
export type Category =
  Partial<
    Omit<
      DbCategory,
      'id' | 'name'
    >
  > & {
    id: string | number;
    name: string;
    items?: MenuItem[];
  };

export interface POSOptions {
  size?: string;
  milk?: string;
  shots?: number;
  syrup?: { id: string; pumps: number }[];
  sweetness?: string;
  temperature?: string;
  toppings?: string[];
}

export interface CartItem {
  id: string; 
  menuItemId: string;
  product_id?: number | string; // 🔴 Tambahkan baris ini
  quantity: number;
  selectedAddOns: number[];
  selectedAddOnsDetails?: number[];
  notes?: string;
  options?: POSOptions; 
  sku_code?: string;
}

export interface Order {
  getPayment: any;
  cashChange: any;
  id: string | number; // Bisa string (mock) atau number (dari DB)
  order_code?: string; // Kode unik struk dari DB
  orderCode?: string; // Kode unik struk dari DB
  
  // Meja
  tableId?: string; // Fallback sistem lama
  table_number?: number | string; // Dari DB
  table_name?: string; // Dari DB
  
  items: CartItem[];
  
  // Harga
  subtotal?: number;
  tax?: number;
  serviceCharge?: number;
  totalPrice?: number; // Dari format camelCase kasir
  total_price?: number | string; // Dari DB asli
  totalAfterDiscount?: number;
  total_after_discount?: number;
  
  // Status & Tipe Pesanan
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'failed' | 'cancelled' | 'completed';
  orderType?: 'dine-in' | 'takeaway' | string;
  
  // Pembayaran
  paymentStatus?: '1' | '2' | '3' | '4' | 'paid' | 'pending'; // 2/paid = Lunas
  payment_status?: '1' | '2' | '3' | '4' | 'paid' | 'pending'; // 2/paid = Lunas
  paymentMethod?: 'cash' | 'qris' | string;
  payment_method?: 'cash' | 'qris';
  
  // Identitas & Catatan
  customerName?: string;
  name?: string; // Nama dari DB asli
  adminNotes?: string;
  admin_notes?: string;
  
  // Waktu
  createdAt?: string | Date;
  created_at?: string | Date; // Dari DB asli
}