import { publications } from '../db/schema.js';
import { buildConditions } from '../lib/build-conditions.js';

export class PublicationRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * @param {import('../db/schema.js').Publication[]} rows
   */
  saveAll(rows) {
    if (rows.length === 0) {
      return;
    }

    this.db
      .insert(publications)
      .values(rows)
      .onConflictDoNothing()
      .run();
  }

  /**
   * @param {Object} filters - fields to match
   * @returns {import('../db/schema.js').Publication | undefined}
   */
  findPublication(filters) {
    return this.db
      .select()
      .from(publications)
      .where(buildConditions(publications, filters))
      .get();
  }

  /**
   * @param {Object} filters - fields to match
   * @returns {import('../db/schema.js').Publication[]}
   */
  findPublications(filters) {
    return this.db
      .select()
      .from(publications)
      .where(buildConditions(publications, filters))
      .all();
  }
}
