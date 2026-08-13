import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { dbFile, migrationsDir } from './config/env.js';
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
  const httpClient = new HttpClient({ cache: cache });

  return new OpenAlexConnector({
    httpClient: httpClient,
  });
};

/**
 * Wires the required dependencies to produce a classification service.
 * Pass a connector to bypass the DB and network setup (used in tests).
 *
 * @param {Object} [args]
 * @param {string} [args.dbPath]
 * @param {import('./connectors/ProviderConnector.js').ProviderConnector} [args.connector]
 * @returns {{ classificationService: ClassificationService }}
 */
export const createApp = ({
  dbPath = dbFile, connector,
} = {}) => {
  const _connector = connector ?? wire(dbPath);
  const publicationService = new PublicationService({
    connector: _connector,
  });
  const classificationService = new ClassificationService({
    publicationService: publicationService,
  });

  return {
    classificationService: classificationService,
  };
};
