import { 
  mysqlTable, 
  bigint, 
  varchar, 
  text, 
  int, 
  decimal, 
  timestamp, 
  datetime, 
  boolean, 
  mysqlEnum, 
  json, 
  tinyint
} from "drizzle-orm/mysql-core";
import { relations } from 'drizzle-orm';

// ============================================================================
// 1. CORE ENTITIES (Mitra & Users)
// ============================================================================

export const mitra = mysqlTable("mitra", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  mitra_slug: varchar("mitra_slug", { length: 50 }).notNull(),
  billing_type: mysqlEnum("billing_type", ['fee', 'subscription']).default('fee').notNull(),
  mitra_name: varchar("mitra_name", { length: 50 }).notNull(),
  mitra_address: text("mitra_address"),
  mitra_welcome: text("mitra_welcome"),
  banner: varchar("banner", { length: 255 }).default('default_banner.jpg'),
  bank_name: text("bank_name"),
  no_rek: varchar("no_rek", { length: 255 }),
  nama_rek: varchar("nama_rek", { length: 255 }),
  rek_added_at: timestamp("rek_added_at"),
  cashout: int("cashout").default(8),
  subscription_until: timestamp("subscription_until"),
  theme_layout: mysqlEnum("theme_layout", ['simple', 'modern', 'compact']).default('simple'),
  status: int("status").default(1).notNull(),
  createdAt: datetime("created_at"),
  updatedAt: datetime("updated_at"),
  deletedAt: timestamp("deleted_at"),
});

export const users = mysqlTable("users", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  email_verified_at: timestamp("email_verified_at"),
  password: varchar("password", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 15 }),
  remember_token: varchar("remember_token", { length: 100 }),
  mitra_id: bigint("mitra_id", { mode: "number", unsigned: true }).notNull(),
  is_login: boolean("is_login").default(false),
  login_at: timestamp("login_at"),
  role: mysqlEnum("role", ['Owner', 'Cashier', 'User']).default('User').notNull(),
  token: varchar("token", { length: 40 }),
  onesignalid: text("onesignalid"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});

// ============================================================================
// 2. PRODUCT & MENU MANAGEMENT
// ============================================================================

export const categories = mysqlTable("categories", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  mitra_id: bigint("mitra_id", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 20 }).notNull(),
  createdAt: datetime("created_at"),
  updatedAt: datetime("updated_at"),
  deletedAt: timestamp("deleted_at"),
});

export const products = mysqlTable("products", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  mitra_id: bigint("mitra_id", { mode: "number", unsigned: true }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  categories_id: bigint("categories_id", { mode: "number", unsigned: true }).notNull(),
  stock: int("stock").default(0).notNull(),
  price: int("price").notNull(),
  image: varchar("image", { length: 255 }),
  status: int("status").default(1).notNull(),
  addon_id: json("addon_id"), 
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});

export const addons = mysqlTable("addons", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  mitra_id: bigint("mitra_id", { mode: "number", unsigned: true }).notNull(),
  category_id: bigint('category_id', { mode: 'number', unsigned: true }).references(() => addonCategories.id, { onDelete: 'set null' }),
  name: varchar("name", { length: 255 }).notNull(),
  price: decimal("price", { precision: 10, scale: 0 }).notNull(),
  is_active: boolean("is_active").default(true),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});

export const addonCategories = mysqlTable('addon_categories', {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  mitra_id: bigint('mitra_id', { mode: 'number' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  isRequired: int('is_required').default(0).notNull(),
  maxSelected: int('max_selected').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// 3. Definisi Relasi (Drizzle Relations) agar Query Lebih Mudah
export const addonCategoriesRelations = relations(addonCategories, ({ many }) => ({
  addons: many(addons),
}));

export const addonsRelations = relations(addons, ({ one }) => ({
  category: one(addonCategories, {
    fields: [addons.category_id],
    references: [addonCategories.id],
  }),
}));

// ============================================================================
// 3. TRANSACTION & ORDERS
// ============================================================================

export const orders = mysqlTable("orders", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  order_code: varchar("order_code", { length: 255 }).notNull(),
  mitra_id: bigint("mitra_id", { mode: "number", unsigned: true }),
  cashier_id: bigint("cashier_id", { mode: "number", unsigned: true }),
  user_id: bigint("user_id", { mode: "number", unsigned: true }),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone_number: varchar("phone_number", { length: 255 }),
  table_number: bigint("table_number", { mode: "number", unsigned: true }),
  status: mysqlEnum("status", ['pending', 'completed', 'confirmed', 'preparing','cancelled','ready']).default('pending').notNull(),
  admin_notes: text("admin_notes"),
  is_cashouted: boolean("is_cashouted").default(false).notNull(),
  total_price: decimal("total_price", { precision: 10, scale: 0 }).default('0').notNull(),
  discount: decimal("discount", { precision: 10, scale: 0 }),
  totalAfterDiscount: decimal("totalAfterDiscount", { precision: 10, scale: 0 }),
  payment_method: mysqlEnum("payment_method", ['cash', 'qris']).default('cash'),
  getPayment: decimal("getPayment", { precision: 10, scale: 0 }),
  cashChange: decimal("cashChange", { precision: 10, scale: 0 }),
  discountId: bigint("discountId", { mode: "number", unsigned: true }),
  transaction_id: text("transaction_id"),
  payment_type: varchar("payment_type", { length: 50 }),
  issuer: varchar("issuer", { length: 25 }),
  qr_url: text("qr_url"),
  qr_string: text("qr_string"),
  expiry_time: timestamp("expiry_time"),
  payment_status: mysqlEnum("payment_status", ['1', '2', '3', '4']).default('1').notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});

export const orderItems = mysqlTable("order_items", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  order_id: bigint("order_id", { mode: "number", unsigned: true }).notNull(),
  product_id: bigint("product_id", { mode: "number", unsigned: true }).notNull(),
  mitra_id: bigint("mitra_id", { mode: "number", unsigned: true }),
  quantity: int("quantity").notNull(),
  notes: json("notes"),
  price: decimal("price", { precision: 10, scale: 0 }).notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});

// ============================================================================
// 4. TABLE & RESERVATION SYSTEM
// ============================================================================

export const tableList = mysqlTable("table_list", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  mitra_id: bigint("mitra_id", { mode: "number", unsigned: true }),
  table_name: varchar("table_name", { length: 20 }).notNull(),
  capacity: int("capacity").default(1),
  table_code: varchar("table_code", { length: 6 }),
  status: int("status").default(1).notNull(),
  createdAt: datetime("created_at"),
  updatedAt: datetime("updated_at"),
  deletedAt: timestamp("deleted_at"),
});

export const reservations = mysqlTable("reservations", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  user_id: bigint("user_id", { mode: "number", unsigned: true }),
  table_id: bigint("table_id", { mode: "number", unsigned: true }),
  mitra_id: bigint("mitra_id", { mode: "number", unsigned: true }),
  reserved_start: datetime("reserved_start").notNull(),
  reserved_end: datetime("reserved_end").notNull(),
  guest_count: int("guest_count").notNull(),
  status: mysqlEnum("status", ['pending', 'confirmed', 'canceled', 'completed', 'no_show']).default('pending').notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});

