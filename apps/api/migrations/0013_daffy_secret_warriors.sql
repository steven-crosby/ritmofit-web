CREATE TABLE `class_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`tag` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `class_tags_class_id_tag_unq` ON `class_tags` (`class_id`,`tag`);--> statement-breakpoint
CREATE INDEX `class_tags_tag_idx` ON `class_tags` (`tag`);--> statement-breakpoint
ALTER TABLE `classes` ADD `featured_category` text;--> statement-breakpoint
ALTER TABLE `classes` ADD `cover_image_url` text;