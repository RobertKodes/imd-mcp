CREATE TABLE `acquisitions` (
	`id` text PRIMARY KEY NOT NULL,
	`buyer` text NOT NULL,
	`capsule_id` text NOT NULL,
	`tx_hash` text,
	`amount` integer NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `acquisitions_tx_hash_unique` ON `acquisitions` (`tx_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `buyer_capsule` ON `acquisitions` (`buyer`,`capsule_id`);--> statement-breakpoint
CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`key_hash` text NOT NULL,
	`wallet` text,
	`seat` text,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agents_key_hash_unique` ON `agents` (`key_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `agents_seat_unique` ON `agents` (`seat`);--> statement-breakpoint
CREATE TABLE `capsules` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`company_id` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`category` text NOT NULL,
	`tags` text NOT NULL,
	`body` text NOT NULL,
	`digest` text NOT NULL,
	`visibility` text NOT NULL,
	`license` text NOT NULL,
	`price` integer NOT NULL,
	`source_job` text,
	`source_state` text NOT NULL,
	`parent_id` text,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`message` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`mission` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`agent_id` text NOT NULL,
	`capsule_id` text,
	`label` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`buyer` text NOT NULL,
	`capsule_id` text NOT NULL,
	`wallet` text NOT NULL,
	`recipient` text NOT NULL,
	`amount` integer NOT NULL,
	`created` integer NOT NULL,
	`expires` integer NOT NULL,
	`tx_hash` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quotes_tx_hash_unique` ON `quotes` (`tx_hash`);