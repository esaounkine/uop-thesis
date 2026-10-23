/**
 * @typedef {Object} Quota
 * @property {string} apiKey
 * @property {boolean} current - the key in use
 * @property {boolean} exhausted - no requests left until the quota resets
 * @property {number | null} creditsLimit
 * @property {number | null} creditsUsed
 * @property {number | null} creditsRemaining
 * @property {string | null} resetsAt
 */

/**
 * The contract every provider connector implements.
 * Results omit the provider key and include available contributor details.
 */
export class ProviderConnector {
  id;

  /**
   * @param {string} name
   * @returns {Promise<Object[]>}
   */
  searchAuthors(name) {
    throw new Error('not implemented');
  }

  /**
   * @param {string} id
   * @param {Object} [options]
   * @param {boolean} [options.cache] - true = use, false = skip the cache
   * @returns {Promise<Object | null>}
   */
  getAuthorById(id, options) {
    throw new Error('not implemented');
  }

  /**
   * @param {string} authorId
   * @param {Object} [options]
   * @param {boolean} [options.cache] - true = use, false = skip the cache
   * @returns {Promise<Object[]>}
   */
  getAuthorPublications(authorId, options) {
    throw new Error('not implemented');
  }

  /**
   * @param {string} pubId
   * @param {Object} [options]
   * @param {boolean} [options.cache] - true = use, false = skip the cache
   * @returns {Promise<Object[]>} the publications that cite pubId
   */
  getCitations(pubId, options) {
    throw new Error('not implemented');
  }

  /**
   * Quotas of the provider, one entry per API key; empty without a key.
   * A provider without a quota endpoint reports its key with unknown credits.
   *
   * @returns {Promise<Quota[]>}
   */
  getQuotas() {
    return Promise.resolve(this.apiKey
      ? [
          {
            apiKey: this.apiKey,
            current: true,
            exhausted: false,
            creditsLimit: null,
            creditsUsed: null,
            creditsRemaining: null,
            resetsAt: null,
          },
        ]
      : []);
  }
}
