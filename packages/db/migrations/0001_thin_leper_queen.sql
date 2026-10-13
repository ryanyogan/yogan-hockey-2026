CREATE TABLE `pieces` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`kind` text NOT NULL,
	`date` text NOT NULL,
	`status` text NOT NULL,
	`headline` text NOT NULL,
	`body` text NOT NULL,
	`written_at` text NOT NULL,
	`model` text NOT NULL,
	`written_by` text NOT NULL,
	`reasons` text,
	`facts` text NOT NULL,
	CONSTRAINT "pieces_status_check" CHECK("pieces"."status" in ('published', 'rejected')),
	CONSTRAINT "pieces_written_by_check" CHECK("pieces"."written_by" = 'model'),
	CONSTRAINT "pieces_rejected_has_reasons_check" CHECK(("pieces"."status" = 'published') = ("pieces"."reasons" is null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pieces_published_slug_idx` ON `pieces` (`slug`) WHERE "pieces"."status" = 'published';--> statement-breakpoint
CREATE INDEX `pieces_kind_written_idx` ON `pieces` (`kind`,`written_at`);