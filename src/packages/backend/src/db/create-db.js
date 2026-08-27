import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { dbFile } from '../config/env.js';
import * as schema from './schema.js';

/**
 * @param {string} [dbPath]
 * @returns {ReturnType<typeof drizzle>}
 */
export const createDb = (dbPath = dbFile) => {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const sqlite = new DatabaseSync(dbPath);
  sqlite.exec('PRAGMA foreign_keys = ON');

  return drizzle({
    client: sqlite,
    schema: schema,
  });
};
