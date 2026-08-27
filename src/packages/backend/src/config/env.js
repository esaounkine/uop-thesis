import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

config({ quiet: true });

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const dbFile = process.env.DB_FILE ?? path.join(packageRoot, 'db-data', 'thesis.sqlite');
export const publicDir = process.env.PUBLIC_DIR ?? path.join(packageRoot, 'public');
export const schemaFile = path.join(packageRoot, 'src', 'db', 'schema.js');
export const migrationsDir = path.join(packageRoot, 'src', 'db', 'migrations');

export const port = Number(process.env.PORT ?? 3000);
export const corsOrigin = process.env.CORS_ORIGIN ?? '*';

export const providers = process.env.PROVIDERS
  ?.split(',')
  .map((id) =>
    id.trim())
  .filter(Boolean);

export const openAlexBaseUrl = process.env.OPENALEX_BASE_URL ?? 'https://api.openalex.org';
export const openAlexApiKey = process.env.OPENALEX_API_KEY;
export const openAlexMaxPerSecond = Number(
  process.env.OPENALEX_MAX_PER_SECOND ?? 10,
);

export const semanticScholarBaseUrl = process.env.SEMANTIC_SCHOLAR_BASE_URL ?? 'https://api.semanticscholar.org/graph/v1';
// the shared pool is 5000 req/5 min
export const semanticScholarApiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
// the free key allows 1 req/s
export const semanticScholarMaxPerSecond = Number(
  process.env.SEMANTIC_SCHOLAR_MAX_PER_SECOND ?? 1,
);

export const serpapiBaseUrl = process.env.SERPAPI_BASE_URL ?? 'https://serpapi.com';
export const serpapiApiKey = process.env.SERPAPI_API_KEY;
export const serpapiMaxPerSecond = Number(
  process.env.SERPAPI_MAX_PER_SECOND ?? 5,
);

export const searchTtlMs = Number(
  process.env.SEARCH_TTL_MS ?? 7 * 24 * 60 * 60 * 1000, // 1 week
);
export const directFetchTtlMs = Number(
  process.env.DIRECT_FETCH_TTL_MS ?? 30 * 24 * 60 * 60 * 1000, // 30 days
);

export const httpMaxRetries = Number(process.env.HTTP_MAX_RETRIES ?? 5);
export const httpRetryBaseMs = Number(process.env.HTTP_RETRY_BASE_MS ?? 1000);
