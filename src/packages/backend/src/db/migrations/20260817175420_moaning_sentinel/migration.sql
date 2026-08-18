CREATE TABLE `jobs` (
	`id` text PRIMARY KEY,
	`provider` text NOT NULL,
	`kind` text NOT NULL,
	`subject_id` text NOT NULL,
	`status` text NOT NULL,
	`progress` text,
	`result` text,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
