CREATE TABLE `class_track_import_operations` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`request_hash` text NOT NULL,
	`writer_token` text NOT NULL,
	`snapshot_valid` integer NOT NULL,
	`result_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "class_track_import_snapshot_check" CHECK("class_track_import_operations"."snapshot_valid" = 1)
);
--> statement-breakpoint
CREATE INDEX `class_track_import_operations_class_id_idx` ON `class_track_import_operations` (`class_id`);