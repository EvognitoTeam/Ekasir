import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
  tablesFilter: [
    "mitra", "users", "categories", "products", "addons", 
    "orders", "order_items", "table_list", "reservations", 
    "reservation_table_list", "reviews", "coupon", 
    "loyalty_points", "cashouts", "print_settings"
  ],
});