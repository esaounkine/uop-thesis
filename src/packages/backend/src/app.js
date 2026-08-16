import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import PQueue from 'p-queue';
import {
  dbFile, migrationsDir, provider,
} from './config/env.js';
import { selectProvider } from './connectors/providers/registry.js';
import { DbClient } from './db/client.js';
import { HttpClient } from './lib/HttpClient.js';
import { AuthorRepository } from './repositories/AuthorRepository.js';
import { CacheRepository } from './repositories/CacheRepository.js';
import { CitationRepository } from './repositories/CitationRepository.js';
import { ContributionRepository } from './repositories/ContributionRepository.js';
import { PublicationRepository } from './repositories/PublicationRepository.js';
import { TreeService } from './services/tree/TreeService.js';
import { ClassificationService } from './services/classification/ClassificationService.js';
import { PublicationService } from './services/publication/PublicationService.js';
import { AuthorService } from './services/author/AuthorService.js';

const wire = (dbPath) => {
  const { db } = new DbClient(dbPath);
  migrate(db, { migrationsFolder: migrationsDir });

  const providerSpec = selectProvider(provider);
  const cache = new CacheRepository(db);
  const requestQueue = new PQueue({
    interval: 1000,
    intervalCap: providerSpec.requestsPerSecond,
  });
  const httpClient = new HttpClient({
    cache: cache,
    queue: requestQueue,
  });
  const connector = providerSpec.create(httpClient);

  const treeService = new TreeService({
    provider: provider,
    publicationRepository: new PublicationRepository(db),
    authorRepository: new AuthorRepository(db),
    contributionRepository: new ContributionRepository(db),
    citationRepository: new CitationRepository(db),
  });

  return {
    connector: connector,
    requestQueue: requestQueue,
    treeService: treeService,
  };
};

/**
 * Wires the required dependencies to produce a classification service.
 * Pass a connector to bypass the DB and network setup (used in tests).
 *
 * @param {Object} [args]
 * @param {string} [args.dbPath]
 * @param {import('./connectors/ProviderConnector.js').ProviderConnector} [args.connector]
 * @returns {{ classificationService: ClassificationService, publicationService: PublicationService, authorService: AuthorService, requestQueue: (import('p-queue').default|undefined) }}
 */
export const createApp = ({
  dbPath = dbFile, connector,
} = {}) => {
  const wired = connector
    ? {
        connector: connector,
        requestQueue: undefined,
        treeService: undefined,
      }
    : wire(dbPath);
  const publicationService = new PublicationService({
    connector: wired.connector,
  });
  const authorService = new AuthorService({
    connector: wired.connector,
  });
  const classificationService = new ClassificationService({
    publicationService: publicationService,
    authorService: authorService,
    treeService: wired.treeService,
  });

  return {
    classificationService: classificationService,
    publicationService: publicationService,
    authorService: authorService,
    requestQueue: wired.requestQueue,
  };
};
