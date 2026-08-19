import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { wire } from './app.js';
import { corsOrigin, dbFile, port } from './config/env.js';
import { DbClient } from './db/DbClient.js';
import { JobRepository } from './repositories/JobRepository.js';
import { JobService } from './services/jobs/JobService.js';
import { SearchController } from './controllers/SearchController.js';
import { AuthorController } from './controllers/AuthorController.js';
import { JobController } from './controllers/JobController.js';

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
 * @param {JobService} args.jobs
 * @returns {import('node:http').Server}
 */
export const buildServer = ({
  providers, jobs,
}) => {
  const searchController = new SearchController(providers);
  const authorController = new AuthorController(providers);
  const jobController = new JobController(providers, jobs);
  const app = express();

  app.use(cors);
  app.use(express.json());

  app.get('/search/papers', async (req, res) => {
    res.json(await searchController.searchPapers(req));
  });
  app.get('/search/authors', async (req, res) => {
    res.json(await searchController.searchAuthors(req));
  });
  app.get('/authors/:provider/:authorId/papers', async (req, res) => {
    res.json(await authorController.getAuthorPapers(req));
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

// Avoid running when imported (needed for unit tests)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { db } = new DbClient(dbFile);

  buildServer({
    providers: wire(),
    jobs: new JobService(new JobRepository(db)),
  }).listen(port, () => {
    process.stdout.write(`listening on ${port}\n`);
  });
}
