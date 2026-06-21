PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_classes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`template` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`timeline_mode` text DEFAULT 'sequential' NOT NULL,
	`featured_category` text,
	`cover_image_url` text,
	`target_duration_ms` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`last_opened_at` integer,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "classes_template_check" CHECK("__new_classes"."template" in ('cycle', 'hiit', 'sculpt', 'tread')),
	CONSTRAINT "classes_status_check" CHECK("__new_classes"."status" in ('draft', 'ready', 'archived')),
	CONSTRAINT "classes_visibility_check" CHECK("__new_classes"."visibility" in ('private', 'public')),
	CONSTRAINT "classes_timeline_mode_check" CHECK("__new_classes"."timeline_mode" in ('sequential', 'free'))
);
--> statement-breakpoint
INSERT INTO `__new_classes`("id", "owner_user_id", "title", "description", "template", "status", "visibility", "timeline_mode", "featured_category", "cover_image_url", "target_duration_ms", "created_at", "updated_at", "last_opened_at") SELECT "id", "owner_user_id", "title", "description", "template", "status", "visibility", 'sequential', "featured_category", "cover_image_url", "target_duration_ms", "created_at", "updated_at", "last_opened_at" FROM `classes`;--> statement-breakpoint
DROP TABLE `classes`;--> statement-breakpoint
ALTER TABLE `__new_classes` RENAME TO `classes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `classes_visibility_idx` ON `classes` (`visibility`);--> statement-breakpoint
CREATE INDEX `classes_owner_updated_id_idx` ON `classes` (`owner_user_id`,`updated_at`,`id`);