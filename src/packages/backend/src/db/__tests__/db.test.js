import {
  beforeEach, describe, expect, it,
} from '@jest/globals';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import * as schema from '../schema.js';
import { migrationsDir } from '../../config/env.js';
import { DbClient } from '../DbClient.js';

// In-memory DB so the check is self-contained and never touches the real file.
const { db } = new DbClient();
migrate(db, { migrationsFolder: migrationsDir });

describe('db layer', () => {
  describe('cache table', () => {
    const key = 'openalex:W123';
    const payload = {
      results: [{ id: 'W1' }, { id: 'W2' }],
      page: 1,
    };
    let row;

    beforeEach(() => {
      db.insert(schema.cache).values({
        key: key,
        payload: payload,
        fetchedAt: new Date().toISOString(),
      })
        .run();
      row = db.select().from(schema.cache)
        .where(eq(schema.cache.key, key))
        .get();
    });

    it('reads back the stored payload', () => {
      expect(row.payload).toEqual(payload);
    });
  });

  describe('publications table', () => {
    let row;

    beforeEach(() => {
      db.insert(schema.publications).values({
        provider: 'openalex',
        pubId: 'P1',
        title: 'A Paper',
        normalisedTitle: 'a paper',
        externalId: '10.1/x',
      })
        .onConflictDoNothing()
        .run();
      row = db.select().from(schema.publications)
        .where(eq(schema.publications.pubId, 'P1'))
        .get();
    });

    it('keeps the title', () => {
      expect(row.title).toBe('A Paper');
    });

    it('keeps the external id', () => {
      expect(row.externalId).toBe('10.1/x');
    });
  });
});
