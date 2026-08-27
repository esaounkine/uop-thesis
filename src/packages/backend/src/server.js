import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { wire } from './app.js';
import { corsOrigin, port, publicDir } from './config/env.js';
import { SearchController } from './controllers/SearchController.js';
import { AuthorController } from './controllers/AuthorController.js';
import { JobController } from './controllers/JobController.js';
import { StatusController } from './controllers/StatusController.js';

const cors = (req, res, next) => {
  res.set('Access-Control-Allow-Origin', corsOrigin);
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'content-type');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
};

/**
 * Assembles the HTTP server.
 *
 * @param {Object} args
 * @param {import('./connectors/ProviderConnector.js').ProviderConnector[]} args.providers
 * @param {JobService} args.jobService
 * @param {StatsRepository} [args.statsRepository] - repo to get DB counts
 * @param {string} [args.staticDir] - static files to serve, when the directory
 *   exists; browser navigations (GET accepting text/html) fall back to
 *   index.html. Without the directory the server answers the API only.
 * @returns {import('node:http').Server}
 */
const buildServer = ({
  providers,
  jobService,
  statsRepository,
  authorService,
  citationGraphService,
  classificationService,
  metricsService,
  staticDir = publicDir,
}) => {
  const searchController = new SearchController(
    authorService,
  );
  const authorController = new AuthorController(
    authorService,
    citationGraphService,
    classificationService,
  );
  const jobController = new JobController(
    metricsService,
    jobService,
  );
  const statusController = new StatusController(
    providers,
    statsRepository,
  );
  const app = express();
  const hasPublic = fs.existsSync(staticDir);

  app.use(cors);
  app.use(express.json());

  if (hasPublic) {
    app.use(express.static(staticDir));
  }

  app.get('/search/authors', async (req, res) => {
    res.json(await searchController.searchAuthors(req));
  });
  app.get('/authors/:provider/:authorId/papers', async (req, res) => {
    res.json(await authorController.getAuthorPapers(req));
  });
  app.get('/authors/:provider/:authorId/metrics', (req, res) => {
    res.json(authorController.getStoredMetrics(req));
  });
  app.post('/jobs', (req, res) => {
    res.status(202).json(jobController.submitJob(req));
  });
  app.get('/jobs', (req, res) => {
    res.json(jobController.listJobs());
  });
  app.get('/jobs/:id', (req, res) => {
    res.json(jobController.getJob(req));
  });
  app.get('/status', async (req, res) => {
    res.json(await statusController.getStatus());
  });

  app.use((req, res, next) => {
    if (hasPublic && req.method === 'GET' && req.headers.accept?.includes('text/html')) {
      res.sendFile(path.join(staticDir, 'index.html'));
      return;
    }

    next();
  });

  app.use((req, res) => {
    res.status(404).json({
      error: 'resource not found',
    });
  });
  app.use((error, req, res) => {
    res.status(error.status ?? 500).json({
      error: error.message ?? 'server error',
    });
  });

  return createServer(app);
};

/**
 * Collection of random actions needed to restore the state back to original.
 *
 * @param {Object} args
 * @param {import('./repositories/JobRepository.js').JobRepository} args.jobRepository
 */
export const restoreState = ({ jobRepository }) => {
  // System crash could leave jobs dangling and their state would never become final.
  // This could result in the UI endlessly polling them.
  jobRepository.interruptRunningJobs();
};

const main = () => {
  const wired = wire();

  restoreState({ jobRepository: wired.jobRepository });

  buildServer({
    providers: wired.providers,
    jobService: wired.jobService,
    authorService: wired.authorService,
    citationGraphService: wired.citationGraphService,
    classificationService: wired.classificationService,
    metricsService: wired.metricsService,
    statsRepository: wired.statsRepository,
  }).listen(port, () => {
    process.stdout.write(`listening on ${port}\n`);
  });
};

main();
