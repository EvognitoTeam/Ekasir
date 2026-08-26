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
// 1. CORE ENTITIES (Mitra, Branches, Users, Activities)
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

export const branches = mysqlTable("branches", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  mitra_id: bigint("mitra_id", { mode: "number", unsigned: true }).notNull(),
  branch_slug: varchar("branch_slug", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
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
  memberId: varchar("member_id", { length: 11 }).unique(),
  mitra_id: bigint("mitra_id", { mode: "number", unsigned: true }).notNull(),
  branch_id: bigint("branch_id", { mode: "number", unsigned: true }), // Branch ID
  is_login: boolean("is_login").default(false).notNull(),
  login_at: timestamp("login_at"),
  role: mysqlEnum("role", ['Owner', 'Cashier', 'Kitchen', 'User', 'Superadmin']).default('User').notNull(),
  token: varchar("token", { length: 40 }),
  onesignalid: text("onesignalid"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});

export const activities = mysqlTable("activities", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  user_id: bigint("user_id", { mode: "number", unsigned: true }),
  mitra_id: bigint("mitra_id", { mode: "number", unsigned: true }).notNull(),
  branch_id: bigint("branch_id", { mode: "number", unsigned: true }), // Branch ID
  activity_type: varchar("activity_type", { length: 255 }).notNull(),
  ip_address: varchar("ip_address", { length: 50 }),
  browser: text("browser"),
  description: text("description").notNull(),
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
  branch_id: bigint("branch_id", { mode: "number", unsigned: true }), // Branch ID
  name: varchar("name", { length: 20 }).notNull(),
  createdAt: datetime("created_at"),
  updatedAt: datetime("updated_at"),
  deletedAt: timestamp("deleted_at"),
});

export const products = mysqlTable("products", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  mitra_id: bigint("mitra_id", { mode: "number", unsigned: true }),
  branch_id: bigint("branch_id", { mode: "number", unsigned: true }), // Branch ID
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  categories_id: bigint("categories_id", { mode: "number", unsigned: true }).notNull(),
  stock: int("stock").default(0).notNull(),
  price: int("price").notNull(),
  image: varchar("image", { length: 255 }),
  status: tinyint("status").default(1).notNull(),
  addon_id: json("addon_id"), 
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});

export const addons = mysqlTable("addons", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  mitra_id: bigint("mitra_id", { mode: "number", unsigned: true }).notNull(),
  branch_id: bigint("branch_id", { mode: "number", unsigned: true }), // Branch ID
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
  mitra_id: bigint('mitra_id', { mode: 'number' }).notNull(), // Di SQL aslinya tidak unsigned
  branch_id: bigint("branch_id", { mode: "number", unsigned: true }), // Branch ID
  name: varchar('name', { length: 255 }).notNull(),
  isRequired: int('is_required').default(0).notNull(),
  maxSelected: int('max_selected').default(1).notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

// Definisi Relasi
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
  idempotencyKey: varchar('idempotency_key', {
    length: 100,
  }),
  mitra_id: bigint("mitra_id", { mode: "number", unsigned: true }),
  branch_id: bigint("branch_id", { mode: "number", unsigned: true }), // Branch ID
  cashier_id: bigint("cashier_id", { mode: "number", unsigned: true }),
  user_id: bigint("user_id", { mode: "number", unsigned: true }),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone_number: varchar("phone_number", { length: 255 }),
  table_number: bigint("table_number", { mode: "number", unsigned: true }),
  manual_table_info: varchar('manual_table_info', { length: 100 }),
  status: mysqlEnum("status", ['pending', 'completed', 'confirmed', 'preparing', 'ready', 'cancelled']).default('pending').notNull(),
  confirmedAt: timestamp("confirmed_at"),
  preparingAt: timestamp("preparing_at"),
  readyAt: timestamp("ready_at"),
  completedAt: timestamp('completed_at'),
  cancelledAt: timestamp('cancelled_at'),
  cancelReason: varchar('cancel_reason', {
    length: 255,
  }),
  admin_notes: text("admin_notes"),
  is_cashouted: boolean("is_cashouted").default(false).notNull(),
  cashout_id: int('cashout_id'),
  time_cashout: timestamp("time_cashout"),
  total_price: decimal("total_price", { precision: 10, scale: 0 }).default('0').notNull(),
  service: decimal("service", { precision: 10, scale: 0 }).default('0').notNull(),
  platformFee: decimal('platform_fee', {
    precision: 12,
    scale: 0,
  })
    .default('0')
    .notNull(),
  platformFeeRate: decimal('platform_fee_rate', {
    precision: 5,
    scale: 2,
  })
    .default('1.40')
    .notNull(),
  pointsEarned: int('points_earned')
  .default(0)
  .notNull(),
  pointsAwardedAt: timestamp('points_awarded_at'),
  pointsRedeemed: int('points_redeemed')
  .default(0)
  .notNull(),
  pointsDiscount: decimal('points_discount', {
    precision: 12,
    scale: 0,
  })
    .default('0')
    .notNull(),
  tax: decimal("tax", { precision: 10, scale: 0 }).default('0').notNull(),
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
  paymentPaidAt: timestamp('payment_paid_at'),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});

