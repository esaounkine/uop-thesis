import { ApiError } from '../lib/api.js';

export class AbstractService {
  constructor(providers) {
    this.providers = providers;
  }

  /**
   * Match the requested provider by ID or fail with and error 404.
   *
   * @param {string} providerId
   * @returns {import('../../connectors/ProviderConnector.js').ProviderConnector} provider
   */
  getProviderOrFail(providerId) {
    const provider = this.providers.find((p) =>
      p.id === providerId);

    if (!provider) {
      throw new ApiError(404, `unknown provider: ${providerId}`);
    }

    return provider;
  }
}
