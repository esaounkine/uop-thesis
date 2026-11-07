import { describe, expect, it } from '@jest/globals';
import { stripMarkup } from '../strip-markup.js';

describe('stripMarkup', () => {
  describe('when input is a string', () => {
    it('removes a tag pair, keeping the content', () => {
      expect(stripMarkup('Text<sup>1</sup>')).toBe('Text1');
    });

    it('removes multiple tags', () => {
      expect(stripMarkup('<b>bold</b> and <i>italic</i>')).toBe('bold and italic');
    });

    it('leaves plain text unchanged', () => {
      expect(stripMarkup('plain title')).toBe('plain title');
    });
  });

  describe('when input is not a string', () => {
    it('returns null unchanged', () => {
      expect(stripMarkup(null)).toBeNull();
    });

    it('returns a number unchanged', () => {
      expect(stripMarkup(42)).toBe(42);
    });

    it('returns an object unchanged', () => {
      const value = { title: 'W1' };
      expect(stripMarkup(value)).toBe(value);
    });
  });
});
