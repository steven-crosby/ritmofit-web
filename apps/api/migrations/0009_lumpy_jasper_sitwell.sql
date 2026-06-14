ALTER TABLE `provider_purge_queue` ADD `failed_at` integer;--> statement-breakpoint
CREATE INDEX `provider_purge_queue_active_requested_idx` ON `provider_purge_queue` (`failed_at`,`requested_at`);