DROP INDEX `classes_owner_user_id_idx`;--> statement-breakpoint
CREATE INDEX `classes_owner_updated_id_idx` ON `classes` (`owner_user_id`,`updated_at`,`id`);--> statement-breakpoint
CREATE INDEX `shares_target_user_resource_idx` ON `shares` (`resource_type`,`target_user_id`,`resource_id`);--> statement-breakpoint
CREATE INDEX `shares_target_team_resource_idx` ON `shares` (`resource_type`,`target_team_id`,`resource_id`);