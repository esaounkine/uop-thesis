import { foreignKey, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { CITATION_TYPES } from '../constants/citation-type.js';

export const publications = sqliteTable(
  'publications',
  {
    provider: text('provider').notNull(),
    pubId: text('pub_id').notNull(),
    title: text('title'),
    normalisedTitle: text('normalised_title'),
    externalId: text('external_id'),
    year: integer('year'),
  },
  (t) =>
    [
      primaryKey({
        columns: [t.provider, t.pubId],
      }),
    ],
);

export const authors = sqliteTable(
  'authors',
  {
    provider: text('provider').notNull(),
    authorId: text('author_id').notNull(),
    originalName: text('original_name'),
    normalisedName: text('normalised_name'),
    organisation: text('organisation'),
  },
  (t) =>
    [
      primaryKey({
        columns: [t.provider, t.authorId],
      }),
    ],
);

export const contributions = sqliteTable(
  'contributions',
  {
    provider: text('provider').notNull(),
    pubId: text('pub_id').notNull(),
    authorId: text('author_id').notNull(),
    position: integer('position').notNull(),
  },
  (t) =>
    [
      primaryKey({
        columns: [
          t.provider,
          t.pubId,
          t.authorId,
        ],
      }),
      foreignKey({
        columns: [t.provider, t.pubId],
        foreignColumns: [publications.provider, publications.pubId],
      }),
      foreignKey({
        columns: [t.provider, t.authorId],
        foreignColumns: [authors.provider, authors.authorId],
      }),
    ],
);

export const citations = sqliteTable(
  'citations',
  {
    provider: text('provider').notNull(),
    sourcePubId: text('source_pub_id').notNull(),
    targetPubId: text('target_pub_id').notNull(),
    classification: text('classification', {
      enum: CITATION_TYPES,
    }),
  },
  (t) =>
    [
      primaryKey({
        columns: [
          t.provider,
          t.sourcePubId,
          t.targetPubId,
        ],
      }),
      foreignKey({
        columns: [t.provider, t.sourcePubId],
        foreignColumns: [publications.provider, publications.pubId],
      }),
      foreignKey({
        columns: [t.provider, t.targetPubId],
        foreignColumns: [publications.provider, publications.pubId],
      }),
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
