ALTER TABLE `tracks` ADD `match_key` text;--> statement-breakpoint
CREATE INDEX `tracks_owner_match_key_idx` ON `tracks` (`owner_user_id`,`match_key`);