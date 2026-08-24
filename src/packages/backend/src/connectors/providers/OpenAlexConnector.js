import { directFetchTtlMs, openAlexApiKey, openAlexBaseUrl, searchTtlMs } from '../../config/env.js';
import { HttpClient } from '../../lib/HttpClient.js';
import { normalise } from '../../lib/normalise.js';
import { ProviderConnector } from '../ProviderConnector.js';
import { stripMarkup } from '../../lib/strip-markup.js';

/**
 * OpenAlex provider connector.
 */
export class OpenAlexConnector extends ProviderConnector {
  id = 'openalex';

  static PER_PAGE = 200; // OpenAlex maximum

  // 'https://openalex.org/W123' -> 'W123'
  static extractShortId = (id) =>
    (id
      ? id.split('/').pop()
      : id);

  static toContributions = (work) =>
    (work.authorships ?? [])
      .map((entry, index) => {
        return {
          pubId: OpenAlexConnector.extractShortId(work.id),
          authorId: OpenAlexConnector.extractShortId(entry.author?.id),
          authorName: entry.author?.display_name ?? null,
          organisation: entry.institutions?.[0]?.display_name ?? null,
          position: index + 1, // OpenAlex returns them in the order of appearance
        };
      })
      // author.id might be null if:
      // - there's raw_author_name, but no id, when the author is unmatched
      // - new records that have not assigned an author id yet
      // - group authors publishing as a collective
      // - maybe other cases of missing or low quality data
      // We just drop these contribution records
      // Currently, it is required to drop unmatched names,
      // to avoid `null` skewing the stats.
      // TODO fix to use normalised-lemmatised-enriched name instead of the id
      .filter((contribution) =>
        contribution.authorId != null);

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
   */
  async searchAuthors(name) {
    const data = await this.fetchJson('/authors', {
      search: name,
    }, searchTtlMs);
    return data.results.map((author) =>
      this.toAuthor(author));
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
    return this.toAuthor(author);
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
      this.toPublication(work));
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
      this.toPublication(work));
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
    const search = { ...params };

    url.search = new URLSearchParams(search).toString();

    const { data } = await this.httpClient.getJson(url, ttl, {
      ...this.apiKey && {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
    return data;
  }

  /**
   * Follows the cursor to fetch all pages.
   *
   * @param {string} path
   * @param {Object} params
   * @param {number} ttl - cache lifetime in ms
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

  toPublication(work) {
    const title = stripMarkup(work.title);

    return {
      pubId: OpenAlexConnector.extractShortId(work.id),
      title: title,
      normalisedTitle: normalise(title),
      externalId: work.doi ?? null,
      year: work.publication_year ?? null,
      citationCount: work.cited_by_count ?? null,
      contributions: OpenAlexConnector.toContributions(work),
    };
  }

  toAuthor(author) {
    return {
      authorId: OpenAlexConnector.extractShortId(author.id),
      originalName: author.display_name,
      normalisedName: normalise(author.display_name),
      organisation: author.last_known_institutions?.[0]?.display_name ?? null,
    };
  }
}
