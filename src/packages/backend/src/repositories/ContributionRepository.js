import { contributions } from '../db/schema.js';
import { buildConditions } from '../lib/build-conditions.js';

export class ContributionRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * @param {import('../db/schema.js').Contribution[]} rows
   */
  saveAll(rows) {
    if (rows.length === 0) {
      return;
    }

    this.db
      .insert(contributions)
      .values(rows)
      .onConflictDoNothing()
      .run();
  }

  /**
   * @param {Object} filters - fields to match
   * @returns {import('../db/schema.js').Contribution[]}
   */
  findContributions(filters) {
    return this.db
      .select()
      .from(contributions)
      .where(buildConditions(contributions, filters))
      .all();
  }
}
