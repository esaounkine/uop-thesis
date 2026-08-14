import { inArray } from 'drizzle-orm';
import { contributions } from '../db/schema.js';

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
   * @param {string[]} pubIds
   * @returns {import('../db/schema.js').Contribution[]}
   */
  findByPubIds(pubIds) {
    if (pubIds.length === 0) {
      return [];
    }

    return this.db
      .select()
      .from(contributions)
      .where(inArray(contributions.pubId, pubIds))
      .all();
  }
}
