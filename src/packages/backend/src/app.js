import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import {
  dbFile, migrationsDir, providers as providerIds,
} from './config/env.js';
import { listProviders, selectProvider } from './connectors/providers/registry.js';
import { DbClient } from './db/DbClient.js';
import { HttpClient } from './lib/HttpClient.js';
import { RequestQueue } from './lib/RequestQueue.js';
import { AuthorRepository } from './repositories/AuthorRepository.js';
import { CacheRepository } from './repositories/CacheRepository.js';
import { CitationRepository } from './repositories/CitationRepository.js';
import { ContributionRepository } from './repositories/ContributionRepository.js';
import { PublicationRepository } from './repositories/PublicationRepository.js';
import { CitationGraphService } from './services/citation-graph/CitationGraphService.js';
import { ClassificationService } from './services/classification/ClassificationService.js';
import { PublicationService } from './services/publication/PublicationService.js';
import { AuthorService } from './services/author/AuthorService.js';
import { MetricsService } from './services/metrics/MetricsService.js';

const createProvider = ({
  id, queue, connector, citationGraphService, classificationService,
}) => {
  const authorService = new AuthorService({
    connector: connector,
  });

  return {
    id: id,
    queue: queue,
    connector: connector,
    authorService: authorService,
    citationGraphService: citationGraphService,
    classificationService: classificationService,
    metricsService: new MetricsService({
      authorService: authorService,
      publicationService: new PublicationService({
        connector: connector,
      }),
      classificationService: classificationService,
      citationGraphService: citationGraphService,
    }),
  };
};

/**
 * Initialises the active providers.
 * Pass a connector to bypass the network setup (needed for tests).
 *
 * @param {Object} [args]
 * @param {string} [args.dbPath]
 * @param {import('./connectors/ProviderConnector.js').ProviderConnector} [args.connector]
 * @returns {{ id: string, queue, connector, authorService: AuthorService, metricsService: MetricsService }[]}
 */
export const wire = ({
  dbPath = dbFile, connector,
} = {}) => {
  const { db } = new DbClient(connector
    ? undefined
    : dbPath);
  migrate(db, { migrationsFolder: migrationsDir });

  const cacheRepository = new CacheRepository(db);
  const citationGraphService = new CitationGraphService({
    publicationRepository: new PublicationRepository(db),
    authorRepository: new AuthorRepository(db),
    contributionRepository: new ContributionRepository(db),
    citationRepository: new CitationRepository(db),
  });
  const classificationService = new ClassificationService();
  const shared = {
    citationGraphService: citationGraphService,
    classificationService: classificationService,
  };

  if (connector) {
    return [
      createProvider({
        id: connector.id,
        connector: connector,
        ...shared,
      }),
    ];
  }

  return (providerIds ?? listProviders()).map((id) => {
    const spec = selectProvider(id);
    const queue = new RequestQueue({
      requestsPerSecond: spec.requestsPerSecond,
    });

    return createProvider({
      id: id,
      queue: queue,
      connector: spec.create(new HttpClient({
        cacheRepository: cacheRepository,
        queue: queue,
      })),
      ...shared,
    });
  });
};
