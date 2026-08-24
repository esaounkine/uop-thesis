import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { JobController } from '../JobController.js';

const createController = ({
  metricsServiceMock, jobServiceMock, storedMetricsServiceMock,
}) =>
  new JobController([
    {
      id: 'openalex',
      metricsService: metricsServiceMock,
      queue: null,
    },
  ], jobServiceMock, storedMetricsServiceMock);

describe('JobController', () => {
  describe('submitJob', () => {
    let metricsServiceMock;
    let jobServiceMock;
    let controller;

    beforeEach(() => {
      metricsServiceMock = { getAuthorMetrics: jest.fn() };
      jobServiceMock = {
        submitJob: jest.fn((run) => {
          run();
          return 'req-1';
        }),
      };
      controller = createController({
        metricsServiceMock: metricsServiceMock,
        jobServiceMock: jobServiceMock,
      });
    });

    describe('when the body has cache disabled', () => {
      beforeEach(() => {
        controller.submitJob({
          body: {
            provider: 'openalex',
            id: 'A1',
            cache: false,
          },
        });
      });

      it('fetches the metrics without the cache', () => {
        expect(metricsServiceMock.getAuthorMetrics)
          .toHaveBeenCalledWith('A1', { cache: false });
      });
    });

    describe('when the body has no cache flag', () => {
      beforeEach(() => {
        controller.submitJob({
          body: {
            provider: 'openalex',
            id: 'A1',
          },
        });
      });

      it('fetches the metrics with the cache', () => {
        expect(metricsServiceMock.getAuthorMetrics)
          .toHaveBeenCalledWith('A1', { cache: true });
      });
    });
  });

  describe('getStoredMetrics', () => {
    const request = {
      params: {
        provider: 'openalex',
        authorId: 'A1',
      },
    };

    describe('when stored metrics exist', () => {
      let result;

      beforeEach(() => {
        const storedMetricsServiceMock = {
          getStoredMetrics: jest.fn().mockReturnValue({
            result: {
              metrics: { total: 3 },
            },
          }),
        };
        result = createController({
          storedMetricsServiceMock: storedMetricsServiceMock,
        }).getStoredMetrics(request);
      });

      it('returns the stored result', () => {
        expect(result).toEqual({
          metrics: { total: 3 },
        });
      });
    });

    describe('when no metrics are stored', () => {
      it('is a 404', () => {
        const storedMetricsServiceMock = {
          getStoredMetrics: jest.fn().mockReturnValue(null),
        };
        const controller = createController({
          storedMetricsServiceMock: storedMetricsServiceMock,
        });

        expect(() =>
          controller.getStoredMetrics(request)).toThrow('no stored metrics for this author');
      });
    });
  });
});
