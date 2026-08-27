import {
  openAlexApiKey,
  openAlexMaxPerSecond,
  semanticScholarApiKey,
  semanticScholarMaxPerSecond,
} from '../../config/env.js';
import { OpenAlexConnector } from './OpenAlexConnector.js';
import { SemanticScholarConnector } from './SemanticScholarConnector.js';

const REGISTRY = {
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
export const listProviders = () =>
  Object.keys(REGISTRY);

/**
 * Looks provider up by id.
 *
 * @param {string} id
 * @returns {{ requestsPerSecond: number, apiKey: string | undefined, create: (httpClient: import('../../lib/HttpClient.js').HttpClient) => import('../ProviderConnector.js').ProviderConnector }}
 */
export const getProviderOrFail = (id) => {
  const spec = REGISTRY[id];

  if (!spec) {
    throw new Error(`Unknown provider "${id}". Known providers: ${listProviders().join(', ')}`);
  }

  return spec;
};
