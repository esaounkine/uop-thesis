import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { JobController } from '../JobController.js';

const createController = ({
  metricsServiceMock, jobServiceMock,
}) =>
  new JobController([
    {
      id: 'openalex',
      metricsService: metricsServiceMock,
      queue: null,
    },
  ], jobServiceMock);

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
});
