import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { dbFile } from '../config/env.js';
import * as schema from './schema.js';

const MEMORY_DB_PATH = ':memory:';

export class DbClient {
  constructor(dbPath = MEMORY_DB_PATH) {
    this.sqlite = this.initDriver(dbPath);

    this.db = drizzle({
      client: this.sqlite,
      schema,
    });
  }

  initDriver(dbPath) {
    if (dbPath !== MEMORY_DB_PATH) {
      this.ensurePath(dbPath);
    }

    const sqlite = new DatabaseSync(dbPath);

    sqlite.exec('PRAGMA foreign_keys = ON');

    return sqlite;
  }

  ensurePath(dbPath) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
}

export const db = new DbClient(dbFile).db;
