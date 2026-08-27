import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { wire } from './app.js';
import { corsOrigin, dbFile, port, publicDir } from './config/env.js';
import { createDb } from './db/create-db.js';
import { JobRepository } from './repositories/JobRepository.js';
import { StatsRepository } from './repositories/StatsRepository.js';
import { JobService } from './services/jobs/JobService.js';
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
 * @param {ReturnType<import('./app.js').wire>} args.providers
 * @param {JobService} args.jobService
 * @param {StatsRepository} [args.statsService] - repo to get DB counts
 * @param {string} [args.staticDir] - static files to serve, when the directory
 *   exists; browser navigations (GET accepting text/html) fall back to
 *   index.html. Without the directory the server answers the API only.
 * @returns {import('node:http').Server}
 */
export const buildServer = ({
  providers,
  jobService,
  statsService,
  staticDir = publicDir,
}) => {
  const searchController = new SearchController(
    providers,
    jobService,
  );
  const authorController = new AuthorController(
    providers,
  );
  const jobController = new JobController(
    providers,
    jobService,
  );
  const statusController = new StatusController(
    providers,
    statsService,
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

// Avoid running when imported (needed for unit tests)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = createDb(dbFile);
  const jobRepository = new JobRepository(db);

  restoreState({ jobRepository: jobRepository });

  buildServer({
    providers: wire(),
    jobService: new JobService(jobRepository),
    statsService: new StatsRepository(db),
  }).listen(port, () => {
    process.stdout.write(`listening on ${port}\n`);
  });
}
