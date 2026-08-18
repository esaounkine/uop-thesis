import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { db } from './DbClient.js';
import { migrationsDir } from '../config/env.js';

migrate(db, { migrationsFolder: migrationsDir });
