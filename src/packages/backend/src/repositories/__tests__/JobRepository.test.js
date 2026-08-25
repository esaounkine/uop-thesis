import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { JOB_STATUS } from '../../constants/job-status.js';
import { JobRepository } from '../JobRepository.js';

const createDbMock = () => {
  const dbMock = {
    select: jest.fn(() =>
      dbMock),
    from: jest.fn(() =>
      dbMock),
    where: jest.fn(() =>
      dbMock),
    orderBy: jest.fn(() =>
      dbMock),
    insert: jest.fn(() =>
      dbMock),
    values: jest.fn(() =>
      dbMock),
    update: jest.fn(() =>
      dbMock),
    set: jest.fn(() =>
      dbMock),
    get: jest.fn(),
    all: jest.fn(),
    run: jest.fn(),
  };
  return dbMock;
};

const job1 = {
  id: 'job-1',
  provider: 'openalex',
  authorId: 'W1',
  status: JOB_STATUS.RUNNING,
};

describe('JobRepository', () => {
  let dbMock;
  let repo;

  beforeEach(() => {
    dbMock = createDbMock();
    repo = new JobRepository(dbMock);
  });

  describe('createJob', () => {
    describe('when given a job row', () => {
      it('forwards it to the insert', () => {
        repo.createJob(job1);
        expect(dbMock.values).toHaveBeenCalledWith(job1);
      });
    });

    describe('when the insert throws', () => {
      beforeEach(() => {
        dbMock.run.mockImplementation(() => {
          throw new Error('error-1');
        });
      });

      it('propagates the error', () => {
        expect(() =>
          repo.createJob(job1)).toThrow('error-1');
      });
    });
  });

  describe('updateJob', () => {
    describe('when given a patch', () => {
      it('forwards it with a refreshed date', () => {
        repo.updateJob('job-1', {
          status: JOB_STATUS.DONE,
        });
        expect(dbMock.set).toHaveBeenCalledWith({
          status: JOB_STATUS.DONE,
          updatedAt: expect.any(String),
        });
      });
    });

    describe('when the update throws', () => {
      beforeEach(() => {
        dbMock.run.mockImplementation(() => {
          throw new Error('error-1');
        });
      });

      it('propagates the error', () => {
        expect(() =>
          repo.updateJob('job-1', { status: JOB_STATUS.DONE })).toThrow('error-1');
      });
    });
  });

  describe('findJob', () => {
    describe('when the db returns a row', () => {
      beforeEach(() => {
        dbMock.get.mockReturnValue(job1);
      });

      it('returns it', () => {
        expect(repo.findJob({ id: 'job-1' })).toBe(job1);
      });
    });

    describe('when the db returns nothing', () => {
      beforeEach(() => {
        dbMock.get.mockReturnValue(undefined);
      });

      it('returns undefined', () => {
        expect(repo.findJob({ id: 'nope' })).toBeUndefined();
      });
    });

    describe('when the db throws', () => {
      beforeEach(() => {
        dbMock.get.mockImplementation(() => {
          throw new Error('error-1');
        });
      });

      it('propagates the error', () => {
        expect(() =>
          repo.findJob({ id: 'job-1' })).toThrow('error-1');
      });
    });
  });

  describe('findJobs', () => {
    describe('when the db returns rows', () => {
      const rows = [job1];

      beforeEach(() => {
        dbMock.all.mockReturnValue(rows);
      });

      it('returns them', () => {
        expect(repo.findJobs()).toBe(rows);
      });
    });

    describe('when the db returns nothing', () => {
      beforeEach(() => {
        dbMock.all.mockReturnValue([]);
      });

      it('returns an empty list', () => {
        expect(repo.findJobs()).toEqual([]);
      });
    });

    describe('when the db throws', () => {
      beforeEach(() => {
        dbMock.all.mockImplementation(() => {
          throw new Error('error-1');
        });
      });

      it('propagates the error', () => {
        expect(() =>
          repo.findJobs()).toThrow('error-1');
      });
    });
  });

  describe('interruptRunningJobs', () => {
    describe('when the db returns running jobs', () => {
      beforeEach(() => {
        dbMock.all.mockReturnValue([{ id: 'r1' }, { id: 'r2' }]);
      });

      it('marks each interrupted with the reason', () => {
        repo.interruptRunningJobs();
        expect(dbMock.set).toHaveBeenCalledWith({
          status: JOB_STATUS.INTERRUPTED,
          error: 'server restarted while the job was running',
          updatedAt: expect.any(String),
        });
      });

      it('returns how many it interrupted', () => {
        expect(repo.interruptRunningJobs()).toBe(2);
      });

      describe('but one update throws', () => {
        beforeEach(() => {
          dbMock.run
            .mockReturnValueOnce(undefined)
            .mockImplementationOnce(() => {
              throw new Error('error-1');
            });
        });

        it('propagates the error', () => {
          expect(() =>
            repo.interruptRunningJobs()).toThrow('error-1');
        });
      });
    });

    describe('when the db returns no running job', () => {
      beforeEach(() => {
        dbMock.all.mockReturnValue([]);
      });

      it('returns zero', () => {
        expect(repo.interruptRunningJobs()).toBe(0);
      });

      it('updates nothing', () => {
        repo.interruptRunningJobs();
        expect(dbMock.update).not.toHaveBeenCalled();
      });
    });

    describe('when the db throws', () => {
      beforeEach(() => {
        dbMock.all.mockImplementation(() => {
          throw new Error('error-1');
        });
      });

      it('propagates the error', () => {
        expect(() =>
          repo.interruptRunningJobs()).toThrow('error-1');
      });
    });
  });
});
