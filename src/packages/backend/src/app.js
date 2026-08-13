import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import PQueue from 'p-queue';
import {
  dbFile, httpMaxPerSecond, migrationsDir,
} from './config/env.js';
import { OpenAlexConnector } from './connectors/providers/OpenAlexConnector.js';
import { DbClient } from './db/client.js';
import { HttpClient } from './lib/HttpClient.js';
import { CacheRepository } from './repositories/CacheRepository.js';
import { ClassificationService } from './services/classification/ClassificationService.js';
import { PublicationService } from './services/publication/PublicationService.js';

const wire = (dbPath) => {
  const { db } = new DbClient(dbPath);
  migrate(db, { migrationsFolder: migrationsDir });

  const cache = new CacheRepository(db);
  const requestQueue = new PQueue({
    interval: 1000,
    intervalCap: httpMaxPerSecond,
  });
  const httpClient = new HttpClient({
    cache: cache,
    queue: requestQueue,
  });
  const connector = new OpenAlexConnector({
    httpClient: httpClient,
  });

  return {
    connector: connector,
    requestQueue: requestQueue,
  };
};

/**
 * Wires the required dependencies to produce a classification service.
 * Pass a connector to bypass the DB and network setup (used in tests).
 *
 * @param {Object} [args]
 * @param {string} [args.dbPath]
 * @param {import('./connectors/ProviderConnector.js').ProviderConnector} [args.connector]
 * @returns {{ classificationService: ClassificationService, requestQueue: (import('p-queue').default|undefined) }}
 */
export const createApp = ({
  dbPath = dbFile, connector,
} = {}) => {
  const wired = connector
    ? {
        connector: connector,
        requestQueue: undefined,
      }
    : wire(dbPath);
  const publicationService = new PublicationService({
    connector: wired.connector,
  });
  const classificationService = new ClassificationService({
    publicationService: publicationService,
  });

  return {
    classificationService: classificationService,
    requestQueue: wired.requestQueue,
  };
};
