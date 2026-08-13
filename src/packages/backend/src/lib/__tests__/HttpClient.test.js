import { beforeEach, describe, expect, it } from '@jest/globals';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { migrationsDir } from '../../config/env.js';
import { DbClient } from '../../db/client.js';
import { CacheRepository } from '../../repositories/CacheRepository.js';
import { HttpClient } from '../HttpClient.js';

const okResponse = (body) => {
  return {
    ok: true,
    status: 200,
    json: async () =>
      body,
  };
};

const createCache = () => {
  const { db } = new DbClient();
  migrate(db, { migrationsFolder: migrationsDir });
  return new CacheRepository(db);
};

describe('HttpClient', () => {
  describe('getJson', () => {
    describe('when there is no cache', () => {
      describe('and the response is ok', () => {
        let result;

        beforeEach(async () => {
          const client = new HttpClient({
            fetchImpl: async () =>
              okResponse({ hello: 'world' }),
          });
          result = await client.getJson('https://x/');
        });

        it('returns the parsed data', () => {
          expect(result.data).toEqual({ hello: 'world' });
        });

        it('returns a fetched date', () => {
          expect(result.fetchedAt).toBeInstanceOf(Date);
        });
      });

      describe('and headers are passed', () => {
        let captured;

        beforeEach(async () => {
          const client = new HttpClient({
            fetchImpl: async (url, options) => {
              captured = options;
              return okResponse({ ok: true });
            },
          });
          await client.getJson('https://x/', undefined, { Authorization: 'Bearer secret' });
        });

        it('injects them into the request', () => {
          expect(captured.headers.Authorization).toBe('Bearer secret');
        });
      });

      describe('and the response is 429 then ok', () => {
        let result;
        let calls;

        beforeEach(async () => {
          calls = 0;
          const client = new HttpClient({
            sleepFn: async () => {},
            fetchImpl: async () => {
              calls += 1;
              if (calls === 1) {
                return {
                  ok: false,
                  status: 429,
                  json: async () => { return {}; },
                };
              }
              return okResponse({ hello: 'world' });
            },
          });
          result = await client.getJson('https://x/');
        });

        it('retries and returns the data', () => {
          expect(result.data).toEqual({ hello: 'world' });
        });

        it('retried once', () => {
          expect(calls).toBe(2);
        });
      });

      describe('and the response keeps being 429', () => {
        let client;
        let calls;

        beforeEach(() => {
          calls = 0;
          client = new HttpClient({
            sleepFn: async () => {},
            maxRetries: 2,
            fetchImpl: async () => {
              calls += 1;
              return {
                ok: false,
                status: 429,
                json: async () => { return {}; },
              };
            },
          });
        });

        it('throws once retries are exhausted', async () => {
          await expect(client.getJson('https://x/')).rejects.toThrow('429');
        });

        it('tries maxRetries + 1 times', async () => {
          await client.getJson('https://x/').catch(() => {});
          expect(calls).toBe(3);
        });
      });

      describe('and the response is a non-transient error', () => {
        let client;

        beforeEach(() => {
          client = new HttpClient({
            fetchImpl: async () => {
              return {
                ok: false,
                status: 404,
                json: async () => { return {}; },
              };
            },
          });
        });

        it('throws with the status without retrying', async () => {
          await expect(client.getJson('https://x/')).rejects.toThrow('404');
        });
      });
    });

    describe('when a cache is provided', () => {
      let cache;
      let calls;
      let fetchImpl;

      beforeEach(() => {
        cache = createCache();
        calls = 0;
        fetchImpl = async () => {
          calls += 1;
          return okResponse({ n: calls });
        };
      });

      describe('and nothing is cached', () => {
        let result;

        beforeEach(async () => {
          result = await new HttpClient({
            fetchImpl: fetchImpl,
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
            fetchImpl: fetchImpl,
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
          expect(calls).toBe(1);
        });
      });
    });
  });
});
