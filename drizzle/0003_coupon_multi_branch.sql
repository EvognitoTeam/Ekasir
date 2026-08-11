CREATE TABLE `coupon_branches` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `coupon_id` bigint unsigned NOT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `coupon_branches_coupon_branch_unique` (`coupon_id`,`branch_id`),
  KEY `coupon_branches_branch_idx` (`branch_id`)
);

-- Data promo lama yang sebelumnya hanya memiliki satu branch_id tetap dipertahankan.
INSERT IGNORE INTO `coupon_branches` (`coupon_id`, `branch_id`)
SELECT `id`, `branch_id` FROM `coupon` WHERE `branch_id` IS NOT NULL;

-- Setelah relasi dipindahkan, NULL berarti promo global/semua cabang.
UPDATE `coupon` SET `branch_id` = NULL WHERE `branch_id` IS NOT NULL;
