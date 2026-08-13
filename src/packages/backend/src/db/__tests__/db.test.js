import { describe, expect, test } from '@jest/globals';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import * as schema from '../schema.js';
import { migrationsDir } from '../../config/env.js';
import { DbClient } from '../client.js';

// In-memory DB so the check is self-contained and never touches the real file.
const { db } = new DbClient();
migrate(db, { migrationsFolder: migrationsDir });

describe('db layer', () => {
  test('cache stores and reads back a payload', () => {
    const key = 'openalex:W123';
    const payload = JSON.stringify({
      results: [{ id: 'W1' }, { id: 'W2' }],
      page: 1,
    });
    db.insert(schema.cache).values({
      key: key,
      payload: payload,
      fetchedAt: new Date().toISOString(),
    })
      .run();

    const row = db.select().from(schema.cache)
      .where(eq(schema.cache.key, key))
      .get();
    expect(row.payload).toBe(payload);
  });

  test('publication round-trips through the normalised tables', () => {
    db.insert(schema.publications).values({
      pubId: 'P1',
      title: 'A Paper',
      normalisedTitle: 'a paper',
      externalId: '10.1/x',
    })
      .run();

    const row = db.select().from(schema.publications)
      .where(eq(schema.publications.pubId, 'P1'))
      .get();
    expect(row.title).toBe('A Paper');
    expect(row.externalId).toBe('10.1/x');
  });
});
