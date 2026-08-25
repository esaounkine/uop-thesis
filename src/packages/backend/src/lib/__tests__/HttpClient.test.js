import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { HttpClient } from '../HttpClient.js';

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

describe('HttpClient', () => {
  let fetchImplMock;
  let retryStrategyMock;
  let client;

  beforeEach(() => {
    fetchImplMock = jest.fn();
    retryStrategyMock = {
      run: jest.fn((task) =>
        task()),
    };
    client = new HttpClient({
      fetchImpl: fetchImplMock,
      retryStrategy: retryStrategyMock,
    });
  });

  describe('getJson', () => {
    describe('when the response is ok', () => {
      beforeEach(() => {
        fetchImplMock.mockResolvedValue(createOkResponse({ hello: 'world' }));
      });

      it('returns the parsed data', async () => {
        const result = await client.getJson('https://x/');
        expect(result.data).toEqual({ hello: 'world' });
      });

      it('returns a fetched date', async () => {
        const result = await client.getJson('https://x/');
        expect(result.fetchedAt).toBeInstanceOf(Date);
      });

      it('calls fetch directly', async () => {
        await client.getJson('https://x/');
        expect(fetchImplMock).toHaveBeenCalledTimes(1);
      });

      it('sends no extra headers by default', async () => {
        await client.getJson('https://x/');
        const [, options] = fetchImplMock.mock.calls[0];
        expect(options.headers).toEqual({});
      });

      describe('and headers are passed', () => {
        it('injects them into the request', async () => {
          await client.getJson('https://x/', undefined, {
            Authorization: 'Bearer secret',
          });
          const [, options] = fetchImplMock.mock.calls[0];
          expect(options.headers.Authorization).toBe('Bearer secret');
        });
      });

      describe('and a queue is provided', () => {
        let queueMock;

        beforeEach(() => {
          queueMock = {
            add: jest.fn((task) =>
              task()),
          };
          client = new HttpClient({
            fetchImpl: fetchImplMock,
            retryStrategy: retryStrategyMock,
            queue: queueMock,
          });
        });

        it('routes the request through the queue', async () => {
          await client.getJson('https://x/');
          expect(queueMock.add).toHaveBeenCalledTimes(1);
        });
      });

      describe('and a cache is provided', () => {
        let cacheRepositoryMock;

        beforeEach(() => {
          cacheRepositoryMock = {
            get: jest.fn(),
            put: jest.fn(),
          };
          client = new HttpClient({
            fetchImpl: fetchImplMock,
            retryStrategy: retryStrategyMock,
            cacheRepository: cacheRepositoryMock,
          });
        });

        describe('and a ttl is set', () => {
          describe('and the cache has a fresh entry', () => {
            beforeEach(() => {
              cacheRepositoryMock.get.mockReturnValue({
                value: { cached: true },
                fetchedAt: new Date(),
              });
            });

            it('serves the cached value', async () => {
              const result = await client.getJson('https://x/?a=1', 60_000);
              expect(result.data).toEqual({ cached: true });
            });

            it('does not fetch', async () => {
              await client.getJson('https://x/?a=1', 60_000);
              expect(fetchImplMock).not.toHaveBeenCalled();
            });
          });

          describe('but the cache is empty', () => {
            beforeEach(() => {
              cacheRepositoryMock.get.mockReturnValue(null);
            });

            it('fetches from the network', async () => {
              const result = await client.getJson('https://x/?a=1', 60_000);
              expect(result.data).toEqual({ hello: 'world' });
            });

            it('stores the response under the normalised key', async () => {
              await client.getJson('https://x/?b=2&a=1', 60_000);
              expect(cacheRepositoryMock.put)
                .toHaveBeenCalledWith('https://x/?a=1&b=2', { hello: 'world' });
            });
          });
        });

        describe('and the ttl is null', () => {
          it('skips the cache read', async () => {
            await client.getJson('https://x/?a=1', null);
            expect(cacheRepositoryMock.get).not.toHaveBeenCalled();
          });

          it('fetches live', async () => {
            const result = await client.getJson('https://x/?a=1', null);
            expect(result.data).toEqual({ hello: 'world' });
          });
        });
      });
    });

    describe('when the response is not ok', () => {
      beforeEach(() => {
        fetchImplMock.mockResolvedValue(createErrorResponse(404));
      });

      it('throws with the status', async () => {
        await expect(client.getJson('https://x/')).rejects.toThrow('404');
      });
    });

    describe('when the retry strategy rejects', () => {
      beforeEach(() => {
        retryStrategyMock.run.mockRejectedValue(new Error('error-1'));
      });

      it('propagates the error', async () => {
        await expect(client.getJson('https://x/')).rejects.toThrow('error-1');
      });
    });
  });
});
