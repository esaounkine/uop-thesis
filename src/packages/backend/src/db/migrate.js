import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { createDb } from './create-db.js';
import { migrationsDir } from '../config/env.js';

migrate(createDb(), { migrationsFolder: migrationsDir });
