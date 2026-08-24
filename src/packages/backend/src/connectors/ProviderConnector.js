/** @typedef {import('../db/schema.js').Author} Author */
/** @typedef {import('../db/schema.js').Publication} Publication */
/** @typedef {import('../db/schema.js').Contribution} Contribution */

/**
 * The contract every provider connector implements.
 * Methods return data that keeps the native identifiers.
 */
export class ProviderConnector {
  /**
   * @param {string} name
   * @returns {Promise<Author[]>}
   */
  searchAuthors(name) {
    throw new Error('not implemented');
  }

  /**
   * @param {string} id
   * @param {Object} [options]
   * @param {boolean} [options.cache] - true = use, false = skip the cache
   * @returns {Promise<Author>}
   */
  getAuthorById(id, options) {
    throw new Error('not implemented');
  }

  /**
   * @param {string} authorId
   * @param {Object} [options]
   * @param {boolean} [options.cache] - true = use, false = skip the cache
   * @returns {Promise<Publication[]>}
   */
  getAuthorPublications(authorId, options) {
    throw new Error('not implemented');
  }

  /**
   * @param {string} pubId
   * @param {Object} [options]
   * @param {boolean} [options.cache] - true = use, false = skip the cache
   * @returns {Promise<Publication[]>} the publications that cite pubId
   */
  getCitations(pubId, options) {
    throw new Error('not implemented');
  }

  /**
   * API quota of the provider.
   *
   * @returns {Promise<Object | null>} null when the provider doesn't exposes it
   */
  getQuota() {
    return Promise.resolve(null);
  }
}
