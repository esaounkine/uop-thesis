import { directFetchTtlMs, openAlexApiKey, openAlexBaseUrl, searchTtlMs } from '../../../config/env.js';
import { HttpClient } from '../../../lib/HttpClient.js';
import { ProviderConnector } from '../../ProviderConnector.js';
import { convertOpenAlexAuthorToAuthor, convertOpenAlexWorkToPublication } from './converters.js';

/**
 * OpenAlex provider connector.
 */
export class OpenAlexConnector extends ProviderConnector {
  id = 'openalex';

  static PER_PAGE = 200; // OpenAlex maximum

  /**
   * @param {Object} [args]
   * @param {HttpClient} [args.httpClient]
   * @param {string} [args.baseUrl]
   * @param {string} [args.apiKey]
   */
  constructor({
    httpClient = new HttpClient(),
    baseUrl = openAlexBaseUrl,
    apiKey = openAlexApiKey,
  } = {}) {
    super();
    this.httpClient = httpClient;
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * @see https://github.com/ourresearch/openalex-docs/blob/main/api-entities/authors/search-authors.md
   * @param {string} name
   */
  async searchAuthors(name) {
    const data = await this.fetchJson('/authors', {
      search: name,
    }, searchTtlMs);
    return data.results.map((author) =>
      convertOpenAlexAuthorToAuthor(author));
  }

  /**
   * @see https://github.com/ourresearch/openalex-docs/blob/main/api-entities/authors/get-a-single-author.md
   * @param {string} id
   * @param {Object} [options]
   * @param {boolean} [options.cache] - true = use, false = skip the cache
   */
  async getAuthorById(id, { cache = true } = {}) {
    const author = await this.fetchJson(`/authors/${id}`, {}, cache
      ? directFetchTtlMs
      : null);
    return convertOpenAlexAuthorToAuthor(author);
  }

  /**
   * @see https://github.com/ourresearch/openalex-docs/blob/main/api-entities/works/filter-works.md
   * @param {string} authorId
   * @param {Object} [options]
   * @param {boolean} [options.cache] - true = use, false = skip the cache
   */
  async getAuthorPublications(authorId, { cache = true } = {}) {
    return this.fetchAllPages('/works', {
      filter: `author.id:${authorId}`,
    }, cache
      ? searchTtlMs
      : null, (work) =>
      convertOpenAlexWorkToPublication(work));
  }

  /**
   * @see https://github.com/ourresearch/openalex-docs/blob/main/api-entities/works/filter-works.md
   * @param {string} pubId
   * @param {Object} [options]
   * @param {boolean} [options.cache] - true = use, false = skip the cache
   */
  async getCitations(pubId, { cache = true } = {}) {
    return this.fetchAllPages('/works', {
      filter: `cites:${pubId}`,
    }, cache
      ? searchTtlMs
      : null, (work) =>
      convertOpenAlexWorkToPublication(work));
  }

  /**
   * Quota for the current API key.
   * Never cached.
   *
   * This request documentation is missing.
   * The request was reverse engineered.
   *
   * @returns {Promise<Object | null>} null when no API key provided
   */
  async getQuota() {
    if (!this.apiKey) {
      return null;
    }

    const data = await this.fetchJson('/rate-limit', {}, null);
    const limit = data.rate_limit ?? {};

    return {
      creditsLimit: limit.credits_limit ?? null,
      creditsUsed: limit.credits_used ?? null,
      creditsRemaining: limit.credits_remaining ?? null,
      resetsAt: limit.resets_at ?? null,
    };
  }

  /**
   * @param {string} path
   * @param {Object} params
   * @param {number|null} ttl - transient param for HttpClient.getJson
   * @returns {Promise<any>} the response body
   */
  async fetchJson(path, params, ttl) {
    const url = new URL(path, this.baseUrl);

    const { data } = await this.httpClient.getJson(
      url,
      ttl,
      {
        ...this.apiKey && {
          Authorization: `Bearer ${this.apiKey}`,
        },
      },
      params,
    );
    return data;
  }

  /**
   * Follows the cursor to fetch all pages.
   *
   * @param {string} path
   * @param {Object} params
   * @param {number|null} ttl - cache lifetime in ms
   * @param {(item: any) => any} map
   * @returns {Promise<any[]>}
   */
  async fetchAllPages(path, params, ttl, map) {
    const items = [];
    let cursor = '*';

    while (cursor) {
      const data = await this.fetchJson(path, {
        ...params,
        cursor: cursor,
        per_page: OpenAlexConnector.PER_PAGE,
      }, ttl);

      data.results.forEach((item) =>
        items.push(map(item)));
      cursor = data.meta?.next_cursor ?? null;
    }

    return items;
  }
}
