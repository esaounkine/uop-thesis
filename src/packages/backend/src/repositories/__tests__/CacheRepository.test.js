import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CacheRepository, OutdatedCacheError } from '../CacheRepository.js';

const testRow = {
  payload: {
    results: [{ id: 'W1' }],
    page: 1,
  },
  fetchedAt: new Date().toISOString(),
};

describe('CacheRepository', () => {
  let dbMock;
  let repo;

  beforeEach(() => {
    dbMock = {
      select: jest.fn(() =>
        dbMock),
      from: jest.fn(() =>
        dbMock),
      where: jest.fn(() =>
        dbMock),
      insert: jest.fn(() =>
        dbMock),
      values: jest.fn(() =>
        dbMock),
      onConflictDoUpdate: jest.fn(() =>
        dbMock),
      get: jest.fn(),
      run: jest.fn(),
    };
    repo = new CacheRepository(dbMock);
  });

  describe('getOrFail', () => {
    describe('when db returns nothing', () => {
      beforeEach(() => {
        dbMock.get.mockReturnValue(undefined);
      });

      it('returns null', () => {
        expect(repo.getOrFail('absent')).toBeNull();
      });
    });

    describe('when db returns a row', () => {
      beforeEach(() => {
        dbMock.get.mockReturnValue(testRow);
      });

      describe('and it is within the TTL', () => {
        it('returns the value', () => {
          expect(repo.getOrFail('openalex:W1', 60_000).value)
            .toEqual(testRow.payload);
        });

        it('returns the fetched date', () => {
          expect(repo.getOrFail('openalex:W1', 60_000).fetchedAt)
            .toBeInstanceOf(Date);
        });
      });

      describe('but it is past the TTL', () => {
        it('throws an outdated error', () => {
          expect(() =>
            repo.getOrFail('openalex:W1', 0)).toThrow(OutdatedCacheError);
        });
      });
    });

    describe('when db throws', () => {
      beforeEach(() => {
        dbMock.get.mockImplementation(() => {
          throw new Error('error-1');
        });
      });

      it('propagates the error', () => {
        expect(() =>
          repo.getOrFail('openalex:W1')).toThrow('error-1');
      });
    });
  });

  describe('get', () => {
    describe('when db returns a row', () => {
      beforeEach(() => {
        dbMock.get.mockReturnValue(testRow);
      });

      describe('and it is within the TTL', () => {
        it('returns the value', () => {
          expect(repo.get('openalex:W1', 60_000).value)
            .toEqual(testRow.payload);
        });
      });

      describe('but it is past the TTL', () => {
        it('returns null', () => {
          expect(repo.get('openalex:W1', 0)).toBeNull();
        });
      });
    });

    describe('when db throws', () => {
      beforeEach(() => {
        dbMock.get.mockImplementation(() => {
          throw new Error('error-1');
        });
      });

      it('propagates the error', () => {
        expect(() =>
          repo.get('openalex:W1')).toThrow('error-1');
      });
    });
  });

  describe('put', () => {
    describe('when given a key and value', () => {
      it('upserts the value with a date', () => {
        repo.put('openalex:W1', testRow.payload);
        expect(dbMock.values).toHaveBeenCalledWith({
          key: 'openalex:W1',
          payload: testRow.payload,
          fetchedAt: expect.any(String),
        });
      });

      it('returns the stored date', () => {
        expect(repo.put('openalex:W1', testRow.payload))
          .toBeInstanceOf(Date);
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
          repo.put('openalex:W1', testRow.payload))
          .toThrow('error-1');
      });
    });
  });
});
