-- SQL biasa untuk menambahkan kolom loyalty pada tabel settings.
-- Jalankan satu per satu bila server/database tidak mengizinkan stored procedure.
-- Bila ada kolom yang sudah tersedia, lewati statement kolom tersebut.

ALTER TABLE settings
  ADD COLUMN points_enabled TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE settings
  ADD COLUMN points_earning_mode VARCHAR(30) NOT NULL DEFAULT 'fixed_ratio';

ALTER TABLE settings
  ADD COLUMN points_earn_rate DECIMAL(15,2) NOT NULL DEFAULT 10000.00;

ALTER TABLE settings
  ADD COLUMN points_earn_points INT NOT NULL DEFAULT 1;

ALTER TABLE settings
  ADD COLUMN points_minimum_transaction DECIMAL(15,2) NOT NULL DEFAULT 0.00;

ALTER TABLE settings
  ADD COLUMN points_maximum_earn_per_order INT NULL DEFAULT NULL;

ALTER TABLE settings
  ADD COLUMN points_tier_basis VARCHAR(30) NOT NULL DEFAULT 'lifetime_spending';

ALTER TABLE settings
  ADD COLUMN points_redeem_rate DECIMAL(15,2) NOT NULL DEFAULT 1000.00;

ALTER TABLE settings
  ADD COLUMN points_minimum_redeem INT NOT NULL DEFAULT 10;

ALTER TABLE settings
  ADD COLUMN points_maximum_redeem INT NULL DEFAULT NULL;

ALTER TABLE settings
  ADD COLUMN points_max_discount_percent DECIMAL(5,2) NOT NULL DEFAULT 50.00;

ALTER TABLE settings
  ADD COLUMN points_allow_with_coupon TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE settings
  ADD COLUMN points_expiration_enabled TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE settings
  ADD COLUMN points_expiration_days INT NULL DEFAULT NULL;

ALTER TABLE settings
  ADD COLUMN points_require_paid_order TINYINT(1) NOT NULL DEFAULT 1;

ALTER TABLE settings
  ADD COLUMN points_include_tax_service TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE settings
  ADD COLUMN points_updated_at DATETIME NULL DEFAULT NULL;

-- Normalisasi nilai setelah seluruh kolom berhasil dibuat.
UPDATE settings
SET
  points_enabled = COALESCE(points_enabled, 0),
  points_earning_mode = COALESCE(NULLIF(points_earning_mode, ''), 'fixed_ratio'),
  points_earn_rate = COALESCE(points_earn_rate, 10000),
  points_earn_points = COALESCE(points_earn_points, 1),
  points_minimum_transaction = COALESCE(points_minimum_transaction, 0),
  points_tier_basis = COALESCE(NULLIF(points_tier_basis, ''), 'lifetime_spending'),
  points_redeem_rate = COALESCE(points_redeem_rate, 1000),
  points_minimum_redeem = COALESCE(points_minimum_redeem, 10),
  points_max_discount_percent = COALESCE(points_max_discount_percent, 50),
  points_allow_with_coupon = COALESCE(points_allow_with_coupon, 0),
  points_expiration_enabled = COALESCE(points_expiration_enabled, 0),
  points_require_paid_order = COALESCE(points_require_paid_order, 1),
  points_include_tax_service = COALESCE(points_include_tax_service, 0);

-- Verifikasi.
SHOW COLUMNS FROM settings LIKE 'points_tier_basis';
SHOW COLUMNS FROM settings LIKE 'points_redeem_rate';
SHOW COLUMNS FROM settings LIKE 'points_enabled';