export const reservationTableList = mysqlTable("reservation_table_list", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  reservation_id: bigint("reservation_id", { mode: "number", unsigned: true }).notNull(),
  table_list_id: bigint("table_list_id", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// ============================================================================
// 5. MARKETING & CUSTOMER ENGAGEMENT
// ============================================================================

export const coupon = mysqlTable("coupon", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  mitra_id: bigint("mitra_id", { mode: "number", unsigned: true }),
  title: varchar("title", { length: 255 }),
  image: varchar("image", { length: 255 }).default('default_promo.jpg'),
  description: text("description"),
  coupon_code: varchar("coupon_code", { length: 25 }).notNull(),
  is_member_only: boolean("is_member_only").default(false).notNull(),
  discount_price: decimal("discount_price", { precision: 10, scale: 0 }),
  discount_rate: int("discount_rate"),
  max_use: int("max_use").default(0).notNull(),
  already_used: int("already_used").default(0).notNull(),
  expired_date: timestamp("expired_date"),
  createdAt: datetime("created_at"),
  updatedAt: datetime("updated_at"),
  deletedAt: timestamp("deleted_at"),
});

export const loyaltyPoints = mysqlTable("loyalty_points", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  user_id: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  mitra_id: bigint("mitra_id", { mode: "number", unsigned: true }).notNull(),
  points: int("points").default(0).notNull(),
  loyalty_id: varchar("loyalty_id", { length: 25 }).notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});

export const reviews = mysqlTable("reviews", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  mitra_id: bigint("mitra_id", { mode: "number", unsigned: true }),
  product_id: bigint("product_id", { mode: "number", unsigned: true }),
  user_id: bigint("user_id", { mode: "number", unsigned: true }),
  order_id: bigint("order_id", { mode: "number", unsigned: true }),
  rating: decimal("rating", { precision: 5, scale: 1 }).default('0.0').notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});

// ============================================================================
// 6. SYSTEM & FINANCIALS
// ============================================================================

export const cashouts = mysqlTable("cashouts", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  mitra_id: bigint("mitra_id", { mode: "number", unsigned: true }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(), // Presisi 15,2 dari aslinya
  status: mysqlEnum("status", ['pending', 'approved', 'rejected']).default('pending').notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});

export const printSettings = mysqlTable("print_settings", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  key: varchar("key", { length: 255 }).notNull(),
  mitra_id: bigint("mitra_id", { mode: "number", unsigned: true }),
  value: text("value"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});

export const settings = mysqlTable('settings', {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  mitraId: bigint('mitra_id', { mode: 'number', unsigned: true }).notNull(),
  
  taxRate: int('tax_rate').default(10), // Persentase pajak, default 10
  serviceRate: int('service_rate').default(5), // Persentase servis, default 5
  isTaxIncluded: tinyint('is_tax_included').default(0), // 0 = Exclude, 1 = Include
  
  wifiSSID: varchar('wifi_ssid', { length: 100 }),
  wifiPassword: varchar('wifi_password', { length: 100 }),

  facility: json("facility"), 
  faq: json("faq"), 

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// TABEL BAHAN BAKU (Master Inventory)
export const materials = mysqlTable('materials', {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  mitra_id: bigint('mitra_id', { mode: 'number', unsigned: true }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  image: text('image'),
  unit: varchar('unit', { length: 50 }).notNull(), // Contoh: 'gram', 'ml', 'pcs'
  stock: decimal('stock', { precision: 10, scale: 2 }).default('0'), // Jumlah saat ini
  low_stock_threshold: decimal('low_stock_threshold', { precision: 10, scale: 2 }).default('0'),
  cost_per_unit: decimal('cost_per_unit', { precision: 10, scale: 2 }).default('0'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// TABEL RESEP (BOM - Bill of Materials)
// Menghubungkan Produk ke Bahan Baku
export const productRecipes = mysqlTable('product_recipes', {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  mitra_id: bigint('mitra_id', { mode: 'number', unsigned: true }).notNull(),
  product_id: int('product_id').notNull(), // ID dari tabel products
  material_id: int('material_id').notNull(), // ID dari tabel materials
  amount_needed: decimal('amount_needed', { precision: 10, scale: 2 }).notNull(), // Berapa banyak bahan dipakai per 1 porsi
});