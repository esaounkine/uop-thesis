import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { JOB_STATUS } from '../../../constants/job-status.js';
import { JobService } from '../JobService.js';

const flushPromises = () =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

const createDeferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise: promise,
    resolve: resolve,
    reject: reject,
  };
};

const meta = {
  providerId: 'openalex',
  authorId: 'A1',
};

const noProgress = {
  done: 0,
  running: 0,
  queued: 0,
};

describe('JobService', () => {
  let jobRepositoryMock;
  let queueMock;
  let jobService;

  beforeEach(() => {
    jobRepositoryMock = {
      createJob: jest.fn(),
      updateJob: jest.fn(),
      findJob: jest.fn(),
      findJobs: jest.fn().mockReturnValue([]),
    };
    queueMock = {
      onTaskCompleted: jest.fn(),
      offTaskCompleted: jest.fn(),
      pending: 2,
      size: 5,
    };
    const providers = [
      {
        id: 'openalex',
        httpClient: {
          queue: queueMock,
        },
      },
    ];
    jobService = new JobService(providers, jobRepositoryMock);
  });

  describe('submitJob', () => {
    describe('when a task is submitted', () => {
      let task;
      let run;

      beforeEach(() => {
        task = createDeferred();
        run = jest.fn().mockReturnValue(task.promise);
      });

      it('returns a request id', () => {
        expect(jobService.submitJob(run, meta)).toEqual(expect.any(String));
      });

      it('persists a running job', () => {
        const requestId = jobService.submitJob(run, meta);

        expect(jobRepositoryMock.createJob).toHaveBeenCalledWith(
          expect.objectContaining({
            id: requestId,
            provider: 'openalex',
            authorId: 'A1',
            status: JOB_STATUS.RUNNING,
          }),
        );
      });

      describe('and the task resolves', () => {
        it('marks the job done', async () => {
          const requestId = jobService.submitJob(run, meta);

          task.resolve();
          await flushPromises();

          expect(jobRepositoryMock.updateJob).toHaveBeenCalledWith(requestId, {
            status: JOB_STATUS.DONE,
            progress: noProgress,
          });
        });
      });

      describe('but the task rejects', () => {
        it('marks the job with the message', async () => {
          const requestId = jobService.submitJob(run, meta);

          task.reject(new Error('error-2'));
          await flushPromises();

          expect(jobRepositoryMock.updateJob).toHaveBeenCalledWith(requestId, {
            status: JOB_STATUS.ERROR,
            progress: noProgress,
            error: 'error-2',
          });
        });
      });

      describe('and the provider queue reports completions', () => {
        it('advances progress on each completed event', async () => {
          const requestId = jobService.submitJob(run, meta);
          const [onCompleted] = queueMock.onTaskCompleted.mock.calls[0];
          onCompleted();
          onCompleted();

          task.resolve();
          await flushPromises();

          expect(jobRepositoryMock.updateJob).toHaveBeenCalledWith(requestId, {
            status: JOB_STATUS.DONE,
            progress: {
              done: 2,
              running: 2,
              queued: 5,
            },
          });
        });
      });
    });

    describe('when the provider is unknown', () => {
      it('throws', () => {
        expect(() =>
          jobService.submitJob(jest.fn(), {
            providerId: 'nope',
            authorId: 'A1',
          }))
          .toThrow('unknown provider: nope');
      });
    });

    describe('when the repo cannot persist the job', () => {
      beforeEach(() => {
        jobRepositoryMock.createJob.mockImplementation(() => {
          throw new Error('error-1');
        });
      });

      it('propagates the error', () => {
        expect(() =>
          jobService.submitJob(jest.fn(), meta)).toThrow('error-1');
      });
    });
  });

  describe('getJob', () => {
    describe('when the job is still running', () => {
      let requestId;

      beforeEach(() => {
        const task = createDeferred();
        requestId = jobService.submitJob(
          jest.fn().mockReturnValue(task.promise), meta,
        );
      });

      it('returns the running job', () => {
        expect(jobService.getJob(requestId)).toMatchObject({
          id: requestId,
          authorId: 'A1',
          status: JOB_STATUS.RUNNING,
        });
      });

      it('does not query the repo', () => {
        jobService.getJob(requestId);

        expect(jobRepositoryMock.findJob).not.toHaveBeenCalled();
      });
    });

    describe('when the job is not running', () => {
      describe('and the repo returns the job', () => {
        beforeEach(() => {
          jobRepositoryMock.findJob.mockReturnValue({
            id: 'job-1',
            status: JOB_STATUS.DONE,
          });
        });

        it('returns it from the repo', () => {
          expect(jobService.getJob('job-1')).toEqual({
            id: 'job-1',
            status: JOB_STATUS.DONE,
          });
        });
      });

      describe('and the repo returns nothing', () => {
        beforeEach(() => {
          jobRepositoryMock.findJob.mockReturnValue(undefined);
        });

        it('returns undefined', () => {
          expect(jobService.getJob('nope')).toBeUndefined();
        });
      });

      describe('but the repo throws', () => {
        beforeEach(() => {
          jobRepositoryMock.findJob.mockImplementation(() => {
            throw new Error('error-3');
          });
        });

        it('propagates the error', () => {
          expect(() =>
            jobService.getJob('job-1')).toThrow('error-3');
        });
      });
    });
  });

  describe('getLastUpdateJob', () => {
    describe('when the repo returns a completed job', () => {
      beforeEach(() => {
        jobRepositoryMock.findJob.mockReturnValue({
          authorId: 'A1',
          status: JOB_STATUS.DONE,
        });
      });

      it('queries by the author key and done status', () => {
        jobService.getLastUpdateJob('openalex', 'A1');

        expect(jobRepositoryMock.findJob).toHaveBeenCalledWith({
          provider: 'openalex',
          authorId: 'A1',
          status: JOB_STATUS.DONE,
        });
      });

      it('returns the job', () => {
        expect(jobService.getLastUpdateJob('openalex', 'A1')).toEqual({
          authorId: 'A1',
          status: JOB_STATUS.DONE,
        });
      });
    });

    describe('when the repo returns nothing', () => {
      beforeEach(() => {
        jobRepositoryMock.findJob.mockReturnValue(undefined);
      });

      it('returns undefined', () => {
        expect(jobService.getLastUpdateJob('openalex', 'A1')).toBeUndefined();
      });
    });

    describe('when the repo throws', () => {
      beforeEach(() => {
        jobRepositoryMock.findJob.mockImplementation(() => {
          throw new Error('error-4');
        });
      });

      it('propagates the error', () => {
        expect(() =>
          jobService.getLastUpdateJob('openalex', 'A1')).toThrow('error-4');
      });
    });
  });

  describe('listJobs', () => {
    describe('when the repo returns jobs', () => {
      beforeEach(() => {
        jobRepositoryMock.findJobs.mockReturnValue([
          {
            id: 'job-1',
            status: JOB_STATUS.DONE,
          },
          {
            id: 'job-2',
            status: JOB_STATUS.DONE,
          },
        ]);
      });

      it('returns them', () => {
        expect(jobService.listJobs()).toEqual([
          {
            id: 'job-1',
            status: JOB_STATUS.DONE,
          },
          {
            id: 'job-2',
            status: JOB_STATUS.DONE,
          },
        ]);
      });
    });

    describe('when a listed job is still running', () => {
      let requestId;

      beforeEach(() => {
        const task = createDeferred();
        requestId = jobService.submitJob(
          jest.fn().mockReturnValue(task.promise), meta,
        );
        jobRepositoryMock.findJobs.mockReturnValue([
          {
            id: requestId,
            status: JOB_STATUS.DONE,
          },
        ]);
      });

      it('returns the in-memory job instead of the stored one', () => {
        expect(jobService.listJobs()).toEqual([
          expect.objectContaining({
            id: requestId,
            status: JOB_STATUS.RUNNING,
          }),
        ]);
      });
    });

    describe('when the repo throws', () => {
      beforeEach(() => {
        jobRepositoryMock.findJobs.mockImplementation(() => {
          throw new Error('error-5');
        });
      });

      it('propagates the error', () => {
        expect(() =>
          jobService.listJobs()).toThrow('error-5');
      });
    });
  });
});
