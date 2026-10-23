import { eq } from 'drizzle-orm';
import { cache } from '../db/schema.js';

/**
 * Thrown when an entry exists but its date is past the TTL.
 * It carries the stale date so the caller can still show the cut-off.
 */
export class OutdatedCacheError extends Error {
  constructor(key, fetchedAt) {
    super(`Cache entry '${key}' is outdated (fetched ${fetchedAt.toISOString()})`);
    this.name = 'OutdatedCacheError';
    this.key = key;
    this.fetchedAt = fetchedAt;
  }
}

/**
 * Stores structured provider results as a JSON payload under a key.
 * See the Global Cache flow in docs/system-design.md#global-cache-flow.
 */
export class CacheRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Returns { value, fetchedAt } on a fresh hit, or null on a miss (empty).
   * Throws when the entry exists but is outdated, so a caller can tell the two apart.
   *
   * @param {string} key
   * @param {number} [ttlMs]
   * @returns {{ value: any, fetchedAt: Date } | null}
   * @throws OutdatedCacheError when the entry exists but is past the TTL
   */
  getOrFail(key, ttlMs) {
    const row = this.db.select().from(cache)
      .where(eq(cache.key, key))
      .get();

    if (!row) {
      return null;
    }

    const fetchedAt = new Date(row.fetchedAt);

    if (ttlMs != null && Date.now() - fetchedAt.getTime() >= ttlMs) {
      throw new OutdatedCacheError(key, fetchedAt);
    }

    return {
      value: row.payload,
      fetchedAt: fetchedAt,
    };
  }

  /**
   * Returns { value, fetchedAt } on a fresh hit, or null on a miss or an outdated entry.
   * Use getOrFail when the difference between a miss and an outdated entry matters.
   *
   * @param {string} key
   * @param {number} [ttlMs]
   * @returns {{ value: any, fetchedAt: Date } | null}
   */
  get(key, ttlMs) {
    try {
      return this.getOrFail(key, ttlMs);
    } catch (error) {
      if (error instanceof OutdatedCacheError) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Upserts the value under the key with the current date.
   *
   * @param key
   * @param value
   * @returns {Date} the stored date
   */
  put(key, value) {
    const fetchedAt = new Date().toISOString();

    this.db.insert(cache).values({
      key: key,
      payload: value,
      fetchedAt: fetchedAt,
    })
      .onConflictDoUpdate({
        target: cache.key,
        set: {
          payload: value,
          fetchedAt: fetchedAt,
        },
      })
      .run();

    return new Date(fetchedAt);
  }
}
