import { describe, expect, it } from '@jest/globals';
import { normalise } from '../normalise.js';

describe('normalise', () => {
  describe('when input is a string', () => {
    it('lowercases and trims', () => {
      expect(normalise('  Jane ROE  ')).toBe('jane roe');
    });

    it('collapses inner whitespace', () => {
      expect(normalise('Jane   van\tRoe')).toBe('jane van roe');
    });

    it('strips diacritics', () => {
      // NFKD splits an accented letter into a base letter + a combining mark,
      // then the regex drops the marks (U+0300-U+036F).
      // This covers Latin accents (e, u, n, a, o...).
      // It does not transliterate letters with no decomposition
      // (e.g. o-slash, sharp-s, l-stroke), which pass through unchanged.
      expect(normalise('Crème Brûlée')).toBe('creme brulee');
    });
  });

  describe('when input is null', () => {
    it('returns an empty string', () => {
      expect(normalise(null)).toBe('');
    });
  });
});
