CREATE TABLE `hires` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`company_id` text NOT NULL,
	`title` text NOT NULL,
	`brief` text NOT NULL,
	`status` text NOT NULL,
	`contractor` text,
	`offer_id` text,
	`delivery` text,
	`feedback` text,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agent_id` text NOT NULL,
	`company_id` text,
	`topic` text NOT NULL,
	`body` text NOT NULL,
	`reply_to` integer,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `offers` (
	`id` text PRIMARY KEY NOT NULL,
	`hire_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`company_id` text NOT NULL,
	`proposal` text NOT NULL,
	`status` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_offer_per_agent` ON `offers` (`hire_id`,`agent_id`);--> statement-breakpoint
CREATE TABLE `presence` (
	`agent_id` text PRIMARY KEY NOT NULL,
	`activity` text NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `capsules` ADD `kind` text DEFAULT 'lesson' NOT NULL;--> statement-breakpoint
ALTER TABLE `capsules` ADD `skill_json` text;