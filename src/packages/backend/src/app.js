import { dbFile, providers as providerIds } from './config/env.js';
import { getProviderSpecOrFail, listProviderSpecs } from './connectors/providers/index.js';
import { createDbClient } from './db/create-db-client.js';
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
import { JobRepository } from './repositories/JobRepository.js';
import { JobService } from './services/jobs/JobService.js';
import { StatsRepository } from './repositories/StatsRepository.js';

const createProvider = ({
  spec,
  cacheRepository,
}) => {
  const queue = new RequestQueue({
    requestsPerSecond: spec.requestsPerSecond,
  });

  const httpClient = new HttpClient({
    cacheRepository: cacheRepository,
    queue: queue,
  });

  return spec.create(httpClient);
};

/**
 * Wires the dependency tree together.
 *
 * @param {Object} [args]
 * @param {string} [args.dbPath]
 */
export const wire = ({
  dbPath = dbFile,
} = {}) => {
  const db = createDbClient(dbPath);

  const jobRepository = new JobRepository(db);

  const cacheRepository = new CacheRepository(db);

  const providers = (providerIds ?? listProviderSpecs())
    .map((id) => {
      const spec = getProviderSpecOrFail(id);

      return createProvider({
        spec: spec,
        cacheRepository: cacheRepository,
      });
    });

  const jobService = new JobService(providers, jobRepository);

  const authorService = new AuthorService(providers, jobService);

  const publicationService = new PublicationService(providers);

  const statsRepository = new StatsRepository(db);

  const citationGraphService = new CitationGraphService({
    publicationRepository: new PublicationRepository(db),
    authorRepository: new AuthorRepository(db),
    contributionRepository: new ContributionRepository(db),
    citationRepository: new CitationRepository(db),
  });

  const classificationService = new ClassificationService();

  const metricsService = new MetricsService({
    authorService: authorService,
    publicationService: publicationService,
    classificationService: classificationService,
    citationGraphService: citationGraphService,
  });

  return {
    providers: providers,
    authorService: authorService,
    publicationService: publicationService,
    metricsService: metricsService,
    citationGraphService: citationGraphService,
    classificationService: classificationService,
    cacheRepository: cacheRepository,
    jobService: jobService,
    jobRepository: jobRepository,
    statsRepository: statsRepository,
    db: db,
  };
};
