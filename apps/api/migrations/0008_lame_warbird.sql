CREATE INDEX `class_track_moves_class_track_id_idx` ON `class_track_moves` (`class_track_id`);--> statement-breakpoint
CREATE INDEX `class_tracks_class_id_idx` ON `class_tracks` (`class_id`);--> statement-breakpoint
CREATE INDEX `classes_owner_user_id_idx` ON `classes` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `cues_class_track_id_idx` ON `cues` (`class_track_id`);--> statement-breakpoint
CREATE INDEX `user_moves_user_id_idx` ON `user_moves` (`user_id`);