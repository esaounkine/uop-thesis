import { describe, expect, it } from '@jest/globals';
import { getProviderSpecOrFail } from '../index.js';

describe('selectProvider', () => {
  describe('when the provider is known', () => {
    it('creates the matching connector', () => {
      const connector = getProviderSpecOrFail('semanticscholar').create({});
      expect(connector.id).toBe('semanticscholar');
    });
  });

  describe('when the provider is unknown', () => {
    it('throws', () => {
      expect(() =>
        getProviderSpecOrFail('nope')).toThrow('Unknown provider');
    });
  });
});
