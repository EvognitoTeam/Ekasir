ALTER TABLE `reservations`
  ADD COLUMN `customer_name` VARCHAR(255) NULL AFTER `user_id`,
  ADD COLUMN `customer_phone` VARCHAR(30) NULL AFTER `customer_name`;

-- Mapping status meja:
-- 0 = nonaktif, 1 = kosong, 2 = terisi, 3 = pembersihan, 4 = reservasi
ALTER TABLE `table_list`
  MODIFY COLUMN `status` INT NOT NULL DEFAULT 1;
