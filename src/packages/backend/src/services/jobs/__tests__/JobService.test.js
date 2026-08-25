import { EventEmitter } from 'node:events';
import {
  beforeEach, describe, expect, it,
} from '@jest/globals';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { migrationsDir } from '../../../config/env.js';
import { DbClient } from '../../../db/DbClient.js';
import { JOB_STATUS } from '../../../constants/job-status.js';
import { JobRepository } from '../../../repositories/JobRepository.js';
import { JobService } from '../JobService.js';

const completeTask = () =>
  new Promise((resolve) =>
    setImmediate(resolve));

const createRepo = () => {
  const { db } = new DbClient();
  migrate(db, { migrationsFolder: migrationsDir });
  return new JobRepository(db);
};

describe('JobService', () => {
  let repo;
  let jobService;

  beforeEach(() => {
    repo = createRepo();
    jobService = new JobService(repo);
  });

  describe('when the task succeeds', () => {
    let id;

    beforeEach(async () => {
      id = jobService.submitJob(async () =>
        'metrics', {
        provider: 'openalex',
        authorId: 'W1',
      });
      await completeTask();
    });

    it('marks the job done with its metadata', () => {
      expect(jobService.getJob(id)).toMatchObject({
        status: JOB_STATUS.DONE,
        provider: 'openalex',
        authorId: 'W1',
      });
    });

    it('persists the job, so a restarted service still returns it', () => {
      const restarted = new JobService(repo);
      expect(restarted.getJob(id)).toMatchObject({
        status: JOB_STATUS.DONE,
        authorId: 'W1',
      });
    });
  });

  describe('when the work fails', () => {
    let id;

    beforeEach(async () => {
      id = jobService.submitJob(async () => {
        throw new Error('boom');
      }, {
        provider: 'openalex',
        authorId: 'W1',
      });
      await completeTask();
    });

    it('marks the job as errored with the message', () => {
      expect(jobService.getJob(id)).toMatchObject({
        status: JOB_STATUS.ERROR,
        error: 'boom',
      });
    });

    it('persists the failure, so a restarted service still returns it', () => {
      const restarted = new JobService(repo);
      expect(restarted.getJob(id)).toMatchObject({
        status: JOB_STATUS.ERROR,
        error: 'boom',
      });
    });
  });

  describe('progress', () => {
    it('advances on each queue completed event', async () => {
      const queue = Object.assign(new EventEmitter(), {
        pending: 2,
        size: 5,
      });
      queue.onTaskCompleted = (listener) =>
        queue.on('completed', listener);
      queue.offTaskCompleted = (listener) =>
        queue.off('completed', listener);
      const id = jobService.submitJob(async () => {
        queue.emit('completed');
        queue.emit('completed');
      }, {
        queue: queue,
        provider: 'openalex',
        authorId: 'W1',
      });
      await completeTask();

      expect(jobService.getJob(id).progress).toEqual({
        done: 2,
        running: 2,
        queued: 5,
      });
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      jobService.submitJob(async () =>
        'first', {
        provider: 'openalex',
        authorId: 'W1',
      });
      jobService.submitJob(async () =>
        'second', {
        provider: 'openalex',
        authorId: 'A1',
      });
      await completeTask();
    });

    it('returns every job', () => {
      expect(jobService.listJobs()).toHaveLength(2);
    });

    it('contains the author', () => {
      expect(jobService.listJobs().map((job) =>
        job.authorId)).toEqual(expect.arrayContaining(['W1', 'A1']));
    });
  });

  describe('getLastUpdateJob', () => {
    describe('when a job exists for the author', () => {
      let resolveTask;

      beforeEach(() => {
        jobService.submitJob(() =>
          new Promise((resolve) => {
            resolveTask = resolve;
          }), {
          provider: 'openalex',
          authorId: 'A1',
        });
      });

      describe('and it is completed', () => {
        beforeEach(async () => {
          resolveTask();
          await completeTask();
        });

        it('returns that job', () => {
          expect(jobService.getLastUpdateJob('openalex', 'A1')).toMatchObject({
            authorId: 'A1',
            status: JOB_STATUS.DONE,
          });
        });
      });

      describe('but it is still running', () => {
        it('returns undefined', () => {
          expect(jobService.getLastUpdateJob('openalex', 'A1')).toBeUndefined();
        });
      });
    });

    describe('when no job exists for the author', () => {
      it('returns undefined', () => {
        expect(jobService.getLastUpdateJob('openalex', 'A1')).toBeUndefined();
      });
    });
  });

  describe('when a job is still running', () => {
    let repo2;

    beforeEach(() => {
      repo2 = createRepo();
      const first = new JobService(repo2);
      first.submitJob(() =>
        new Promise(() => {}), {
        provider: 'openalex',
        authorId: 'W1',
      });
    });

    it('a restarted service marks it interrupted', () => {
      const restarted = new JobService(repo2);
      const [job] = restarted.listJobs();
      expect(job).toMatchObject({
        status: JOB_STATUS.INTERRUPTED,
        error: 'server restarted while the job was running',
      });
    });
  });

  describe('when the id is unknown', () => {
    it('returns undefined', () => {
      expect(jobService.getJob('nope')).toBeUndefined();
    });
  });
});
