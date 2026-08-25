import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { buildServer } from '../server.js';
import { wire } from '../app.js';
import { migrationsDir } from '../config/env.js';
import { DbClient } from '../db/DbClient.js';
import { JOB_STATUS } from '../constants/job-status.js';
import { JobRepository } from '../repositories/JobRepository.js';
import { JobService } from '../services/jobs/JobService.js';
import { StoredMetricsService } from '../services/stored-metrics/StoredMetricsService.js';

const createJobService = () => {
  const { db } = new DbClient();
  migrate(db, { migrationsFolder: migrationsDir });
  const jobRepository = new JobRepository(db);

  return {
    jobService: new JobService(jobRepository),
    storedMetricsService: new StoredMetricsService(jobRepository),
  };
};

const createContribution = (pubId, authorId) => {
  return {
    pubId: pubId,
    authorId: authorId,
    position: 1,
  };
};

const createPublication = (pubId) => {
  return {
    pubId: pubId,
    title: pubId,
    normalisedTitle: pubId.toLowerCase(),
    externalId: null,
    year: null,
    contributions: [createContribution(pubId, 'A1')],
  };
};

const pollJob = async (url) => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const job = await (await fetch(url)).json();

    if (job.status !== JOB_STATUS.RUNNING) {
      return job;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 5));
  }

  throw new Error('job did not settle');
};

describe('the HTTP API', () => {
  let server;
  let base;
  let connector;

  beforeEach(async () => {
    connector = {
      id: 'stub',
      searchAuthors: jest.fn().mockResolvedValue([
        {
          authorId: 'A1',
          originalName: 'Jane Roe',
          normalisedName: 'jane roe',
          organisation: null,
        },
      ]),
      getCitations: jest.fn().mockResolvedValue([createPublication('W2')]),
      getAuthorById: jest.fn().mockResolvedValue({
        authorId: 'A1',
        originalName: 'Jane Roe',
        normalisedName: 'jane roe',
        organisation: null,
      }),
      getAuthorPublications: jest.fn().mockResolvedValue([createPublication('W1'), createPublication('W2')]),
    };
    const {
      jobService, storedMetricsService,
    } = createJobService();
    server = buildServer({
      providers: wire({
        connector: connector,
      }),
      jobService: jobService,
      storedMetricsService: storedMetricsService,
      publicDir: fileURLToPath(new URL('./fixtures/public', import.meta.url)),
    });
    await new Promise((resolve) =>
      server.listen(0, resolve));
    base = `http://localhost:${server.address().port}`;
  });

  afterEach(() =>
    new Promise((resolve) =>
      server.close(resolve)));

  describe('GET /search/authors', () => {
    it('tags each provider with its candidates', async () => {
      const body = await (await fetch(`${base}/search/authors?q=roe`)).json();
      expect(body).toEqual([
        {
          provider: 'stub',
          authors: [
            {
              authorId: 'A1',
              originalName: 'Jane Roe',
              normalisedName: 'jane roe',
              organisation: null,
              storedAt: null,
            },
          ],
        },
      ]);
    });

    it('is 400 without a query', async () => {
      expect((await fetch(`${base}/search/authors`)).status).toBe(400);
    });
  });

  describe('GET /authors/:provider/:authorId/papers', () => {
    it('returns the author papers', async () => {
      const body = await (await fetch(`${base}/authors/stub/A1/papers`)).json();
      expect(body).toEqual({
        papers: [createPublication('W1'), createPublication('W2')],
      });
    });

    describe('unknown author', () => {
      beforeEach(() => {
        connector.getAuthorById.mockResolvedValue(null);
      });

      it('is 404', async () => {
        expect((await fetch(`${base}/authors/stub/nope/papers`)).status).toBe(404);
      });
    });

    it('is 404 for an unknown provider', async () => {
      expect((await fetch(`${base}/authors/nope/A1/papers`)).status).toBe(404);
    });
  });

  describe('an author metrics job', () => {
    let job;

    beforeEach(async () => {
      const submitted = await fetch(`${base}/jobs`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider: 'stub',
          id: 'A1',
        }),
      });
      const { requestId } = await submitted.json();
      job = await pollJob(`${base}/jobs/${requestId}`);
    });

    it('finishes with the computed metrics', () => {
      expect(job).toMatchObject({
        status: JOB_STATUS.DONE,
        result: { metrics: { total: 2 } },
      });
    });

    it('is listed by GET /jobs for the page-load view', async () => {
      const body = await (await fetch(`${base}/jobs`)).json();
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({
        status: JOB_STATUS.DONE,
        provider: 'stub',
        authorId: 'A1',
      });
    });

    it('tags the author with a stored cut-off date in search', async () => {
      const [{ authors }] = await (await fetch(`${base}/search/authors?q=roe`)).json();
      expect(authors[0].storedAt).toEqual(expect.any(String));
    });

    it('serves the stored metrics without contacting the provider', async () => {
      const body = await (await fetch(`${base}/authors/stub/A1/metrics`)).json();
      expect(body).toMatchObject({ metrics: { total: 2 } });
    });
  });

  describe('stored metrics for an author with no job', () => {
    it('is 404', async () => {
      expect((await fetch(`${base}/authors/stub/A1/metrics`)).status).toBe(404);
    });
  });

  describe('with public assets', () => {
    describe('when accept text/html is requested', () => {
      let headers;

      beforeEach(() => {
        headers = { accept: 'text/html' };
      });

      it('serves index.html for a client route when the browser asks for html', async () => {
        const response = await fetch(`${base}/any-path`, {
          headers: headers,
        });

        expect(response.status).toBe(200);
        expect(await response.text()).toContain('test-body');
      });
    });

    describe('when the html file is requested directly', () => {
      it('serves the static assets', async () => {
        const response = await fetch(`${base}/index.html`);

        expect(response.status).toBe(200);
      });
    });
  });

  describe('with no public assets', () => {
    let bareServer;
    let bareBase;

    beforeEach(async () => {
      const {
        jobService, storedMetricsService,
      } = createJobService();
      bareServer = buildServer({
        providers: wire({
          connector: connector,
        }),
        jobService: jobService,
        storedMetricsService: storedMetricsService,
        publicDir: '/nonexistent',
      });
      await new Promise((resolve) =>
        bareServer.listen(0, resolve));
      bareBase = `http://localhost:${bareServer.address().port}`;
    });

    afterEach(() =>
      new Promise((resolve) =>
        bareServer.close(resolve)));

    it('should answers API requests', async () => {
      expect((await fetch(`${bareBase}/search/authors?q=roe`)).status).toBe(200);
    });

    describe('when accept text/html is requested', () => {
      let headers;

      beforeEach(() => {
        headers = { accept: 'text/html' };
      });

      it('should respond 404 for a browser navigation', async () => {
        const response = await fetch(`${bareBase}/authors`, {
          headers: headers,
        });
        expect(response.status).toBe(404);
      });
    });
  });

  describe('bad requests', () => {
    it('is 400 for an unknown provider', async () => {
      const response = await fetch(`${base}/jobs`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider: 'nope',
          id: 'A1',
        }),
      });
      expect(response.status).toBe(400);
    });

    it('is 404 for an unknown job', async () => {
      expect((await fetch(`${base}/jobs/nope`)).status).toBe(404);
    });

    it('is 404 for an unknown route', async () => {
      expect((await fetch(`${base}/nowhere`)).status).toBe(404);
    });
  });

  describe('CORS preflight', () => {
    it('answers OPTIONS with the allow-origin header', async () => {
      const response = await fetch(`${base}/search/authors`, { method: 'OPTIONS' });
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
    });
  });
});
