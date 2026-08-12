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
   * @returns {Promise<Author>}
   */
  getAuthorById(id) {
    throw new Error('not implemented');
  }

  /**
   * @param {string} authorId
   * @returns {Promise<Publication[]>}
   */
  getAuthorPublications(authorId) {
    throw new Error('not implemented');
  }

  /**
   * @param {string} id - provider id or DOI
   * @returns {Promise<Publication>}
   */
  getPublication(id) {
    throw new Error('not implemented');
  }

  /**
   * @param {string} pubId
   * @returns {Promise<Publication[]>} the publications that cite pubId
   */
  getCitations(pubId) {
    throw new Error('not implemented');
  }

  /**
   * @param {string} pubId
   * @returns {Promise<Contribution[]>}
   */
  getContributions(pubId) {
    throw new Error('not implemented');
  }
}
