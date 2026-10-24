PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_cues` (
	`id` text PRIMARY KEY NOT NULL,
	`class_track_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`anchor_ms` integer NOT NULL,
	`beat` integer,
	`bar` integer,
	`text` text NOT NULL,
	`duration_ms` integer,
	`bpm` integer,
	`intensity` text,
	`note` text,
	`color` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`class_track_id`) REFERENCES `class_tracks`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "cues_position_check" CHECK("__new_cues"."position" >= 0),
	CONSTRAINT "cues_duration_ms_check" CHECK("__new_cues"."duration_ms" is null or ("__new_cues"."duration_ms" > 0 and "__new_cues"."duration_ms" <= 86400000)),
	CONSTRAINT "cues_bpm_check" CHECK("__new_cues"."bpm" is null or "__new_cues"."bpm" > 0),
	CONSTRAINT "cues_intensity_check" CHECK("__new_cues"."intensity" in ('none', 'easy', 'mod', 'hard', 'all_out', 'open'))
);
--> statement-breakpoint
INSERT INTO `__new_cues`("id", "class_track_id", "position", "anchor_ms", "beat", "bar", "text", "duration_ms", "bpm", "intensity", "note", "color", "created_at", "updated_at") SELECT "id", "class_track_id", 0, "anchor_ms", "beat", "bar", "text", NULL, NULL, NULL, NULL, "color", "created_at", "updated_at" FROM `cues`;--> statement-breakpoint
DROP TABLE `cues`;--> statement-breakpoint
ALTER TABLE `__new_cues` RENAME TO `cues`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `cues_class_track_id_idx` ON `cues` (`class_track_id`);