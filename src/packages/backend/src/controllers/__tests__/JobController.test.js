import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { JobController } from '../JobController.js';

const createController = ({
  metricsService,
  jobService,
  citationGraphService,
  classificationService,
}) =>
  new JobController([
    {
      id: 'openalex',
      metricsService: metricsService,
      citationGraphService: citationGraphService,
      classificationService: classificationService,
      queue: null,
    },
  ], jobService);

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
        metricsService: metricsServiceMock,
        jobService: jobServiceMock,
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
          .toHaveBeenCalledWith('openalex', 'A1', { cache: false });
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
          .toHaveBeenCalledWith('openalex', 'A1', { cache: true });
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

    describe('when the graph returns the author tree', () => {
      let result;

      beforeEach(() => {
        const citationGraphServiceMock = {
          getAuthorTree: jest.fn().mockReturnValue({
            author: { authorId: 'A1' },
            publications: [{ citations: [{ classification: 'external' }] }],
          }),
        };
        const classificationServiceMock = {
          getMetrics: jest.fn().mockReturnValue({ total: 1 }),
        };
        result = createController({
          citationGraphService: citationGraphServiceMock,
          classificationService: classificationServiceMock,
        }).getStoredMetrics(request);
      });

      it('reconstructs the tree, metrics, and author', () => {
        expect(result).toEqual({
          author: { authorId: 'A1' },
          metrics: { total: 1 },
          publications: [{ citations: [{ classification: 'external' }] }],
        });
      });
    });

    describe('when the graph returns nothing', () => {
      it('is a 404', () => {
        const citationGraphServiceMock = {
          getAuthorTree: jest.fn().mockReturnValue(null),
        };
        const controller = createController({
          citationGraphService: citationGraphServiceMock,
        });

        expect(() =>
          controller.getStoredMetrics(request)).toThrow('no stored metrics for this author');
      });
    });
  });
});
