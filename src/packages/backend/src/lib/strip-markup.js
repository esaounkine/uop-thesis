const TAG = /<[^>]*>/g;

/**
 * Removes HTML tags from a string.
 * Used to normalise titles containing HTML style tags (<sup>, <i> etc).
 *
 * @param {*} text
 * @returns {*} the text without tags
 */
export const stripMarkup = (text) =>
  (typeof text === 'string'
    ? text.replace(TAG, '')
    : text);
