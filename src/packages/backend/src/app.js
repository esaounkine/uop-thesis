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
import { TreeService } from './services/tree/TreeService.js';
import { ClassificationService } from './services/classification/ClassificationService.js';
import { PublicationService } from './services/publication/PublicationService.js';
import { AuthorService } from './services/author/AuthorService.js';

const createProvider = ({
  id, queue, connector, treeService,
}) => {
  const publications = new PublicationService({
    connector: connector,
  });
  const authors = new AuthorService({
    connector: connector,
  });

  return {
    id: id,
    queue: queue,
    publications: publications,
    authors: authors,
    classification: new ClassificationService({
      publicationService: publications,
      authorService: authors,
      treeService: treeService,
    }),
  };
};

/**
 * Initialises the active providers (one or two), each independent.
 * Pass a connector to bypass the DB and network setup (tests): it becomes the
 * single provider, keyed by its id.
 *
 * @param {Object} [args]
 * @param {string} [args.dbPath]
 * @param {import('./connectors/ProviderConnector.js').ProviderConnector} [args.connector]
 * @returns {{ id: string, queue, publications: PublicationService, authors: AuthorService, classification: ClassificationService }[]}
 */
export const wire = ({
  dbPath = dbFile, connector,
} = {}) => {
  if (connector) {
    return [
      createProvider({
        id: connector.id,
        connector: connector,
      }),
    ];
  }

  const { db } = new DbClient(dbPath);
  migrate(db, { migrationsFolder: migrationsDir });

  const cache = new CacheRepository(db);
  const repos = {
    publicationRepository: new PublicationRepository(db),
    authorRepository: new AuthorRepository(db),
    contributionRepository: new ContributionRepository(db),
    citationRepository: new CitationRepository(db),
  };

  return (providerIds ?? listProviders()).map((id) => {
    const spec = selectProvider(id);
    const queue = new RequestQueue({
      requestsPerSecond: spec.requestsPerSecond,
    });

    return createProvider({
      id: id,
      queue: queue,
      connector: spec.create(new HttpClient({
        cache: cache,
        queue: queue,
      })),
      treeService: new TreeService({
        provider: id,
        ...repos,
      }),
    });
  });
};
