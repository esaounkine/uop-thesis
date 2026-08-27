import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { StatusController } from '../StatusController.js';

const createConnector = (overrides = {}) => {
  return {
    id: 'openalex',
    apiKey: 'secret',
    httpClient: {
      queue: {
        requestsPerSecond: 5,
      },
    },
    getQuota: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
};

describe('StatusController', () => {
  let statsRepositoryMock;
  let connectorMock;
  let controller;

  beforeEach(() => {
    statsRepositoryMock = {
      countByProvider: jest.fn(),
    };
    connectorMock = createConnector();
    controller = new StatusController([connectorMock], statsRepositoryMock);
  });

  describe('getStatus', () => {
    describe('when the stats repo returns counts', () => {
      beforeEach(() => {
        statsRepositoryMock.countByProvider.mockReturnValue({
          publications: 3,
          citations: 1,
        });
      });

      describe('and the connector returns a quota', () => {
        beforeEach(() => {
          connectorMock.getQuota.mockResolvedValue({ creditsRemaining: 9000 });
        });

        it('reports the provider id and rate limit', async () => {
          const status = await controller.getStatus();

          expect(status.providers[0]).toMatchObject({
            id: 'openalex',
            requestsPerSecond: 5,
          });
        });

        it('masks the api key', async () => {
          const status = await controller.getStatus();

          expect(status.providers[0].apiKey).toBe('****cret');
        });

        it('includes the quota', async () => {
          const status = await controller.getStatus();

          expect(status.providers[0].quota).toEqual({ creditsRemaining: 9000 });
        });

        it('includes the record counts', async () => {
          const status = await controller.getStatus();

          expect(status.providers[0].records).toEqual({
            publications: 3,
            citations: 1,
          });
        });

        it('reports the version', async () => {
          const status = await controller.getStatus();

          expect(status.version).toEqual(expect.any(String));
        });

        it('reports host memory', async () => {
          const status = await controller.getStatus();

          expect(status.system.memory.totalBytes).toBeGreaterThan(0);
        });

        it('reports disk space', async () => {
          const status = await controller.getStatus();

          expect(status.system.disk.freeBytes).toBeGreaterThanOrEqual(0);
        });

        describe('and the provider has no api key', () => {
          beforeEach(() => {
            controller = new StatusController(
              [createConnector({ apiKey: null })],
              statsRepositoryMock,
            );
          });

          it('reports a null api key', async () => {
            const status = await controller.getStatus();

            expect(status.providers[0].apiKey).toBeNull();
          });
        });

        describe('and several providers are configured', () => {
          beforeEach(() => {
            controller = new StatusController(
              [
                connectorMock,
                createConnector({
                  id: 'semanticscholar',
                  getQuota: jest.fn()
                    .mockResolvedValue({ creditsRemaining: 5000 }),
                }),
              ],
              statsRepositoryMock,
            );
          });

          it('reports each provider', async () => {
            const status = await controller.getStatus();

            expect(status.providers.map((provider) =>
              provider.id))
              .toEqual(['openalex', 'semanticscholar']);
          });

          describe('but one provider count fails', () => {
            beforeEach(() => {
              statsRepositoryMock.countByProvider.mockImplementation((id) => {
                if (id === 'semanticscholar') {
                  throw new Error('error-2');
                }

                return {
                  publications: 3,
                  citations: 1,
                };
              });
            });

            it('propagates the error', async () => {
              await expect(controller.getStatus()).rejects.toThrow('error-2');
            });
          });
        });
      });

      describe('and the connector returns no quota', () => {
        beforeEach(() => {
          connectorMock.getQuota.mockResolvedValue(null);
        });

        it('reports a null quota', async () => {
          const status = await controller.getStatus();

          expect(status.providers[0].quota).toBeNull();
        });
      });

      describe('but the connector rejects', () => {
        beforeEach(() => {
          connectorMock.getQuota.mockRejectedValue(new Error('error-1'));
        });

        it('reports a null quota', async () => {
          const status = await controller.getStatus();

          expect(status.providers[0].quota).toBeNull();
        });
      });

      describe('and the connector does not support quota', () => {
        beforeEach(() => {
          controller = new StatusController(
            [createConnector({ getQuota: undefined })],
            statsRepositoryMock,
          );
        });

        it('reports a null quota', async () => {
          const status = await controller.getStatus();

          expect(status.providers[0].quota).toBeNull();
        });
      });
    });

    describe('when the stats repo throws', () => {
      beforeEach(() => {
        statsRepositoryMock.countByProvider.mockImplementation(() => {
          throw new Error('error-3');
        });
      });

      it('propagates the error', async () => {
        await expect(controller.getStatus()).rejects.toThrow('error-3');
      });
    });
  });
});
