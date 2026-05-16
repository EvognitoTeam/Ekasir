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

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  image: string;
  basePrice: number;
  tags: ('best-seller' | 'new' | 'popular')[];
  isAvailable: boolean;
  addons?: { id: number; name: string; price: number }[]; 
  
  // 🔴 INI BARIS YANG DITAMBAHKAN UNTUK MENGATASI ERROR
  categorizedAddons?: any[]; 
  
  addOnGroups: AddOnGroup[];
  sensoryProfile?: SensoryProfile[];
  sommelierNotes?: string;
  provenance?: string;
  pairingId?: string;
  meta?: MenuItemMeta; // Strict POS authoritative mapping
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  sortOrder: number;
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
  id: string; // Unique instance ID for the cart
  menuItemId: string;
  quantity: number;
  selectedAddOns: number[];
  notes?: string;
  options?: POSOptions; // Normalized payload dictating the POS order
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