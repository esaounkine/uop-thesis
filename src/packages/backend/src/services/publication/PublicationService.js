/** @typedef {import('../../db/schema.js').Publication} Publication */

/**
 * Operations per publication.
 */
export class PublicationService {
  /**
   * @param {Object} args
   * @param {import('../../connectors/ProviderConnector.js').ProviderConnector} args.connector
   */
  constructor({ connector }) {
    this.connector = connector;
  }

  /**
   * @param {string} pubId
   * @returns {Promise<Publication[]>} the publications that cite pubId
   */
  async getCitations(pubId) {
    return this.connector.getCitations(pubId);
  }
}
