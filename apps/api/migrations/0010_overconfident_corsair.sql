PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_class_tracks` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`track_id` text NOT NULL,
	`position` integer NOT NULL,
	`intensity` text DEFAULT 'none' NOT NULL,
	`display_bpm_override` integer,
	`duration_ms_override` integer,
	`start_offset_ms` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "class_tracks_intensity_check" CHECK("__new_class_tracks"."intensity" in ('none', 'easy', 'mod', 'hard', 'all_out')),
	CONSTRAINT "class_tracks_duration_ms_override_check" CHECK("__new_class_tracks"."duration_ms_override" is null or "__new_class_tracks"."duration_ms_override" > 0)
);
--> statement-breakpoint
INSERT INTO `__new_class_tracks`("id", "class_id", "track_id", "position", "intensity", "display_bpm_override", "duration_ms_override", "start_offset_ms", "notes", "created_at", "updated_at") SELECT "id", "class_id", "track_id", "position", "intensity", "display_bpm_override", NULL, "start_offset_ms", "notes", "created_at", "updated_at" FROM `class_tracks`;--> statement-breakpoint
DROP TABLE `class_tracks`;--> statement-breakpoint
ALTER TABLE `__new_class_tracks` RENAME TO `class_tracks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `class_tracks_class_id_idx` ON `class_tracks` (`class_id`);
