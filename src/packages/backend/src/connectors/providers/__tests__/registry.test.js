import { describe, expect, it } from '@jest/globals';
import { selectProvider } from '../registry.js';

describe('selectProvider', () => {
  describe('when the provider is known', () => {
    it('creates the matching connector', () => {
      const connector = selectProvider('semanticscholar').create({});
      expect(connector.id).toBe('semanticscholar');
    });
  });

  describe('when the provider is unknown', () => {
    it('throws', () => {
      expect(() =>
        selectProvider('nope')).toThrow('Unknown provider');
    });
  });
});
