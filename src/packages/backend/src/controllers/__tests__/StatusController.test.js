import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { StatusController } from '../StatusController.js';

const createConnector = (overrides = {}) => {
  return {
    id: 'openalex',
    httpClient: {
      queue: {
        requestsPerSecond: 5,
      },
    },
    getQuotas: jest.fn(),
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

      describe('and the connector returns quotas', () => {
        beforeEach(() => {
          connectorMock.getQuotas.mockResolvedValue([
            {
              apiKey: 'secret',
              current: true,
              creditsRemaining: 9000,
            },
          ]);
        });

        it('reports the provider id and rate limit', async () => {
          const status = await controller.getStatus();

          expect(status.providers[0]).toMatchObject({
            id: 'openalex',
            requestsPerSecond: 5,
          });
        });

        it('masks the api key of the quota', async () => {
          const status = await controller.getStatus();

          expect(status.providers[0].quotas[0].apiKey).toBe('****cret');
        });

        it('keeps the rest of the quota', async () => {
          const status = await controller.getStatus();

          expect(status.providers[0].quotas[0]).toMatchObject({
            current: true,
            creditsRemaining: 9000,
          });
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

        describe('and there is a quota per key', () => {
          beforeEach(() => {
            connectorMock.getQuotas.mockResolvedValue([
              {
                apiKey: 'first-key',
                current: true,
                creditsRemaining: 0,
              },
              {
                apiKey: 'other-key',
                current: false,
                creditsRemaining: 80,
              },
            ]);
          });

          it('masks the key of every quota', async () => {
            const status = await controller.getStatus();

            expect(status.providers[0].quotas.map((quota) =>
              quota.apiKey)).toEqual(['****-key', '****-key']);
          });

          it('keeps the rest of every quota', async () => {
            const status = await controller.getStatus();
            const remaining = status.providers[0].quotas.map((quota) =>
              quota.creditsRemaining);

            expect(remaining).toEqual([0, 80]);
          });
        });

        describe('and several providers are configured', () => {
          beforeEach(() => {
            controller = new StatusController(
              [
                connectorMock,
                createConnector({
                  id: 'semanticscholar',
                  getQuotas: jest.fn().mockResolvedValue([]),
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

      describe('and the connector returns no quotas', () => {
        beforeEach(() => {
          connectorMock.getQuotas.mockResolvedValue([]);
        });

        it('reports an empty list', async () => {
          const status = await controller.getStatus();

          expect(status.providers[0].quotas).toEqual([]);
        });
      });

      describe('but the connector rejects', () => {
        beforeEach(() => {
          connectorMock.getQuotas.mockRejectedValue(new Error('error-1'));
        });

        it('reports an empty list', async () => {
          const status = await controller.getStatus();

          expect(status.providers[0].quotas).toEqual([]);
        });
      });
    });

    describe('when the stats repo throws', () => {
      beforeEach(() => {
        connectorMock.getQuotas.mockResolvedValue([]);
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
