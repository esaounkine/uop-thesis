import {
  beforeEach, describe, expect, it,
} from '@jest/globals';
import { StatusController } from '../StatusController.js';

describe('StatusController', () => {
  describe('getStatus', () => {
    let status;

    beforeEach(() => {
      const stats = {
        countByProvider: () => {
          return {
            publications: 3,
            authors: 2,
            contributions: 5,
            citations: 1,
            jobs: 0,
          };
        },
      };
      const providers = [{ id: 'openalex' }];

      status = new StatusController(providers, stats).getStatus();
    });

    it('reports a build version', () => {
      expect(typeof status.version).toBe('string');
    });

    it('lists each provider with its record counts', () => {
      expect(status.providers[0]).toMatchObject({
        id: 'openalex',
        records: {
          publications: 3,
          citations: 1,
        },
      });
    });

    it('masks the api key', () => {
      const { apiKey } = status.providers[0];

      expect(apiKey === null || apiKey.startsWith('****')).toBe(true);
    });

    it('reports host memory and disk', () => {
      expect(status.system.memory.totalBytes).toBeGreaterThan(0);
      expect(status.system.disk.freeBytes).toBeGreaterThanOrEqual(0);
    });
  });
});
