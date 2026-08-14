import { authors } from '../db/schema.js';

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
}
