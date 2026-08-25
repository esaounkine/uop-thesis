import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { StatusController } from '../StatusController.js';

const createProvider = (connector) => {
  return {
    id: 'openalex',
    apiKey: 'secret',
    requestsPerSecond: 5,
    connector: connector,
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
    connectorMock = {
      getQuota: jest.fn(),
    };
    controller = new StatusController(
      [createProvider(connectorMock)],
      statsRepositoryMock,
    );
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
              [
                {
                  ...createProvider(connectorMock),
                  apiKey: null,
                },
              ],
              statsRepositoryMock,
            );
          });

          it('reports a null api key', async () => {
            const status = await controller.getStatus();

            expect(status.providers[0].apiKey).toBeNull();
          });
        });

        describe('and several providers are configured', () => {
          let otherConnectorMock;

          beforeEach(() => {
            otherConnectorMock = {
              getQuota: jest.fn().mockResolvedValue({ creditsRemaining: 5000 }),
            };
            controller = new StatusController(
              [
                createProvider(connectorMock),
                {
                  ...createProvider(otherConnectorMock),
                  id: 'semanticscholar',
                },
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
            [createProvider({})],
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
