import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { dbFile, migrationsDir } from '../config/env.js';
import * as schema from './schema.js';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';

/**
 * @param {string} [dbPath]
 * @returns {ReturnType<typeof drizzle>}
 */
export const createDbClient = (dbPath = dbFile) => {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const sqlite = new DatabaseSync(dbPath);
  sqlite.exec('PRAGMA foreign_keys = ON');

  const client = drizzle({
    client: sqlite,
    schema: schema,
  });

  migrate(client, { migrationsFolder: migrationsDir });

  return client;
};
