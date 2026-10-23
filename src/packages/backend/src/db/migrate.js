import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { createDbClient } from './create-db-client.js';
import { migrationsDir } from '../config/env.js';

migrate(createDbClient(), { migrationsFolder: migrationsDir });
