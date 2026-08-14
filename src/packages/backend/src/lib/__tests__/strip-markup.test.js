import { describe, expect, it } from '@jest/globals';
import { stripMarkup } from '../strip-markup.js';

describe('stripMarkup', () => {
  it('removes a tag pair, keeping the content', () => {
    expect(stripMarkup('Text<sup>1</sup>')).toBe('Text1');
  });

  it('removes multiple tags', () => {
    expect(stripMarkup('<b>bold</b> and <i>italic</i>')).toBe('bold and italic');
  });

  it('leaves plain text unchanged', () => {
    expect(stripMarkup('plain title')).toBe('plain title');
  });

  describe('when the value is not a string', () => {
    it('returns it unchanged', () => {
      expect(stripMarkup(null)).toBeNull();
    });
  });
});
