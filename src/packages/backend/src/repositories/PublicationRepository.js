import { inArray } from 'drizzle-orm';
import { publications } from '../db/schema.js';

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
   * @param {string[]} ids
   * @returns {import('../db/schema.js').Publication[]}
   */
  findByIds(ids) {
    if (ids.length === 0) {
      return [];
    }

    return this.db
      .select()
      .from(publications)
      .where(inArray(publications.pubId, ids))
      .all();
  }
}
