CREATE TABLE `activities` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned,
	`mitra_id` bigint unsigned NOT NULL,
	`branch_id` bigint unsigned,
	`activity_type` varchar(255) NOT NULL,
	`ip_address` varchar(50),
	`browser` text,
	`description` text NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	`deleted_at` timestamp,
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `addon_categories` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`mitra_id` bigint NOT NULL,
	`branch_id` bigint unsigned,
	`name` varchar(255) NOT NULL,
	`is_required` int NOT NULL DEFAULT 0,
	`max_selected` int NOT NULL DEFAULT 1,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `addon_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `addons` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`mitra_id` bigint unsigned NOT NULL,
	`branch_id` bigint unsigned,
	`category_id` bigint unsigned,
	`name` varchar(255) NOT NULL,
	`price` decimal NOT NULL,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp,
	`updated_at` timestamp,
	`deleted_at` timestamp,
	CONSTRAINT `addons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `branches` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`mitra_id` bigint unsigned NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` text,
	`phone` varchar(50),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `branches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cashouts` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`mitra_id` bigint unsigned NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`created_at` timestamp,
	`updated_at` timestamp,
	`deleted_at` timestamp,
	CONSTRAINT `cashouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`mitra_id` bigint unsigned NOT NULL,
	`branch_id` bigint unsigned,
	`name` varchar(20) NOT NULL,
	`created_at` datetime,
	`updated_at` datetime,
	`deleted_at` timestamp,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupon` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`mitra_id` bigint unsigned,
	`branch_id` bigint unsigned,
	`title` varchar(255),
	`image` varchar(255) DEFAULT 'default_promo.jpg',
	`description` text,
	`coupon_code` varchar(25) NOT NULL,
	`is_member_only` boolean NOT NULL DEFAULT false,
	`discount_price` decimal,
	`discount_rate` int,
	`max_use` int NOT NULL DEFAULT 0,
	`already_used` int NOT NULL DEFAULT 0,
	`start_date` timestamp,
	`expired_date` timestamp,
	`created_at` datetime,
	`updated_at` datetime,
	`deleted_at` timestamp,
	CONSTRAINT `coupon_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_points` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`mitra_id` bigint unsigned NOT NULL,
	`branch_id` bigint unsigned,
	`points` int NOT NULL DEFAULT 0,
	`loyalty_id` varchar(25) NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	`deleted_at` timestamp,
	CONSTRAINT `loyalty_points_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `materials` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`mitra_id` bigint unsigned NOT NULL,
	`branch_id` bigint unsigned,
	`name` varchar(255) NOT NULL,
	`image` text,
	`unit` varchar(50) NOT NULL,
	`stock` decimal(10,2) DEFAULT '0',
	`low_stock_threshold` decimal(10,2) DEFAULT '0',
	`cost_per_unit` decimal(10,2) DEFAULT '0',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mitra` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`mitra_slug` varchar(50) NOT NULL,
	`billing_type` enum('fee','subscription') NOT NULL DEFAULT 'fee',
	`mitra_name` varchar(50) NOT NULL,
	`mitra_address` text,
	`mitra_welcome` text,
	`banner` varchar(255) DEFAULT 'default_banner.jpg',
	`bank_name` text,
	`no_rek` varchar(255),
	`nama_rek` varchar(255),
	`rek_added_at` timestamp,
	`cashout` int DEFAULT 8,
	`subscription_until` timestamp,
	`theme_layout` enum('simple','modern','compact') DEFAULT 'simple',
	`status` int NOT NULL DEFAULT 1,
	`created_at` datetime,
	`updated_at` datetime,
	`deleted_at` timestamp,
	CONSTRAINT `mitra_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`order_id` bigint unsigned NOT NULL,
	`product_id` bigint unsigned NOT NULL,
	`mitra_id` bigint unsigned,
	`branch_id` bigint unsigned,
	`quantity` int NOT NULL,
	`notes` json,
	`price` decimal NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	`deleted_at` timestamp,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`order_code` varchar(255) NOT NULL,
	`mitra_id` bigint unsigned,
	`branch_id` bigint unsigned,
	`cashier_id` bigint unsigned,
	`user_id` bigint unsigned,
	`name` varchar(255),
	`email` varchar(255),
	`phone_number` varchar(255),
	`table_number` bigint unsigned,
	`manual_table_info` varchar(100),
	`status` enum('pending','completed','confirmed','preparing','ready','cancelled') NOT NULL DEFAULT 'pending',
	`confirmed_at` timestamp,
	`preparing_at` timestamp,
	`ready_at` timestamp,
	`admin_notes` text,
	`is_cashouted` boolean NOT NULL DEFAULT false,
	`total_price` decimal NOT NULL DEFAULT '0',
	`service` decimal NOT NULL DEFAULT '0',
	`tax` decimal NOT NULL DEFAULT '0',
	`discount` decimal,
	`totalAfterDiscount` decimal,
	`payment_method` enum('cash','qris') DEFAULT 'cash',
	`getPayment` decimal,
	`cashChange` decimal,
	`discountId` bigint unsigned,
	`transaction_id` text,
	`payment_type` varchar(50),
	`issuer` varchar(25),
	`qr_url` text,
	`qr_string` text,
	`expiry_time` timestamp,
	`payment_status` enum('1','2','3','4') NOT NULL DEFAULT '1',
	`created_at` timestamp,
	`updated_at` timestamp,
	`deleted_at` timestamp,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `print_settings` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`key` varchar(255) NOT NULL,
	`mitra_id` bigint unsigned,
	`branch_id` bigint unsigned,
	`value` text,
	`created_at` timestamp,
	`updated_at` timestamp,
	`deleted_at` timestamp,
	CONSTRAINT `print_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_recipes` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`mitra_id` bigint unsigned NOT NULL,
	`branch_id` bigint unsigned,
	`product_id` int NOT NULL,
	`material_id` int NOT NULL,
	`amount_needed` decimal(10,2) NOT NULL,
	CONSTRAINT `product_recipes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`mitra_id` bigint unsigned,
	`branch_id` bigint unsigned,
	`name` varchar(255) NOT NULL,
	`description` text,
	`categories_id` bigint unsigned NOT NULL,
	`stock` int NOT NULL DEFAULT 0,
	`price` int NOT NULL,
	`image` varchar(255),
	`status` tinyint NOT NULL DEFAULT 1,
	`addon_id` json,
	`created_at` timestamp,
	`updated_at` timestamp,
	`deleted_at` timestamp,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reservation_table_list` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`reservation_id` bigint unsigned NOT NULL,
	`table_list_id` bigint unsigned NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `reservation_table_list_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned,
	`table_id` bigint unsigned,
	`mitra_id` bigint unsigned,
	`branch_id` bigint unsigned,
	`reserved_start` datetime NOT NULL,
	`reserved_end` datetime NOT NULL,
	`guest_count` int NOT NULL,
	`status` enum('pending','confirmed','canceled','completed','no_show') NOT NULL DEFAULT 'pending',
	`notes` text,
	`created_at` timestamp,
	`updated_at` timestamp,
	`deleted_at` timestamp,
	CONSTRAINT `reservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`mitra_id` bigint unsigned,
	`branch_id` bigint unsigned,
	`product_id` bigint unsigned,
	`user_id` bigint unsigned,
	`order_id` bigint unsigned,
	`rating` decimal(5,1) NOT NULL DEFAULT '0.0',
	`comment` text,
	`created_at` timestamp,
	`updated_at` timestamp,
	`deleted_at` timestamp,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`mitra_id` bigint unsigned NOT NULL,
	`branch_id` bigint unsigned,
	`tax_rate` int DEFAULT 10,
	`service_rate` int DEFAULT 5,
	`is_tax_included` tinyint DEFAULT 0,
	`wifi_ssid` varchar(100),
	`wifi_password` varchar(100),
	`facility` json,
	`faq` json,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `table_list` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`mitra_id` bigint unsigned,
	`branch_id` bigint unsigned,
	`table_name` varchar(20) NOT NULL,
	`capacity` int DEFAULT 1,
	`table_code` varchar(6),
	`status` int NOT NULL DEFAULT 1,
	`created_at` datetime,
	`updated_at` datetime,
	`deleted_at` timestamp,
	CONSTRAINT `table_list_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`email_verified_at` timestamp,
	`password` varchar(255) NOT NULL,
	`phone` varchar(15),
	`remember_token` varchar(100),
	`mitra_id` bigint unsigned NOT NULL,
	`branch_id` bigint unsigned,
	`is_login` boolean NOT NULL DEFAULT false,
	`login_at` timestamp,
	`role` enum('Owner','Cashier','Kitchen','User') NOT NULL DEFAULT 'User',
	`token` varchar(40),
	`onesignalid` text,
	`created_at` timestamp,
	`updated_at` timestamp,
	`deleted_at` timestamp,
	CONSTRAINT `users_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `addons` ADD CONSTRAINT `addons_category_id_addon_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `addon_categories`(`id`) ON DELETE set null ON UPDATE no action;