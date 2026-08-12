import { beforeEach, describe, expect, it } from '@jest/globals';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { migrationsDir } from '../../config/env.js';
import { DbClient } from '../../db/client.js';
import { CacheRepository, OutdatedCacheError } from '../CacheRepository.js';

const createRepo = () => {
  const { db } = new DbClient();
  migrate(db, { migrationsFolder: migrationsDir });
  return new CacheRepository(db);
};

describe('CacheRepository', () => {
  let repo;

  beforeEach(() => {
    repo = createRepo();
  });

  describe('when the key is absent', () => {
    it('returns null', () => {
      expect(repo.get('absent')).toBeNull();
    });
  });

  describe('when the key has a value', () => {
    const value = { results: [{ id: 'W1' }], page: 1 };

    beforeEach(() => {
      repo.put('openalex:W1', value);
    });

    describe('and the entry is within the TTL', () => {
      it('returns the value', () => {
        expect(repo.get('openalex:W1', 60_000).value).toEqual(value);
      });

      it('returns the fetched date', () => {
        expect(repo.get('openalex:W1', 60_000).fetchedAt).toBeInstanceOf(Date);
      });
    });

    describe('and the entry is older than the TTL', () => {
      it('getOrFail throws an outdated error', () => {
        expect(() => repo.getOrFail('openalex:W1', 0)).toThrow(OutdatedCacheError);
      });

      it('get returns null', () => {
        expect(repo.get('openalex:W1', 0)).toBeNull();
      });
    });

    describe('and the key is overwritten', () => {
      beforeEach(() => {
        repo.put('openalex:W1', { page: 2 });
      });

      it('keeps the latest value', () => {
        expect(repo.get('openalex:W1').value).toEqual({ page: 2 });
      });
    });
  });
});
