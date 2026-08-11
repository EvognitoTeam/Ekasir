ALTER TABLE `reservations`
  ADD COLUMN `guest_name` VARCHAR(120) NULL AFTER `branch_id`,
  ADD COLUMN `guest_phone` VARCHAR(30) NULL AFTER `guest_name`;
