import { boolean, decimal, int, timestamp } from 'drizzle-orm/mysql-core';

export const settingsPointsColumns = {
  pointsEnabled: boolean('points_enabled').default(false).notNull(),
  pointsEarnRate: int('points_earn_rate').default(1000).notNull(),
  pointsRedeemRate: decimal('points_redeem_rate', { precision: 12, scale: 0 }).default('10').notNull(),
  pointsMinimumRedeem: int('points_minimum_redeem').default(100).notNull(),
  pointsMaximumRedeem: int('points_maximum_redeem'),
  pointsMaxDiscountPercent: decimal('points_max_discount_percent', { precision: 5, scale: 2 }).default('50.00').notNull(),
  pointsRequirePaidOrder: boolean('points_require_paid_order').default(true).notNull(),
  pointsIncludeTaxService: boolean('points_include_tax_service').default(false).notNull(),
  pointsUpdatedAt: timestamp('points_updated_at'),
};
