import { EventEmitter } from 'node:events';
import {
  beforeEach, describe, expect, it,
} from '@jest/globals';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { migrationsDir } from '../../../config/env.js';
import { DbClient } from '../../../db/client.js';
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
  let jobs;

  beforeEach(() => {
    repo = createRepo();
    jobs = new JobService(repo);
  });

  describe('when the task succeeds', () => {
    let id;

    beforeEach(async () => {
      id = jobs.submitJob(async () =>
        'metrics', {
        kind: 'paper',
        provider: 'openalex',
        subjectId: 'W1',
      });
      await completeTask();
    });

    it('marks the job done with its result and metadata', () => {
      expect(jobs.getJob(id)).toMatchObject({
        status: JOB_STATUS.DONE,
        result: 'metrics',
        kind: 'paper',
        provider: 'openalex',
      });
    });

    it('persists the job, so a restarted service still returns it', () => {
      const restarted = new JobService(repo);
      expect(restarted.getJob(id)).toMatchObject({
        status: JOB_STATUS.DONE,
        result: 'metrics',
        subjectId: 'W1',
      });
    });
  });

  describe('when the work fails', () => {
    let id;

    beforeEach(async () => {
      id = jobs.submitJob(async () => {
        throw new Error('boom');
      }, {
        kind: 'paper',
        provider: 'openalex',
        subjectId: 'W1',
      });
      await completeTask();
    });

    it('marks the job as errored with the message', () => {
      expect(jobs.getJob(id)).toMatchObject({
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
      const id = jobs.submitJob(async () => {
        queue.emit('completed');
        queue.emit('completed');
      }, {
        queue: queue,
        kind: 'paper',
        provider: 'openalex',
        subjectId: 'W1',
      });
      await completeTask();

      expect(jobs.getJob(id).progress).toEqual({
        done: 2,
        running: 2,
        queued: 5,
      });
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      jobs.submitJob(async () =>
        'first', {
        kind: 'paper',
        provider: 'openalex',
        subjectId: 'W1',
      });
      jobs.submitJob(async () =>
        'second', {
        kind: 'author',
        provider: 'openalex',
        subjectId: 'A1',
      });
      await completeTask();
    });

    it('returns every job', () => {
      expect(jobs.listJobs()).toHaveLength(2);
    });

    it('carries the persisted results', () => {
      expect(jobs.listJobs().map((job) =>
        job.result)).toEqual(expect.arrayContaining(['first', 'second']));
    });
  });

  describe('when a job is still running', () => {
    let repo2;

    beforeEach(() => {
      repo2 = createRepo();
      const first = new JobService(repo2);
      first.submitJob(() =>
        new Promise(() => {}), {
        kind: 'paper',
        provider: 'openalex',
        subjectId: 'W1',
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
      expect(jobs.getJob('nope')).toBeUndefined();
    });
  });
});
