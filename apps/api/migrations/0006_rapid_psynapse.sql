CREATE TABLE `class_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`type` text NOT NULL,
	`start_offset_ms` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "class_sections_type_check" CHECK("class_sections"."type" in ('warm_up', 'climb', 'sprint', 'recovery', 'cool_down'))
);
--> statement-breakpoint
CREATE INDEX `class_sections_class_idx` ON `class_sections` (`class_id`);