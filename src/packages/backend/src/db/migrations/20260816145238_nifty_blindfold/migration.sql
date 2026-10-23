PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_publications` (
	`provider` text NOT NULL,
	`pub_id` text NOT NULL,
	`title` text,
	`normalised_title` text,
	`external_id` text,
	`year` integer,
	CONSTRAINT `publications_pk` PRIMARY KEY(`provider`, `pub_id`)
);
--> statement-breakpoint
INSERT INTO `__new_publications`(`pub_id`, `title`, `normalised_title`, `external_id`, `year`) SELECT `pub_id`, `title`, `normalised_title`, `external_id`, `year` FROM `publications`;--> statement-breakpoint
DROP TABLE `publications`;--> statement-breakpoint
ALTER TABLE `__new_publications` RENAME TO `publications`;--> statement-breakpoint
CREATE TABLE `__new_authors` (
	`provider` text NOT NULL,
	`author_id` text NOT NULL,
	`original_name` text,
	`normalised_name` text,
	`organisation` text,
	CONSTRAINT `authors_pk` PRIMARY KEY(`provider`, `author_id`)
);
--> statement-breakpoint
INSERT INTO `__new_authors`(`author_id`, `original_name`, `normalised_name`, `organisation`) SELECT `author_id`, `original_name`, `normalised_name`, `organisation` FROM `authors`;--> statement-breakpoint
DROP TABLE `authors`;--> statement-breakpoint
ALTER TABLE `__new_authors` RENAME TO `authors`;--> statement-breakpoint
CREATE TABLE `__new_contributions` (
	`provider` text NOT NULL,
	`pub_id` text NOT NULL,
	`author_id` text NOT NULL,
	`position` integer NOT NULL,
	CONSTRAINT `contributions_pk` PRIMARY KEY(`provider`, `pub_id`, `author_id`),
	CONSTRAINT `fk_contributions_provider_pub_id_publications_provider_pub_id_fk` FOREIGN KEY (`provider`,`pub_id`) REFERENCES `publications`(`provider`,`pub_id`),
	CONSTRAINT `fk_contributions_provider_author_id_authors_provider_author_id_fk` FOREIGN KEY (`provider`,`author_id`) REFERENCES `authors`(`provider`,`author_id`)
);
--> statement-breakpoint
INSERT INTO `__new_contributions`(`pub_id`, `author_id`, `position`) SELECT `pub_id`, `author_id`, `position` FROM `contributions`;--> statement-breakpoint
DROP TABLE `contributions`;--> statement-breakpoint
ALTER TABLE `__new_contributions` RENAME TO `contributions`;--> statement-breakpoint
CREATE TABLE `__new_citations` (
	`provider` text NOT NULL,
	`source_pub_id` text NOT NULL,
	`target_pub_id` text NOT NULL,
	`classification` text,
	CONSTRAINT `citations_pk` PRIMARY KEY(`provider`, `source_pub_id`, `target_pub_id`),
	CONSTRAINT `fk_citations_provider_source_pub_id_publications_provider_pub_id_fk` FOREIGN KEY (`provider`,`source_pub_id`) REFERENCES `publications`(`provider`,`pub_id`),
	CONSTRAINT `fk_citations_provider_target_pub_id_publications_provider_pub_id_fk` FOREIGN KEY (`provider`,`target_pub_id`) REFERENCES `publications`(`provider`,`pub_id`)
);
--> statement-breakpoint
INSERT INTO `__new_citations`(`source_pub_id`, `target_pub_id`, `classification`) SELECT `source_pub_id`, `target_pub_id`, `classification` FROM `citations`;--> statement-breakpoint
DROP TABLE `citations`;--> statement-breakpoint
ALTER TABLE `__new_citations` RENAME TO `citations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
