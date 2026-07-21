ALTER TABLE `users`
  ADD COLUMN `member_id` VARCHAR(11) NULL AFTER `remember_token`,
  ADD UNIQUE INDEX `users_member_id_unique` (`member_id`);
