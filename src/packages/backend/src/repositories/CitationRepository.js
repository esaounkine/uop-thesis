import { and, eq } from 'drizzle-orm';
import { citations } from '../db/schema.js';

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
   * The citation edges pointing at a cited publication (papers that cite it).
   *
   * @param {string} provider
   * @param {string} targetPubId
   * @returns {import('../db/schema.js').Citation[]}
   */
  findByTarget(provider, targetPubId) {
    return this.db
      .select()
      .from(citations)
      .where(and(
        eq(citations.provider, provider),
        eq(citations.targetPubId, targetPubId),
      ))
      .all();
  }
}