export const orderItems = mysqlTable("order_items", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  order_id: bigint("order_id", { mode: "number", unsigned: true }).notNull(),
  product_id: bigint("product_id", { mode: "number", unsigned: true }).notNull(),
  mitra_id: bigint("mitra_id", { mode: "number", unsigned: true }),
  branch_id: bigint("branch_id", { mode: "number", unsigned: true }), // Branch ID
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
  branch_id: bigint("branch_id", { mode: "number", unsigned: true }), // Branch ID
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
  customer_name: varchar("customer_name", { length: 120 }),
  customer_phone: varchar("customer_phone", { length: 120 }),
  table_id: bigint("table_id", { mode: "number", unsigned: true }),
  mitra_id: bigint("mitra_id", { mode: "number", unsigned: true }),
  branch_id: bigint("branch_id", { mode: "number", unsigned: true }), // Branch ID
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
  branch_id: bigint("branch_id", { mode: "number", unsigned: true }), // Branch ID
  title: varchar("title", { length: 255 }),
  image: varchar("image", { length: 255 }).default('default_promo.jpg'),
  description: text("description"),
  coupon_code: varchar("coupon_code", { length: 25 }).notNull(),
  is_member_only: boolean("is_member_only").default(false).notNull(),
  discount_price: decimal("discount_price", { precision: 10, scale: 0 }),
  discount_rate: int("discount_rate"),
  max_use: int("max_use").default(0).notNull(),
  already_used: int("already_used").default(0).notNull(),
  is_auto_apply: boolean("is_auto_apply").default(false),
  applicable_items: json("applicable_items").$type<number[]>().default([]),
  // Limit per pengguna (0 = tidak terbatas)
  max_use_per_user: int("max_use_per_user").default(0), 
  // Limit harian per pengguna (0 = tidak terbatas)
  daily_user_limit: int("daily_user_limit").default(0),
  // Limit bulanan per pengguna (0 = tidak terbatas)
  monthly_user_limit: int("monthly_user_limit").default(0),
  yearly_user_limit: int("yearly_user_limit").default(0),
  // 1. Penanda bahwa ini voucher khusus klaim (bukan promo publik)
  is_claimable: boolean("is_claimable").default(false).notNull(), 
  
  // 2. Umur voucher (dalam hari) SETELAH berhasil diklaim
  valid_days_after_claim: int("valid_days_after_claim").default(0), 
  
  // 3. ID User yang berhasil mengklaim (mengunci voucher ke akun ini)
  claimed_by_user_id: bigint("claimed_by_user_id", { mode: "number", unsigned: true }), 
  
  // 4. (Opsional) ID Induk Campaign agar rapi saat admin melihat daftar promo
  campaign_group_id: varchar("campaign_group_id", { length: 100 }),
  start_date: timestamp("start_date"),
  expired_date: timestamp("expired_date"),
  createdAt: datetime("created_at"),
  updatedAt: datetime("updated_at"),
  deletedAt: timestamp("deleted_at"),
});

