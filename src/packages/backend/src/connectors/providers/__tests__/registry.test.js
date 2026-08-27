import { describe, expect, it } from '@jest/globals';
import { getProviderOrFail } from '../index.js';

describe('selectProvider', () => {
  describe('when the provider is known', () => {
    it('creates the matching connector', () => {
      const connector = getProviderOrFail('semanticscholar').create({});
      expect(connector.id).toBe('semanticscholar');
    });
  });

  describe('when the provider is unknown', () => {
    it('throws', () => {
      expect(() =>
        getProviderOrFail('nope')).toThrow('Unknown provider');
    });
  });
});
