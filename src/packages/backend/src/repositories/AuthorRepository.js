import { authors } from '../db/schema.js';
import { buildConditions } from '../lib/build-conditions.js';

export class AuthorRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * @param {import('../db/schema.js').Author[]} rows
   */
  saveAll(rows) {
    if (rows.length === 0) {
      return;
    }

    this.db
      .insert(authors)
      .values(rows)
      .onConflictDoNothing()
      .run();
  }

  /**
   * @param {Object} filters - fields to match
   * @returns {import('../db/schema.js').Author | undefined}
   */
  findAuthor(filters) {
    return this.db
      .select()
      .from(authors)
      .where(buildConditions(authors, filters))
      .get();
  }
}
