// 🔴 1. IMPORT DRIZZLE & SCHEMA KAMU
import { InferSelectModel } from 'drizzle-orm';
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
// Omit: "Singkirkan kolom DB ini karena kita mau ubah wujudnya di Frontend"
export interface MenuItem extends Omit<DbProduct, 'id' | 'price' | 'status' | 'categories_id' | 'addon_id'> {
  // Properti hasil translasi dari API (Override dari DB)
  id: string;                  // Frontend lebih gampang olah ID sebagai string
  categoryId: string;          // Translasi dari categories_id
  basePrice: number;           // Translasi dari price
  isAvailable: boolean;        // Translasi dari status (1/0 -> true/false)
  status: number | boolean | string;
  addonGroups: number[];       // Translasi dari addon_id (JSON string -> Array)

  // Properti tambahan khusus UI (View Model)
  categorizedAddons?: any[];   // Hasil grouping addon dari backend untuk Pop-up
  meta?: Partial<MenuItemMeta>; // Data meta custom (Barista Spec, Sizes, dll)
}

// 🔴 4. HYBRID TYPE UNTUK CATEGORY
export interface Category extends Omit<DbCategory, 'id'> {
  id: string;
  items?: MenuItem[]; // Array anak menu untuk fitur mapping di katalog (seperti di RoastGalleryView)
}

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
  quantity: number;
  selectedAddOns: number[];
  notes?: string;
  options?: POSOptions; 
  sku_code?: string;
}

export interface Order {
  id: string;
  tableId: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'failed';
  createdAt: string;
}