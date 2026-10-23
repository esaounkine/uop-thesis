import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { JOB_STATUS } from '../../constants/job-status.js';
import { JobController } from '../JobController.js';

describe('JobController', () => {
  let metricsServiceMock;
  let jobServiceMock;
  let controller;

  beforeEach(() => {
    metricsServiceMock = {
      getAuthorMetrics: jest.fn(),
    };
    jobServiceMock = {
      submitJob: jest.fn(),
      getJob: jest.fn(),
      listJobs: jest.fn(),
    };
    controller = new JobController(metricsServiceMock, jobServiceMock);
  });

  describe('submitJob', () => {
    describe('when no body in the request', () => {
      it('is a 400', () => {
        expect(() =>
          controller.submitJob({}))
          .toThrow('body must contain');
      });
    });

    describe('when no provider in the request', () => {
      it('is a 400', () => {
        expect(() =>
          controller.submitJob({ body: { id: 'A1' } }))
          .toThrow('body must contain');
      });
    });

    describe('when no id in the request', () => {
      it('is a 400', () => {
        expect(() =>
          controller.submitJob({ body: { provider: 'openalex' } }))
          .toThrow('body must contain');
      });
    });

    describe('when params are valid', () => {
      const body = {
        provider: 'openalex',
        id: 'A1',
      };

      beforeEach(() => {
        jobServiceMock.submitJob.mockReturnValue('req-1');
      });

      it('returns the request id', () => {
        expect(controller.submitJob({ body: body }))
          .toEqual({ requestId: 'req-1' });
      });

      it('submits a job tagged with provider and author', () => {
        controller.submitJob({ body: body });

        expect(jobServiceMock.submitJob).toHaveBeenCalledWith(
          expect.any(Function),
          {
            providerId: 'openalex',
            authorId: 'A1',
          },
        );
      });

      describe('and cache is enabled (default)', () => {
        it('fetches metrics with cache', () => {
          controller.submitJob({ body: body });
          const [task] = jobServiceMock.submitJob.mock.calls[0];
          task();

          expect(metricsServiceMock.getAuthorMetrics)
            .toHaveBeenCalledWith('openalex', 'A1', { cache: true });
        });
      });

      describe('and cache is disabled', () => {
        it('fetches metrics without cache', () => {
          controller.submitJob({
            body: {
              ...body,
              cache: false,
            },
          });
          const [task] = jobServiceMock.submitJob.mock.calls[0];
          task();

          expect(metricsServiceMock.getAuthorMetrics)
            .toHaveBeenCalledWith('openalex', 'A1', { cache: false });
        });
      });

      describe('but the metrics service throws', () => {
        beforeEach(() => {
          metricsServiceMock.getAuthorMetrics.mockImplementation(() => {
            throw new Error('error-1');
          });
        });

        it('the task propagates the error', () => {
          controller.submitJob({ body: body });
          const [task] = jobServiceMock.submitJob.mock.calls[0];

          expect(() =>
            task())
            .toThrow('error-1');
        });
      });

      describe('but the job service throws', () => {
        beforeEach(() => {
          jobServiceMock.submitJob.mockImplementation(() => {
            throw new Error('error-2');
          });
        });

        it('propagates the error', () => {
          expect(() =>
            controller.submitJob({ body: body })).toThrow('error-2');
        });
      });
    });
  });

  describe('getJob', () => {
    describe('when the job service returns the job', () => {
      const job = {
        id: 'req-1',
        status: JOB_STATUS.DONE,
      };

      beforeEach(() => {
        jobServiceMock.getJob.mockReturnValue(job);
      });

      it('returns the job', () => {
        expect(controller.getJob({ params: { id: 'req-1' } })).toBe(job);
      });
    });

    describe('when the job service returns nothing', () => {
      beforeEach(() => {
        jobServiceMock.getJob.mockReturnValue(undefined);
      });

      it('is a 404', () => {
        expect(() =>
          controller.getJob({ params: { id: 'nope' } }))
          .toThrow('job not found');
      });
    });

    describe('when the job service throws', () => {
      beforeEach(() => {
        jobServiceMock.getJob.mockImplementation(() => {
          throw new Error('error-3');
        });
      });

      it('propagates the error', () => {
        expect(() =>
          controller.getJob({ params: { id: 'req-1' } })).toThrow('error-3');
      });
    });
  });

  describe('listJobs', () => {
    describe('when the job service returns jobs', () => {
      const jobs = [{ id: 'job-1' }, { id: 'job-2' }];

      beforeEach(() => {
        jobServiceMock.listJobs.mockReturnValue(jobs);
      });

      it('returns them', () => {
        expect(controller.listJobs()).toBe(jobs);
      });
    });

    describe('when the job service returns no jobs', () => {
      const jobs = [];

      beforeEach(() => {
        jobServiceMock.listJobs.mockReturnValue(jobs);
      });

      it('returns an empty list', () => {
        expect(controller.listJobs()).toBe(jobs);
      });
    });

    describe('when the job service throws', () => {
      beforeEach(() => {
        jobServiceMock.listJobs.mockImplementation(() => {
          throw new Error('error-4');
        });
      });

      it('propagates the error', () => {
        expect(() =>
          controller.listJobs()).toThrow('error-4');
      });
    });
  });
});
