CREATE TABLE `class_plan_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`recipe_block_key` text,
	`position` integer NOT NULL,
	`segment_type` text,
	`label` text NOT NULL,
	`target_duration_ms` integer NOT NULL,
	`intensity` text NOT NULL,
	`teaching_goal` text NOT NULL,
	`movement_focus` text NOT NULL,
	`guidance_kind` text NOT NULL,
	`guidance_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "class_plan_blocks_segment_type_check" CHECK("class_plan_blocks"."segment_type" in ('warm_up', 'climb', 'sprint', 'recovery', 'cool_down')),
	CONSTRAINT "class_plan_blocks_intensity_check" CHECK("class_plan_blocks"."intensity" in ('none', 'easy', 'mod', 'hard', 'all_out')),
	CONSTRAINT "class_plan_blocks_guidance_kind_check" CHECK("class_plan_blocks"."guidance_kind" in ('cycle', 'pilates', 'hiit')),
	CONSTRAINT "class_plan_blocks_position_check" CHECK("class_plan_blocks"."position" >= 0),
	CONSTRAINT "class_plan_blocks_target_duration_check" CHECK("class_plan_blocks"."target_duration_ms" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `class_plan_blocks_class_position_unique` ON `class_plan_blocks` (`class_id`,`position`);--> statement-breakpoint
CREATE INDEX `class_plan_blocks_class_id_idx` ON `class_plan_blocks` (`class_id`);--> statement-breakpoint
ALTER TABLE `class_tracks` ADD `plan_block_id` text REFERENCES class_plan_blocks(id) ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX `class_tracks_plan_block_id_idx` ON `class_tracks` (`plan_block_id`);--> statement-breakpoint
ALTER TABLE `classes` ADD `scaffold_recipe_id` text;
