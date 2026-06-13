PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_classes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`template` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`target_duration_ms` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`last_opened_at` integer,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "classes_template_check" CHECK("__new_classes"."template" in ('cycle', 'hiit', 'sculpt', 'tread')),
	CONSTRAINT "classes_status_check" CHECK("__new_classes"."status" in ('draft', 'ready', 'archived')),
	CONSTRAINT "classes_visibility_check" CHECK("__new_classes"."visibility" in ('private', 'public'))
);
--> statement-breakpoint
-- `visibility` is new: the old `classes` has no such column, so backfill the
-- default literal ('private') here instead of selecting it (drizzle-kit's rebuild
-- naively sourced it from the old table, which would error at apply time).
INSERT INTO `__new_classes`("id", "owner_user_id", "title", "description", "template", "status", "visibility", "target_duration_ms", "created_at", "updated_at", "last_opened_at") SELECT "id", "owner_user_id", "title", "description", "template", "status", 'private', "target_duration_ms", "created_at", "updated_at", "last_opened_at" FROM `classes`;--> statement-breakpoint
DROP TABLE `classes`;--> statement-breakpoint
ALTER TABLE `__new_classes` RENAME TO `classes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `classes_visibility_idx` ON `classes` (`visibility`);