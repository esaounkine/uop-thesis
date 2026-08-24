/** @typedef {import('../../db/schema.js').Author} Author */

/** @typedef {import('../../db/schema.js').Publication} Publication */

/**
 * Operations per author.
 */
export class AuthorService {
  /**
   * @param {Object} args
   * @param {import('../../connectors/ProviderConnector.js').ProviderConnector} args.connector
   */
  constructor({ connector }) {
    this.connector = connector;
  }

  /**
   * Authors with name matching the search term.
   *
   * @param {string} name
   * @returns {Promise<Author[]>}
   */
  async searchByName(name) {
    return this.connector.searchAuthors(name);
  }

  /**
   * @param {string} authorId
   * @param {Object} [options]
   * @param {boolean} [options.cache] - true = use, false = skip the cache
   * @returns {Promise<null | {
   *   author: Author,
   *   publications: Publication[],
   * }>} null when the author is not found
   */
  async getPublications(authorId, { cache = true } = {}) {
    const author = await this.connector
      .getAuthorById(authorId, { cache: cache });

    if (!author) {
      return null;
    }

    const publications = await this.connector
      .getAuthorPublications(authorId, { cache: cache });

    return {
      author: author,
      publications: publications,
    };
  }
}
