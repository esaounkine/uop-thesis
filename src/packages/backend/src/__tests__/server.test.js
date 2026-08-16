import {
  afterEach, beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { buildServer } from '../server.js';
import { wire } from '../app.js';
import { JobService } from '../services/jobs/JobService.js';

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

    if (job.status !== 'running') {
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

  beforeEach(async () => {
    const connector = {
      id: 'stub',
      searchPublications: jest.fn().mockResolvedValue([createPublication('W1'), createPublication('W2')]),
      searchAuthors: jest.fn().mockResolvedValue([
        {
          authorId: 'A1',
          originalName: 'Jane Roe',
          normalisedName: 'jane roe',
          organisation: null,
        },
      ]),
      getPublication: jest.fn().mockResolvedValue(
        createPublication('W1'),
      ),
      getCitations: jest.fn().mockResolvedValue([createPublication('W2')]),
    };
    server = buildServer({
      providers: wire({
        connector: connector,
      }),
      jobs: new JobService(),
    });
    await new Promise((resolve) =>
      server.listen(0, resolve));
    base = `http://localhost:${server.address().port}`;
  });

  afterEach(() =>
    new Promise((resolve) =>
      server.close(resolve)));

  describe('GET /search/papers', () => {
    it('tags each provider with its candidates', async () => {
      const body = await (await fetch(`${base}/search/papers?q=cardinal`)).json();
      expect(body).toEqual([
        {
          provider: 'stub',
          papers: [createPublication('W1'), createPublication('W2')],
        },
      ]);
    });

    it('is 400 without a query', async () => {
      expect((await fetch(`${base}/search/papers`)).status).toBe(400);
    });
  });

  describe('a paper metrics job', () => {
    let job;

    beforeEach(async () => {
      const submitted = await fetch(`${base}/jobs`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'paper',
          provider: 'stub',
          id: 'W1',
        }),
      });
      const { requestId } = await submitted.json();
      job = await pollJob(`${base}/jobs/${requestId}`);
    });

    it('finishes with the computed metrics', () => {
      expect(job).toMatchObject({
        status: 'done',
        result: { metrics: { total: 1 } },
      });
    });
  });

  describe('bad requests', () => {
    it('is 400 for an unknown provider', async () => {
      const response = await fetch(`${base}/jobs`, {
        method: 'POST',
        body: JSON.stringify({
          kind: 'paper',
          provider: 'nope',
          id: 'W1',
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
      const response = await fetch(`${base}/search/papers`, { method: 'OPTIONS' });
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
    });
  });
});
