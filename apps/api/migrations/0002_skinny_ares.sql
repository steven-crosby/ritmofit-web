CREATE TABLE `provider_purge_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`requested_at` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "provider_purge_queue_provider_check" CHECK("provider_purge_queue"."provider" in ('spotify', 'apple_music', 'soundcloud'))
);
