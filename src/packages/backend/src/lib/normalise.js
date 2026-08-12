const DIACRITICS = /[̀-ͯ]/g;

/**
 * Normalises a string for matching.
 *
 * @param {string} value
 * @returns {string}
 */
export const normalise = (value) =>
  (value ?? '')
    .normalize('NFKD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
