import { ApiError } from '../lib/api.js';

const CANDIDATE_LIMIT = 10;

export class SearchController {
  constructor(providers) {
    this.providers = providers;
  }

  searchPapers({ query }) {
    return this.collect(
      query,
      'papers',
      (provider, term) =>
        provider.publications.searchByName(term));
  }

  searchAuthors({ query }) {
    return this.collect(
      query,
      'authors',
      (provider, term) =>
        provider.authors.searchByName(term));
  }

  collect(query, key, search) {
    const term = query.q;

    if (!term) {
      throw new ApiError(400, 'missing query parameter q');
    }

    return Promise.all(this.providers.map(async (provider) => {
      try {
        return {
          provider: provider.id,
          [key]: (await search(provider, term)).slice(0, CANDIDATE_LIMIT),
        };
      } catch (error) {
        return {
          provider: provider.id,
          error: error.message,
        };
      }
    }));
  }
}
