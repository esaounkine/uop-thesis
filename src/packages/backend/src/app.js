import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import {
  dbFile, migrationsDir, providers as providerIds,
} from './config/env.js';
import { listProviders, getProviderOrFail } from './connectors/providers/index.js';
import { createDb } from './db/create-db.js';
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

// TODO revisit what is the shapeless object this function returns
//  ideally we'd like to return an instance of a real class
const createProvider = ({
  id,
  queue,
  connector,
  citationGraphService,
  classificationService,
  apiKey = null,
  requestsPerSecond = null,
}) => {
  const authorService = new AuthorService({
    connector: connector,
  });

  const publicationService = new PublicationService({
    connector: connector,
  });

  return {
    id: id,
    queue: queue,
    connector: connector,
    apiKey: apiKey,
    requestsPerSecond: requestsPerSecond,
    // TODO the duplicate author service instance in this object is smelly
    authorService: authorService,
    citationGraphService: citationGraphService,
    classificationService: classificationService,
    metricsService: new MetricsService({
      authorService: authorService,
      publicationService: publicationService,
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
// TODO if the ultimate outcome of this wiring is providers, it should be named `wireProviders` or `getProviders` or `initProviders`
export const wire = ({
  dbPath = dbFile, connector,
} = {}) => {
  const db = createDb(dbPath);
  migrate(db, { migrationsFolder: migrationsDir });

  const citationGraphService = new CitationGraphService({
    publicationRepository: new PublicationRepository(db),
    authorRepository: new AuthorRepository(db),
    contributionRepository: new ContributionRepository(db),
    citationRepository: new CitationRepository(db),
  });
  const classificationService = new ClassificationService();

  if (connector) {
    return [
      createProvider({
        id: connector.id,
        connector: connector,
        citationGraphService: citationGraphService,
        classificationService: classificationService,
      }),
    ];
  }

  const cacheRepository = new CacheRepository(db);

  return (providerIds ?? listProviders()).map((id) => {
    const spec = getProviderOrFail(id);
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
      apiKey: spec.apiKey,
      requestsPerSecond: spec.requestsPerSecond,
      citationGraphService: citationGraphService,
      classificationService: classificationService,
    });
  });
};
