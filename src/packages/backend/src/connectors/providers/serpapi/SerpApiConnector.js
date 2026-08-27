import { directFetchTtlMs, searchTtlMs, serpapiApiKey, serpapiBaseUrl } from '../../../config/env.js';
import { HttpClient } from '../../../lib/HttpClient.js';
import { ProviderConnector } from '../../ProviderConnector.js';
import { serpApiArticleToPublication, serpApiProfileToAuthor, serpApiResultToPublication } from './converters.js';

/**
 * SerpApi provider connector.
 */
export class SerpApiConnector extends ProviderConnector {
  id = 'serpapi';

  static ARTICLES_PER_PAGE = 100; // google_scholar_author maximum

  static CITES_PER_PAGE = 20; // google_scholar maximum

  /**
   * @param {Object} [args]
   * @param {HttpClient} [args.httpClient]
   * @param {string} [args.baseUrl]
   * @param {string} [args.apiKey]
   */
  constructor({
    httpClient = new HttpClient(),
    baseUrl = serpapiBaseUrl,
    apiKey = serpapiApiKey,
  } = {}) {
    super();
    this.httpClient = httpClient;
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * The engine `google_scholar_profiles` is discontinued (https://serpapi.com/google-scholar-profiles-api).
   * The engine `google_scholar` returns the "User profiles for ..." block
   * (`profiles.authors`) containing a PREVIEW of author profiles for a name query.
   *
   * @see https://serpapi.com/google-scholar-api
   */
  async searchAuthors(name) {
    const data = await this.fetchJson('/search.json', {
      engine: 'google_scholar',
      q: name,
    }, searchTtlMs);
    return (data.profiles?.authors ?? []).map((author) =>
      serpApiProfileToAuthor(author));
  }

  /**
   * @see https://serpapi.com/google-scholar-author-api
   * @param {string} id
   * @param {Object} [options]
   * @param {boolean} [options.cache] - true = use, false = skip the cache
   */
  async getAuthorById(id, { cache = true } = {}) {
    const data = await this.fetchJson('/search.json', {
      engine: 'google_scholar_author',
      author_id: id,
    }, cache
      ? directFetchTtlMs
      : null);
    return serpApiProfileToAuthor({
      author_id: id,
      ...data.author,
    });
  }

  /**
   * @see https://serpapi.com/google-scholar-author-api
   * @param {string} authorId
   * @param {Object} [options]
   * @param {boolean} [options.cache] - true = use, false = skip the cache
   */
  async getAuthorPublications(authorId, { cache = true } = {}) {
    return this.fetchAllPages(
      '/search.json',
      {
        engine: 'google_scholar_author',
        author_id: authorId,
      },
      cache
        ? searchTtlMs
        : null,
      SerpApiConnector.ARTICLES_PER_PAGE,
      (data) =>
        (data.articles ?? []),
      (article, data) =>
        serpApiArticleToPublication(article, authorId, data.author),
    );
  }

  /**
   * @see https://serpapi.com/google-scholar-api
   * @param {string} pubId - the cited paper's Scholar cluster id (`cites_id`)
   * @param {Object} [options]
   * @param {boolean} [options.cache] - true = use, false = skip the cache
   */
  async getCitations(pubId, { cache = true } = {}) {
    return this.fetchAllPages(
      '/search.json',
      {
        engine: 'google_scholar',
        cites: pubId,
      },
      cache
        ? searchTtlMs
        : null,
      SerpApiConnector.CITES_PER_PAGE,
      (data) =>
        (data.organic_results ?? []),
      (result) =>
        serpApiResultToPublication(result),
    );
  }

  /**
   * Account usage for the SerpApi key. Never cached.
   * The account endpoint is free and does not count against the quota.
   *
   * @see https://serpapi.com/account-api
   * @returns {Promise<Object | null>} null when no API key provided
   */
  async getQuota() {
    if (!this.apiKey) {
      return null;
    }

    const data = await this.fetchJson('/account.json', {}, null);

    return {
      creditsLimit: data.searches_per_month ?? null,
      creditsUsed: data.this_month_usage ?? null,
      creditsRemaining: data.total_searches_left ?? null,
      resetsAt: data.plan_renewal_date ?? null,
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
      {},
      {
        ...params,
        ...this.apiKey && {
          api_key: {
            value: this.apiKey,
            secret: true,
          },
        },
      },
    );
    return data;
  }

  /**
   * Traverses the `start`/`num` offset paging until SerpApi stops
   * reporting next page.
   *
   * @param {string} path
   * @param {Object} params
   * @param {number} ttl - cache lifetime in ms
   * @param {number} pageSize
   * @param {(data: any) => any[]} getPageItemsFn - the page's items
   * @param {(item: any, data: any) => any} itemConversionFn
   * @returns {Promise<any[]>}
   */
  async fetchAllPages(
    path,
    params,
    ttl,
    pageSize,
    getPageItemsFn,
    itemConversionFn,
  ) {
    const items = [];
    let start = 0;
    let hasMore = true;

    while (hasMore) {
      const data = await this.fetchJson(path, {
        ...params,
        num: pageSize,
        start: start,
      }, ttl);

      getPageItemsFn(data).forEach((item) =>
        items.push(itemConversionFn(item, data)));

      hasMore = Boolean(data.serpapi_pagination?.next);
      start += pageSize;
    }

    return items;
  }
}
