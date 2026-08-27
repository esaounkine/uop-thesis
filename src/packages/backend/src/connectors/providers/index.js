import {
  openAlexApiKey,
  openAlexMaxPerSecond,
  semanticScholarApiKey,
  semanticScholarMaxPerSecond,
} from '../../config/env.js';
import { OpenAlexConnector } from './OpenAlexConnector.js';
import { SemanticScholarConnector } from './SemanticScholarConnector.js';

const PROVIDER_SPEC_REGISTRY = {
  openalex: {
    requestsPerSecond: openAlexMaxPerSecond,
    apiKey: openAlexApiKey,
    create: (httpClient) =>
      new OpenAlexConnector({
        httpClient: httpClient,
      }),
  },
  semanticscholar: {
    requestsPerSecond: semanticScholarMaxPerSecond,
    apiKey: semanticScholarApiKey,
    create: (httpClient) =>
      new SemanticScholarConnector({
        httpClient: httpClient,
      }),
  },
};

/**
 * @returns {string[]} every registered provider id
 */
export const listProviderSpecs = () =>
  Object.keys(PROVIDER_SPEC_REGISTRY);

/**
 * Looks provider up by id.
 *
 * @param {string} id
 * @returns {{ requestsPerSecond: number, apiKey: string | undefined, create: (httpClient: import('../../lib/HttpClient.js').HttpClient) => import('../ProviderConnector.js').ProviderConnector }}
 */
export const getProviderSpecOrFail = (id) => {
  const spec = PROVIDER_SPEC_REGISTRY[id];

  if (!spec) {
    throw new Error(`Unknown provider "${id}". Known providers: ${listProviderSpecs().join(', ')}`);
  }

  return spec;
};
