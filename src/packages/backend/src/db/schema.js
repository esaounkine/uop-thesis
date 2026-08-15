import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { CITATION_TYPES } from '../constants/citation-type.js';

export const publications = sqliteTable('publications', {
  pubId: text('pub_id').primaryKey(),
  title: text('title'),
  normalisedTitle: text('normalised_title'),
  externalId: text('external_id'),
  year: integer('year'),
});

export const authors = sqliteTable('authors', {
  authorId: text('author_id').primaryKey(),
  originalName: text('original_name'),
  normalisedName: text('normalised_name'),
});

export const contributions = sqliteTable(
  'contributions',
  {
    pubId: text('pub_id').notNull()
      .references(() =>
        publications.pubId),
    authorId: text('author_id').notNull()
      .references(() =>
        authors.authorId),
    position: integer('position').notNull(),
  },
  (t) =>
    [
      primaryKey({
        columns: [t.pubId, t.authorId],
      }),
    ],
);

export const citations = sqliteTable(
  'citations',
  {
    sourcePubId: text('source_pub_id').notNull()
      .references(() =>
        publications.pubId),
    targetPubId: text('target_pub_id').notNull()
      .references(() =>
        publications.pubId),
    classification: text('classification', {
      enum: CITATION_TYPES,
    }),
  },
  (t) =>
    [
      primaryKey({
        columns: [t.sourcePubId, t.targetPubId],
      },
      ),
    ],
);

export const cache = sqliteTable('cache', {
  key: text('key').primaryKey(),
  payload: text('payload'),
  fetchedAt: text('fetched_at').notNull(),
});

// Entity types, inferred from the tables above. Single source of truth.
/** @typedef {typeof publications.$inferSelect} Publication */
/** @typedef {typeof authors.$inferSelect} Author */
/** @typedef {typeof contributions.$inferSelect} Contribution */
/** @typedef {typeof citations.$inferSelect} Citation */
