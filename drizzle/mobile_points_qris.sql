ALTER TABLE settings
  ADD COLUMN points_enabled TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN points_earn_rate INT NOT NULL DEFAULT 1000,
  ADD COLUMN points_redeem_rate DECIMAL(12,0) NOT NULL DEFAULT 10,
  ADD COLUMN points_minimum_redeem INT NOT NULL DEFAULT 100,
  ADD COLUMN points_maximum_redeem INT NULL,
  ADD COLUMN points_max_discount_percent DECIMAL(5,2) NOT NULL DEFAULT 50.00,
  ADD COLUMN points_require_paid_order TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN points_include_tax_service TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN points_updated_at TIMESTAMP NULL;

ALTER TABLE orders
  ADD COLUMN idempotency_key VARCHAR(100) NULL AFTER order_code,
  ADD COLUMN payment_paid_at TIMESTAMP NULL AFTER payment_status,
  ADD COLUMN completed_at TIMESTAMP NULL AFTER ready_at,
  ADD COLUMN platform_fee DECIMAL(12,0) NOT NULL DEFAULT 0 AFTER service,
  ADD COLUMN platform_fee_rate DECIMAL(5,2) NOT NULL DEFAULT 1.40 AFTER platform_fee,
  ADD COLUMN points_earned INT NOT NULL DEFAULT 0 AFTER totalAfterDiscount,
  ADD COLUMN points_awarded_at TIMESTAMP NULL AFTER points_earned,
  ADD COLUMN points_redeemed INT NOT NULL DEFAULT 0 AFTER points_awarded_at,
  ADD COLUMN points_discount DECIMAL(12,0) NOT NULL DEFAULT 0 AFTER points_redeemed,
  ADD UNIQUE KEY orders_mitra_idempotency_unique (mitra_id, idempotency_key);

CREATE TABLE member_point_ledgers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  mitra_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  order_id BIGINT UNSIGNED NULL,
  cashier_id BIGINT UNSIGNED NULL,
  type ENUM('earn','redeem','adjustment','reversal','expired') NOT NULL,
  points INT NOT NULL,
  balance_before INT NOT NULL DEFAULT 0,
  balance_after INT NOT NULL DEFAULT 0,
  rupiah_value DECIMAL(12,0) NOT NULL DEFAULT 0,
  description VARCHAR(255) NULL,
  idempotency_key VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY member_point_ledger_idempotency_unique (mitra_id, idempotency_key),
  KEY member_point_ledger_user_created_index (user_id, created_at),
  KEY member_point_ledger_order_index (order_id)
);
