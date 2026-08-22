import { count, eq, getTableName } from 'drizzle-orm';
import { authors, citations, contributions, jobs, publications } from '../db/schema.js';

const TABLES = [
  publications,
  authors,
  contributions,
  citations,
  jobs,
];

/**
 * Get DB table counts.
 * Used for status reporting.
 */
export class StatsRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * @param {string} provider
   * @returns {Record<string, number>} row count per table for the provider
   */
  countByProvider(provider) {
    return Object.fromEntries(
      TABLES.map((table) => {
        const name = getTableName(table);
        const row = this.db
          .select({
            n: count(),
          })
          .from(table)
          .where(eq(table.provider, provider))
          .get();

        return [name, row.n];
      }),
    );
  }
}
