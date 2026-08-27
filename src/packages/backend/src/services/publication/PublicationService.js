/** @typedef {import('../../db/schema.js').Publication} Publication */

import { AbstractService } from '../AbstractService.js';

export class PublicationService extends AbstractService {
  /**
   * @param {import('../../connectors/ProviderConnector.js').ProviderConnector[]} providers
   */
  constructor(providers) {
    super(providers);
  }

  /**
   * @param {string} providerId
   * @param {string} pubId
   * @param {Object} [options]
   * @param {boolean} [options.cache] - true = use, false = skip the cache
   * @returns {Promise<Publication[]>} the publications that cite pubId
   */
  async getCitations(providerId, pubId, { cache = true } = {}) {
    const provider = this.getProviderOrFail(providerId);

    return provider.getCitations(pubId, { cache: cache });
  }
}
