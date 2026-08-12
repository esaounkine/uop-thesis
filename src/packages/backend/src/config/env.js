import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

config();

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const dbFile = process.env.DB_FILE ?? path.join(packageRoot, 'db-data', 'thesis.sqlite');
export const schemaFile = path.join(packageRoot, 'src', 'db', 'schema.js');
export const migrationsDir = path.join(packageRoot, 'src', 'db', 'migrations');
