import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

config({ quiet: true });

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const dbFile = process.env.DB_FILE ?? path.join(packageRoot, 'db-data', 'thesis.sqlite');
export const schemaFile = path.join(packageRoot, 'src', 'db', 'schema.js');
export const migrationsDir = path.join(packageRoot, 'src', 'db', 'migrations');

export const openAlexBaseUrl = process.env.OPENALEX_BASE_URL ?? 'https://api.openalex.org';
export const openAlexApiKey = process.env.OPENALEX_API_KEY;

export const searchTtlMs = Number(process.env.SEARCH_TTL_MS ?? 7 * 24 * 60 * 60 * 1000); // 1 week
export const directFetchTtlMs = Number(process.env.DIRECT_FETCH_TTL_MS ?? 30 * 24 * 60 * 60 * 1000); // 30 days

export const httpMaxRetries = Number(process.env.HTTP_MAX_RETRIES ?? 5);
export const httpRetryBaseMs = Number(process.env.HTTP_RETRY_BASE_MS ?? 1000);
export const httpMaxPerSecond = Number(process.env.HTTP_MAX_PER_SECOND ?? 10);
