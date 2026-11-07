ALTER TABLE `jobs` RENAME COLUMN `subject_id` TO `author_id`;--> statement-breakpoint
ALTER TABLE `jobs` DROP COLUMN `kind`;