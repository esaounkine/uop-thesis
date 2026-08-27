/** @typedef {import('../../db/schema.js').Publication} Publication */

import { AbstractService } from '../AbstractService.js';

export class AuthorService extends AbstractService {
  /**
   * @param {import('../../connectors/ProviderConnector.js').ProviderConnector[]} providers
   * @param {import('../jobs/JobService.js').JobService} jobService
   */
  constructor(providers, jobService) {
    super(providers);

    this.jobService = jobService;
  }

  /**
   * Authors with name matching the search term under all enabled providers.
   *
   * @param {string} name
   * @returns {Promise<import('../../db/schema.js').Author[]>}
   */
  async searchByName(name) {
    return Promise.all(
      this.providers.map(async (provider) => {
        try {
          const authors = await provider.searchAuthors(name);

          const res = authors.map((author) => {
            const stored = this.jobService
              .getLastUpdateJob(provider.id, author.authorId);

            return {
              ...author,
              storedAt: stored?.updatedAt ?? null,
            };
          });

          return {
            provider: provider.id,
            authors: res,
          };
        } catch (error) {
          return {
            provider: provider.id,
            error: error.message,
          };
        }
      }));
  }

  /**
   * @param {string} providerId
   * @param {string} authorId
   * @param {Object} [options]
   * @param {boolean} [options.cache] - true = use, false = skip the cache
   * @returns {Promise<null | {
   *   author: Author,
   *   publications: Publication[],
   * }>} null when the author is not found
   */
  async getProviderPublications(
    providerId,
    authorId,
    { cache = true } = {},
  ) {
    const provider = this.getProviderOrFail(providerId);

    const author = await provider
      .getAuthorById(authorId, { cache: cache });

    if (!author) {
      return null;
    }

    const publications = await provider
      .getAuthorPublications(authorId, { cache: cache });

    return {
      author: author,
      publications: publications,
    };
  }
}
