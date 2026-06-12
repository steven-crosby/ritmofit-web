CREATE TABLE `class_track_moves` (
	`id` text PRIMARY KEY NOT NULL,
	`class_track_id` text NOT NULL,
	`anchor_ms` integer NOT NULL,
	`move_id` text,
	`user_move_id` text,
	`name_override` text,
	`intensity` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`class_track_id`) REFERENCES `class_tracks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`move_id`) REFERENCES `moves`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_move_id`) REFERENCES `user_moves`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "class_track_moves_intensity_check" CHECK("class_track_moves"."intensity" in ('none', 'easy', 'mod', 'hard', 'all_out')),
	CONSTRAINT "class_track_moves_reference_check" CHECK((("class_track_moves"."move_id" is not null) + ("class_track_moves"."user_move_id" is not null)) <= 1
        and ("class_track_moves"."move_id" is not null or "class_track_moves"."user_move_id" is not null or "class_track_moves"."name_override" is not null))
);
--> statement-breakpoint
CREATE TABLE `class_tracks` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`track_id` text NOT NULL,
	`position` integer NOT NULL,
	`intensity` text DEFAULT 'none' NOT NULL,
	`display_bpm_override` integer,
	`start_offset_ms` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "class_tracks_intensity_check" CHECK("class_tracks"."intensity" in ('none', 'easy', 'mod', 'hard', 'all_out'))
);
--> statement-breakpoint
CREATE TABLE `classes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`template` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`target_duration_ms` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`last_opened_at` integer,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "classes_template_check" CHECK("classes"."template" in ('cycle', 'hiit', 'sculpt', 'tread')),
	CONSTRAINT "classes_status_check" CHECK("classes"."status" in ('draft', 'ready', 'archived'))
);
--> statement-breakpoint
CREATE TABLE `cues` (
	`id` text PRIMARY KEY NOT NULL,
	`class_track_id` text NOT NULL,
	`anchor_ms` integer NOT NULL,
	`beat` integer,
	`bar` integer,
	`text` text NOT NULL,
	`color` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`class_track_id`) REFERENCES `class_tracks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `moves` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`template` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "moves_template_check" CHECK("moves"."template" in ('cycle', 'hiit', 'sculpt', 'tread'))
);
--> statement-breakpoint
CREATE TABLE `music_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`access_token_encrypted` text NOT NULL,
	`refresh_token_encrypted` text,
	`provider_user_id` text,
	`scope` text,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "music_connections_provider_check" CHECK("music_connections"."provider" in ('spotify', 'apple_music', 'soundcloud'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `music_connections_user_provider_unique` ON `music_connections` (`user_id`,`provider`);--> statement-breakpoint
CREATE TABLE `shares` (
	`id` text PRIMARY KEY NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`shared_by_user_id` text NOT NULL,
	`target_user_id` text,
	`target_team_id` text,
	`permission` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`shared_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "shares_resource_type_check" CHECK("shares"."resource_type" in ('class')),
	CONSTRAINT "shares_permission_check" CHECK("shares"."permission" in ('view', 'edit')),
	CONSTRAINT "shares_one_target_check" CHECK(("shares"."target_user_id" is null) <> ("shares"."target_team_id" is null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shares_resource_target_user_unique` ON `shares` (`resource_type`,`resource_id`,`target_user_id`) WHERE "shares"."target_user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX `shares_resource_target_team_unique` ON `shares` (`resource_type`,`resource_id`,`target_team_id`) WHERE "shares"."target_team_id" is not null;--> statement-breakpoint
CREATE TABLE `team_memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`team_id` text NOT NULL,
	`role` text NOT NULL,
	`joined_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "team_memberships_role_check" CHECK("team_memberships"."role" in ('owner', 'admin', 'member'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_memberships_user_team_unique` ON `team_memberships` (`user_id`,`team_id`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `track_provider_ids` (
	`id` text PRIMARY KEY NOT NULL,
	`track_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_track_id` text NOT NULL,
	`provider_uri` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "track_provider_ids_provider_check" CHECK("track_provider_ids"."provider" in ('spotify', 'apple_music', 'soundcloud'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `track_provider_ids_provider_id_unique` ON `track_provider_ids` (`provider`,`provider_track_id`);--> statement-breakpoint
CREATE TABLE `tracks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`title` text NOT NULL,
	`artist` text NOT NULL,
	`album_art_url` text,
	`duration_ms` integer,
	`display_bpm` integer,
	`isrc` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_moves` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`base_move_id` text,
	`template` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`base_move_id`) REFERENCES `moves`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "user_moves_template_check" CHECK("user_moves"."template" in ('cycle', 'hiit', 'sculpt', 'tread'))
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text,
	`image_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);