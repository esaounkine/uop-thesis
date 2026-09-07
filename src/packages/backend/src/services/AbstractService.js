import { ApiError } from '../lib/api.js';

export class AbstractService {
  constructor(providers) {
    this.providers = providers;
  }

  /**
   * @param {string} providerId
   * @returns {import('../connectors/ProviderConnector.js').ProviderConnector}
   * @throws {ApiError} When the provider is unknown.
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
