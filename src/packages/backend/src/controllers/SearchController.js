import { ApiError } from '../lib/api.js';

const CANDIDATE_LIMIT = 10;

export class SearchController {
  constructor(providers, jobs) {
    this.providers = providers;
    this.jobs = jobs;
  }

  searchAuthors({ query }) {
    const term = query.q;

    if (!term) {
      throw new ApiError(400, 'missing query parameter q');
    }

    return Promise.all(this.providers.map(async (provider) => {
      try {
        const authors = (await provider.authors.searchByName(term))
          .slice(0, CANDIDATE_LIMIT);

        return {
          provider: provider.id,
          authors: authors.map((author) => {
            const stored = this.jobs.getStored(provider.id, author.authorId);

            return {
              ...author,
              storedAt: stored?.updatedAt ?? null,
            };
          }),
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
