ALTER TABLE settings
  ADD COLUMN points_tier_basis VARCHAR(30) NOT NULL DEFAULT 'lifetime_spending';

ALTER TABLE settings
  ADD COLUMN points_redeem_rate DECIMAL(15,2) NOT NULL DEFAULT 1000.00;

ALTER TABLE settings
  ADD COLUMN points_enabled TINYINT(1) NOT NULL DEFAULT 0;
