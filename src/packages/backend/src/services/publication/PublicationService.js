/** @typedef {import('../../db/schema.js').Publication} Publication */

/** @typedef {import('../../db/schema.js').Contribution} Contribution */

/**
 * Collects citation data tree of a paper.
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
   * Papers with title matching name.
   *
   * @param {string} name
   * @returns {Promise<Publication[]>}
   */
  async searchByName(name) {
    return this.connector.searchPublications(name);
  }

  /**
   * @param {string} pubId
   * @returns {Promise<null | {
   *   publication: Publication,
   *   citedContributions: Contribution[],
   *   citing: { publication: Publication, contributions: Contribution[] }[],
   *   citations: Publication[],
   * }>} null when the paper is not found
   */
  async getCitationTree(pubId) {
    const publication = await this.connector.getPublication(pubId);

    if (!publication) {
      return null;
    }

    const citations = await this.connector.getCitations(pubId);

    return {
      publication: publication,
      citedContributions: publication.contributions,
      citing: citations.map((citation) => {
        return {
          publication: citation,
          contributions: citation.contributions,
        };
      }),
      citations: citations,
    };
  }
}
