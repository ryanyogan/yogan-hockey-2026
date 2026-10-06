CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`start_time` text NOT NULL,
	`season` integer NOT NULL,
	`season_type` integer NOT NULL,
	`home_team_id` text NOT NULL,
	`home_team_abbreviation` text NOT NULL,
	`home_team_name` text NOT NULL,
	`home_score` integer NOT NULL,
	`away_team_id` text NOT NULL,
	`away_team_abbreviation` text NOT NULL,
	`away_team_name` text NOT NULL,
	`away_score` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `games_date_idx` ON `games` (`date`);--> statement-breakpoint
CREATE TABLE `plays` (
	`game_id` text NOT NULL,
	`id` text NOT NULL,
	`position` integer NOT NULL,
	`type` text NOT NULL,
	`period` integer NOT NULL,
	`clock` text NOT NULL,
	`text` text NOT NULL,
	`team_id` text,
	`x` real,
	`y` real,
	`scoring` integer NOT NULL,
	`penalty` integer NOT NULL,
	`detail` text NOT NULL,
	PRIMARY KEY(`game_id`, `id`),
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plays_game_position_idx` ON `plays` (`game_id`,`position`);--> statement-breakpoint
CREATE TABLE `predictions` (
	`game_id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`pick_team_id` text,
	`win_probability` real,
	`reasoning` text,
	`key_factors` text,
	`made_at` text NOT NULL,
	`model` text NOT NULL,
	`inputs` text NOT NULL,
	CONSTRAINT "predictions_status_check" CHECK("predictions"."status" in ('made', 'failed')),
	CONSTRAINT "predictions_made_has_pick_check" CHECK("predictions"."status" = 'failed' or ("predictions"."pick_team_id" is not null and "predictions"."win_probability" is not null and "predictions"."reasoning" is not null and "predictions"."key_factors" is not null))
);
--> statement-breakpoint
CREATE TABLE `skeleton_bumps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`count` integer NOT NULL,
	`bumped_at` text NOT NULL
);
