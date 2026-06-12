/*
 Owner-scope provider-id uniqueness. Tracks are a per-user library (D4), so the
 same provider track may live in many users' libraries — a GLOBAL unique on
 (provider, provider_track_id) wrongly 409'd the second importer of any song.
 Add a denormalized owner_user_id (== the parent track's owner) and make the
 unique index (owner_user_id, provider, provider_track_id).

 SQLite can't ADD a NOT NULL column without a default, so this is the standard
 table rebuild: create the new shape, copy rows backfilling owner from `tracks`,
 swap, then recreate the index. (CHECK uses an unqualified column so it's valid on
 the temp table name; semantically identical to the schema's enum check.)
*/
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_track_provider_ids` (
	`id` text PRIMARY KEY NOT NULL,
	`track_id` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_track_id` text NOT NULL,
	`provider_uri` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "track_provider_ids_provider_check" CHECK(`provider` in ('spotify', 'apple_music', 'soundcloud'))
);--> statement-breakpoint
INSERT INTO `__new_track_provider_ids` (`id`, `track_id`, `owner_user_id`, `provider`, `provider_track_id`, `provider_uri`, `created_at`, `updated_at`)
	SELECT `tpi`.`id`, `tpi`.`track_id`, `t`.`owner_user_id`, `tpi`.`provider`, `tpi`.`provider_track_id`, `tpi`.`provider_uri`, `tpi`.`created_at`, `tpi`.`updated_at`
	FROM `track_provider_ids` `tpi` JOIN `tracks` `t` ON `t`.`id` = `tpi`.`track_id`;--> statement-breakpoint
DROP TABLE `track_provider_ids`;--> statement-breakpoint
ALTER TABLE `__new_track_provider_ids` RENAME TO `track_provider_ids`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `track_provider_ids_owner_provider_id_unique` ON `track_provider_ids` (`owner_user_id`,`provider`,`provider_track_id`);
