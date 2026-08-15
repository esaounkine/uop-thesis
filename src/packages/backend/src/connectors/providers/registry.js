import { openAlexMaxPerSecond, semanticScholarMaxPerSecond } from '../../config/env.js';
import { OpenAlexConnector } from './OpenAlexConnector.js';
import { SemanticScholarConnector } from './SemanticScholarConnector.js';

const REGISTRY = {
  openalex: {
    requestsPerSecond: openAlexMaxPerSecond,
    create: (httpClient) =>
      new OpenAlexConnector({
        httpClient: httpClient,
      }),
  },
  semanticscholar: {
    requestsPerSecond: semanticScholarMaxPerSecond,
    create: (httpClient) =>
      new SemanticScholarConnector({
        httpClient: httpClient,
      }),
  },
};

/**
 * Looks provider up by id. Only one provider is active at a time.
 *
 * @param {string} id
 * @returns {{ requestsPerSecond: number, create: (httpClient: import('../../lib/HttpClient.js').HttpClient) => import('../ProviderConnector.js').ProviderConnector }}
 */
export const selectProvider = (id) => {
  const spec = REGISTRY[id];

  if (!spec) {
    throw new Error(`Unknown provider "${id}". Known providers: ${Object.keys(REGISTRY).join(', ')}`);
  }

  return spec;
};
