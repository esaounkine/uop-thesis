import { beforeEach, describe, expect, it } from '@jest/globals';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { migrationsDir } from '../../config/env.js';
import { DbClient } from '../../db/DbClient.js';
import { JOB_STATUS } from '../../constants/job-status.js';
import { JobRepository } from '../JobRepository.js';

const createJob = (id, patch = {}) => {
  return {
    id: id,
    provider: 'openalex',
    kind: 'author',
    subjectId: 'W1',
    status: JOB_STATUS.RUNNING,
    progress: null,
    result: null,
    error: null,
    createdAt: '2026-08-17T10:00:00.000Z',
    updatedAt: '2026-08-17T10:00:00.000Z',
    ...patch,
  };
};

const createRepo = () => {
  const { db } = new DbClient();
  migrate(db, { migrationsFolder: migrationsDir });
  return new JobRepository(db);
};

describe('JobRepository', () => {
  let repo;

  beforeEach(() => {
    repo = createRepo();
  });

  describe('when the id is absent', () => {
    it('returns undefined', () => {
      expect(repo.findJobById('nope')).toBeUndefined();
    });
  });

  describe('when a job exists', () => {
    beforeEach(() => {
      repo.createJob(createJob('job-1', {
        progress: {
          done: 0,
          running: 0,
          queued: 0,
        },
      }));
    });

    it('finds it by id with the decoded payload', () => {
      expect(repo.findJobById('job-1')).toEqual(createJob('job-1', {
        progress: {
          done: 0,
          running: 0,
          queued: 0,
        },
      }));
    });

    describe('and it is updated', () => {
      beforeEach(() => {
        repo.updateJob('job-1', {
          status: JOB_STATUS.DONE,
          result: {
            metrics: { total: 3 },
          },
        });
      });

      it('persists the new status', () => {
        expect(repo.findJobById('job-1').status).toBe(JOB_STATUS.DONE);
      });

      it('persists the decoded result', () => {
        expect(repo.findJobById('job-1').result).toEqual({
          metrics: { total: 3 },
        });
      });

      it('refreshes the updated date', () => {
        expect(repo.findJobById('job-1').updatedAt)
          .not.toBe('2026-08-17T10:00:00.000Z');
      });

      it('keeps the created date', () => {
        expect(repo.findJobById('job-1').createdAt).toBe('2026-08-17T10:00:00.000Z');
      });
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      repo.createJob(createJob('job-old'));
      repo.createJob(createJob('job-new', {
        createdAt: '2026-08-17T11:00:00.000Z',
      }));
    });

    it('returns the jobs newest first', () => {
      expect(repo.findAllJobs().map((job) =>
        job.id)).toEqual(['job-new', 'job-old']);
    });
  });

  describe('interruptRunning', () => {
    describe('with a running and a done job', () => {
      beforeEach(() => {
        repo.createJob(createJob('job-running'));
        repo.createJob(createJob('job-done', {
          status: JOB_STATUS.DONE,
        }));
        repo.interruptRunningJobs();
      });

      it('marks the running job interrupted with the reason', () => {
        expect(repo.findJobById('job-running')).toMatchObject({
          status: JOB_STATUS.INTERRUPTED,
          error: 'server restarted while the job was running',
        });
      });

      it('leaves the done job alone', () => {
        expect(repo.findJobById('job-done').status).toBe(JOB_STATUS.DONE);
      });
    });

    describe('without running jobs', () => {
      it('interrupts nothing', () => {
        expect(repo.interruptRunningJobs()).toBe(0);
      });
    });
  });
});
