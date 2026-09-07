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
   * API quota of the provider.
   *
   * @returns {Promise<Object | null>} null when the provider doesn't expose it
   */
  getQuota() {
    return Promise.resolve(null);
  }
}
