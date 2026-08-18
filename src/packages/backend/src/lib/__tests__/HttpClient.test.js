import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { migrationsDir } from '../../config/env.js';
import { DbClient } from '../../db/DbClient.js';
import { CacheRepository } from '../../repositories/CacheRepository.js';
import { HttpClient } from '../HttpClient.js';
import { RetryStrategy } from '../RetryStrategy.js';

const createOkResponse = (body) => {
  return {
    ok: true,
    status: 200,
    json: async () =>
      body,
  };
};

const createErrorResponse = (status) => {
  return {
    ok: false,
    status: status,
    json: async () => {
      return {};
    },
  };
};

const createCache = () => {
  const { db } = new DbClient();
  migrate(db, { migrationsFolder: migrationsDir });
  return new CacheRepository(db);
};

// A strategy that always retries with no real delay.
const retryingStrategy = (maxRetries) =>
  new RetryStrategy({
    maxRetries: maxRetries,
    shouldRetry: () =>
      true,
    delayMs: () =>
      0,
    sleep: async () => {
    },
  });

describe('HttpClient', () => {
  describe('getJson', () => {
    describe('when there is no cache', () => {
      describe('and the response is ok', () => {
        let result;

        beforeEach(async () => {
          const fetchImplMock = jest.fn().mockResolvedValue(createOkResponse({ hello: 'world' }));
          result = await new HttpClient({ fetchImpl: fetchImplMock }).getJson('https://x/');
        });

        it('returns the parsed data', () => {
          expect(result.data).toEqual({ hello: 'world' });
        });

        it('returns a fetched date', () => {
          expect(result.fetchedAt).toBeInstanceOf(Date);
        });
      });

      describe('and headers are passed', () => {
        let fetchImplMock;

        beforeEach(async () => {
          fetchImplMock = jest.fn().mockResolvedValue(createOkResponse({ ok: true }));
          await new HttpClient({
            fetchImpl: fetchImplMock,
          }).getJson('https://x/', undefined, {
            Authorization: 'Bearer secret',
          });
        });

        it('injects them into the request', () => {
          const [, options] = fetchImplMock.mock.calls[0];
          expect(options.headers.Authorization).toBe('Bearer secret');
        });
      });

      describe('and the response is 429 then ok', () => {
        let fetchImplMock;
        let result;

        beforeEach(async () => {
          fetchImplMock = jest.fn()
            .mockResolvedValueOnce(createErrorResponse(429))
            .mockResolvedValue(createOkResponse({
              hello: 'world',
            }));
          const client = new HttpClient({
            retryStrategy: retryingStrategy(2),
            fetchImpl: fetchImplMock,
          });
          result = await client.getJson('https://x/');
        });

        it('retries and returns the data', () => {
          expect(result.data).toEqual({ hello: 'world' });
        });

        it('retried once', () => {
          expect(fetchImplMock).toHaveBeenCalledTimes(2);
        });
      });

      describe('and the response keeps being 429', () => {
        let client;
        let fetchImplMock;

        beforeEach(() => {
          fetchImplMock = jest.fn().mockResolvedValue(createErrorResponse(429));
          client = new HttpClient({
            retryStrategy: retryingStrategy(2),
            fetchImpl: fetchImplMock,
          });
        });

        it('throws once retries are exhausted', async () => {
          await expect(client.getJson('https://x/')).rejects.toThrow('429');
        });

        it('tries maxRetries + 1 times', async () => {
          await client.getJson('https://x/').catch(() => {
          });
          expect(fetchImplMock).toHaveBeenCalledTimes(3);
        });
      });

      describe('and a queue is provided', () => {
        let addMock;
        let result;

        beforeEach(async () => {
          addMock = jest.fn((task) =>
            task());
          const client = new HttpClient({
            queue: { add: addMock },
            fetchImpl: jest.fn().mockResolvedValue(createOkResponse({
              hello: 'world',
            })),
          });
          result = await client.getJson('https://x/');
        });

        it('routes the request through the queue', () => {
          expect(addMock).toHaveBeenCalledTimes(1);
        });

        it('still returns the data', () => {
          expect(result.data).toEqual({ hello: 'world' });
        });
      });

      describe('and the response is a non-transient error', () => {
        let client;

        beforeEach(() => {
          client = new HttpClient({
            fetchImpl: jest.fn().mockResolvedValue(createErrorResponse(404)),
          });
        });

        it('throws with the status without retrying', async () => {
          await expect(client.getJson('https://x/')).rejects.toThrow('404');
        });
      });
    });

    describe('when a cache is provided', () => {
      let cache;
      let fetchImplMock;

      beforeEach(() => {
        cache = createCache();
        fetchImplMock = jest.fn()
          .mockResolvedValueOnce(createOkResponse({ n: 1 }))
          .mockResolvedValueOnce(createOkResponse({ n: 2 }));
      });

      describe('and nothing is cached', () => {
        let result;

        beforeEach(async () => {
          result = await new HttpClient({
            fetchImpl: fetchImplMock,
            cache: cache,
          }).getJson('https://api.test/works?a=1', 60_000);
        });

        it('fetches from the network', () => {
          expect(result.data).toEqual({ n: 1 });
        });
      });

      describe('and a fresh entry is cached under the same query', () => {
        let second;

        beforeEach(async () => {
          const client = new HttpClient({
            fetchImpl: fetchImplMock,
            cache: cache,
          });
          await client.getJson('https://api.test/works?a=1&b=2', 60_000);
          // Same query, params in a different order -> same normalised key.
          second = await client.getJson('https://api.test/works?b=2&a=1', 60_000);
        });

        it('serves from the cache', () => {
          expect(second.data).toEqual({ n: 1 });
        });

        it('does not fetch again', () => {
          expect(fetchImplMock).toHaveBeenCalledTimes(1);
        });
      });
    });
  });
});
