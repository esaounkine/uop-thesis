CREATE TABLE `authors` (
	`author_id` text PRIMARY KEY,
	`original_name` text,
	`normalised_name` text
);
--> statement-breakpoint
CREATE TABLE `cache` (
	`key` text PRIMARY KEY,
	`payload` text,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `citations` (
	`source_pub_id` text NOT NULL,
	`target_pub_id` text NOT NULL,
	`classification` text,
	CONSTRAINT `citations_pk` PRIMARY KEY(`source_pub_id`, `target_pub_id`),
	CONSTRAINT `fk_citations_source_pub_id_publications_pub_id_fk` FOREIGN KEY (`source_pub_id`) REFERENCES `publications`(`pub_id`),
	CONSTRAINT `fk_citations_target_pub_id_publications_pub_id_fk` FOREIGN KEY (`target_pub_id`) REFERENCES `publications`(`pub_id`)
);
--> statement-breakpoint
CREATE TABLE `contributions` (
	`pub_id` text NOT NULL,
	`author_id` text NOT NULL,
	`position` integer NOT NULL,
	CONSTRAINT `contributions_pk` PRIMARY KEY(`pub_id`, `author_id`),
	CONSTRAINT `fk_contributions_pub_id_publications_pub_id_fk` FOREIGN KEY (`pub_id`) REFERENCES `publications`(`pub_id`),
	CONSTRAINT `fk_contributions_author_id_authors_author_id_fk` FOREIGN KEY (`author_id`) REFERENCES `authors`(`author_id`)
);
--> statement-breakpoint
CREATE TABLE `publications` (
	`pub_id` text PRIMARY KEY,
	`title` text,
	`normalised_title` text,
	`external_id` text
);
