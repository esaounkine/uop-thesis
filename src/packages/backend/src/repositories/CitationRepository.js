import { citations } from '../db/schema.js';
import { buildConditions } from '../lib/build-conditions.js';

export class CitationRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * @param {import('../db/schema.js').Citation[]} rows
   */
  saveAll(rows) {
    if (rows.length === 0) {
      return;
    }

    this.db
      .insert(citations)
      .values(rows)
      .onConflictDoNothing()
      .run();
  }

  /**
   * @param {import('../db/schema.js').Citation} filters - fields to match
   * @returns {import('../db/schema.js').Citation[]}
   */
  findCitations(filters) {
    return this.db
      .select()
      .from(citations)
      .where(buildConditions(citations, filters))
      .all();
  }
}