export const couponUsages = mysqlTable("coupon_usages", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  coupon_id: bigint("coupon_id", { mode: "number", unsigned: true }).notNull(),
  order_id: bigint("order_id", { mode: "number", unsigned: true }).notNull(),
  mitra_id: bigint("mitra_id", { mode: "number", unsigned: true }).notNull(),
  user_id: bigint("user_id", { mode: "number", unsigned: true }), // Jika member yang pakai
  discount_amount: decimal("discount_amount", { precision: 10, scale: 0 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const loyaltyPoints = mysqlTable("loyalty_points", {
  id: bigint("id", {
    mode: "number",
    unsigned: true,
  })
    .primaryKey()
    .autoincrement(),

  user_id: bigint("user_id", {
    mode: "number",
    unsigned: true,
  }).notNull(),

  mitra_id: bigint("mitra_id", {
    mode: "number",
    unsigned: true,
  }).notNull(),

  branch_id: bigint("branch_id", {
    mode: "number",
    unsigned: true,
  }),

  // Saldo poin saat ini
  points: int("points")
    .default(0)
    .notNull(),

  // ID member loyalty
  member_id: varchar("member_id", {
    length: 25,
  }).notNull(),

  // Total poin yang pernah didapat
  lifetime_points_earned: bigint("lifetime_points_earned", {
    mode: "number",
  })
    .default(0)
    .notNull(),

  // Total poin yang pernah ditukarkan
  lifetime_points_redeemed: bigint("lifetime_points_redeemed", {
    mode: "number",
  })
    .default(0)
    .notNull(),

  // Total nominal transaksi/member spending
  lifetime_spending: decimal("lifetime_spending", {
    precision: 14,
    scale: 0,
  })
    .default("0")
    .notNull(),

  // Waktu terakhir mendapatkan poin
  last_earned_at: timestamp("last_earned_at"),

  // Waktu terakhir menukarkan poin
  last_redeemed_at: timestamp("last_redeemed_at"),

  createdAt: timestamp("created_at"),

  updatedAt: timestamp("updated_at"),

  deletedAt: timestamp("deleted_at"),
});

export const memberPointLedgers = mysqlTable(
  'member_point_ledgers',
  {
    id: bigint('id', {
      mode: 'number',
      unsigned: true,
    })
      .primaryKey()
      .autoincrement(),

    mitraId: bigint('mitra_id', {
      mode: 'number',
      unsigned: true,
    }).notNull(),

    userId: bigint('user_id', {
      mode: 'number',
      unsigned: true,
    }).notNull(),

    orderId: bigint('order_id', {
      mode: 'number',
      unsigned: true,
    }),

    cashierId: bigint('cashier_id', {
      mode: 'number',
      unsigned: true,
    }),

    type: mysqlEnum('type', [
      'earn',
      'redeem',
      'adjustment',
      'reversal',
      'expired',
    ]).notNull(),

    points: int('points').notNull(),

    balanceBefore: int('balance_before')
      .default(0)
      .notNull(),

    balanceAfter: int('balance_after')
      .default(0)
      .notNull(),

    description: varchar('description', {
      length: 255,
    }),

    idempotencyKey: varchar('idempotency_key', {
      length: 100,
    }),

    createdAt: timestamp('created_at')
      .defaultNow()
      .notNull(),

    updatedAt: timestamp('updated_at')
      .defaultNow()
      .onUpdateNow()
      .notNull(),
  },
);

export const reviews = mysqlTable("reviews", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  mitra_id: bigint("mitra_id", { mode: "number", unsigned: true }),
  branch_id: bigint("branch_id", { mode: "number", unsigned: true }), // Branch ID
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
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  status: mysqlEnum("status", ['pending', 'approved', 'rejected']).default('pending').notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});

export const printSettings = mysqlTable("print_settings", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  key: varchar("key", { length: 255 }).notNull(),
  mitra_id: bigint("mitra_id", { mode: "number", unsigned: true }),
  branch_id: bigint("branch_id", { mode: "number", unsigned: true }), // Branch ID
  value: text("value"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});

export const settings = mysqlTable('settings', {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  mitraId: bigint('mitra_id', { mode: 'number', unsigned: true }).notNull(),
  branch_id: bigint("branch_id", { mode: "number", unsigned: true }), // Branch ID
  taxRate: int('tax_rate').default(10), 
  serviceRate: int('service_rate').default(5), 
  isTaxIncluded: tinyint('is_tax_included').default(0), 
  wifiSSID: varchar('wifi_ssid', { length: 100 }),
  wifiPassword: varchar('wifi_password', { length: 100 }),
  facility: json("facility"), 
  faq: json("faq"), 
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
  pointsEnabled: boolean(
    'points_enabled',
  )
    .default(false)
    .notNull(),

  pointsEarnRate: int(
    'points_earn_rate',
  )
    .default(1000)
    .notNull(),

  pointsRedeemRate: decimal(
    'points_redeem_rate',
    {
      precision: 12,
      scale: 0,
    },
  )
    .default('10')
    .notNull(),

  pointsMinimumRedeem: int(
    'points_minimum_redeem',
  )
    .default(100)
    .notNull(),

  pointsMaximumRedeem: int(
    'points_maximum_redeem',
  ),

  pointsMaxDiscountPercent: decimal(
    'points_max_discount_percent',
    {
      precision: 5,
      scale: 2,
    },
  )
    .default('50.00')
    .notNull(),

  pointsRequirePaidOrder: boolean(
    'points_require_paid_order',
  )
    .default(true)
    .notNull(),

  pointsIncludeTaxService: boolean(
    'points_include_tax_service',
  )
    .default(false)
    .notNull(),

  pointsUpdatedAt: timestamp(
    'points_updated_at',
  ),
});

// ============================================================================
// 7. INVENTORY & RECIPES (BOM)
// ============================================================================

export const materials = mysqlTable('materials', {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  mitra_id: bigint('mitra_id', { mode: 'number', unsigned: true }).notNull(),
  branch_id: bigint("branch_id", { mode: "number", unsigned: true }), // Branch ID
  name: varchar('name', { length: 255 }).notNull(),
  image: text('image'),
  unit: varchar('unit', { length: 50 }).notNull(), 
  stock: decimal('stock', { precision: 10, scale: 2 }).default('0'), 
  low_stock_threshold: decimal('low_stock_threshold', { precision: 10, scale: 2 }).default('0'),
  cost_per_unit: decimal('cost_per_unit', { precision: 10, scale: 2 }).default('0'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const productRecipes = mysqlTable('product_recipes', {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  mitra_id: bigint('mitra_id', { mode: 'number', unsigned: true }).notNull(),
  branch_id: bigint("branch_id", { mode: "number", unsigned: true }), // Branch ID
  // Karena di SQL dump aslinya int NOT NULL, kita sesuaikan tipe datanya
  product_id: int('product_id').notNull(), 
  material_id: int('material_id').notNull(), 
  amount_needed: decimal('amount_needed', { precision: 10, scale: 2 }).notNull(), 
});
export const couponBranches = mysqlTable("coupon_branches", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  coupon_id: bigint("coupon_id", { mode: "number", unsigned: true }).notNull(),
  branch_id: bigint("branch_id", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// POST BLOG
export const posts = mysqlTable("posts", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  content: text("content").notNull(), // Bisa menggunakan HTML dari Rich Text editor
  excerpt: varchar("excerpt", { length: 500 }),
  image: varchar("image", { length: 255 }),
  is_published: boolean("is_published").default(false).notNull(),
  views: int("views").default(0).notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const tableDevice = mysqlTable("iot_devices", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  mitra_id: bigint("mitra_id", { mode: "number", unsigned: true }),
  table_id: bigint("table_id", { mode: "number", unsigned: true }), // FK ke table_list.id
  hex_id: varchar("hex_id", { length: 50 }), // MAC Address ESP32
  serial_number: varchar("serial_number", { length: 50 }),
  secret_key: varchar("secret_key", { length: 64 }),
  status: mysqlEnum("status", ['active', 'inactive']).default('active'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});