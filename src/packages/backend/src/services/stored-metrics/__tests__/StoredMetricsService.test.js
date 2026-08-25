import { beforeEach, describe, expect, it } from '@jest/globals';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { migrationsDir } from '../../../config/env.js';
import { DbClient } from '../../../db/DbClient.js';
import { JOB_STATUS } from '../../../constants/job-status.js';
import { JobRepository } from '../../../repositories/JobRepository.js';
import { StoredMetricsService } from '../StoredMetricsService.js';

const createService = () => {
  const { db } = new DbClient();
  migrate(db, { migrationsFolder: migrationsDir });
  const jobRepository = new JobRepository(db);

  return {
    jobRepository: jobRepository,
    storedMetricsService: new StoredMetricsService(jobRepository),
  };
};

const createJob = (id, patch = {}) => {
  return {
    id: id,
    provider: 'openalex',
    authorId: 'A1',
    status: JOB_STATUS.RUNNING,
    progress: null,
    result: null,
    error: null,
    createdAt: '2026-08-25T10:00:00.000Z',
    updatedAt: '2026-08-25T10:00:00.000Z',
    ...patch,
  };
};

describe('StoredMetricsService', () => {
  describe('getStoredMetrics', () => {
    describe('when a completed job exists', () => {
      let stored;

      beforeEach(() => {
        const {
          jobRepository, storedMetricsService,
        } = createService();
        jobRepository.createJob(createJob('job-1', {
          status: JOB_STATUS.DONE,
          result: {
            metrics: { total: 3 },
          },
        }));
        stored = storedMetricsService.getStoredMetrics('openalex', 'A1');
      });

      it('returns the stored result', () => {
        expect(stored.result).toEqual({
          metrics: { total: 3 },
        });
      });

      it('returns the completion date', () => {
        expect(stored.updatedAt).toBe('2026-08-25T10:00:00.000Z');
      });
    });

    describe('when the job is not completed', () => {
      it('returns null', () => {
        const {
          jobRepository, storedMetricsService,
        } = createService();
        jobRepository.createJob(createJob('job-1'));

        expect(storedMetricsService.getStoredMetrics('openalex', 'A1')).toBeNull();
      });
    });

    describe('when no job exists for the subject', () => {
      it('returns null', () => {
        const { storedMetricsService } = createService();
        expect(storedMetricsService.getStoredMetrics('openalex', 'A2')).toBeNull();
      });
    });
  });
});
