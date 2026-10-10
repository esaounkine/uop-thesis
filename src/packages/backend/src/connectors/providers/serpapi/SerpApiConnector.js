import { directFetchTtlMs, searchTtlMs, serpapiApiKeys, serpapiBaseUrl } from '../../../config/env.js';
import { HttpClient, HttpError } from '../../../lib/HttpClient.js';
import { ProviderConnector } from '../../ProviderConnector.js';
import { convertSerpApiArticleToPublication, convertSerpApiProfileToAuthor, convertSerpApiResultToPublication } from './converters.js';

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
   * @param {string[]} [args.apiKeys] - pool of API keys
   */
  constructor({
    httpClient = new HttpClient(),
    baseUrl = serpapiBaseUrl,
    apiKeys = serpapiApiKeys,
  } = {}) {
    super();
    this.httpClient = httpClient;
    this.baseUrl = baseUrl;
    this.apiKeys = apiKeys;
    this.keyIndex = 0;
    this.exhaustedKeys = new Set();
  }

  /**
   * @returns {string | undefined} the key in use
   */
  get apiKey() {
    return this.apiKeys[this.keyIndex];
  }

  /**
   * The engine `google_scholar_profiles` is discontinued (https://serpapi.com/google-scholar-profiles-api).
   * The engine `google_scholar` returns the "User profiles for ..." block
   * (`profiles.authors`) containing a PREVIEW of author profiles for a name query.
   *
   * @see https://serpapi.com/google-scholar-api
   * @param {string} name
   */
  async searchAuthors(name) {
    const data = await this.fetchJson('/search.json', {
      engine: 'google_scholar',
      q: name,
    }, searchTtlMs);
    return (data.profiles?.authors ?? []).map((author) =>
      convertSerpApiProfileToAuthor(author));
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
    return convertSerpApiProfileToAuthor({
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
        convertSerpApiArticleToPublication(article, authorId, data.author),
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
        convertSerpApiResultToPublication(result),
    );
  }

  /**
   * Account usage of every key in the pool.
   * Never cached.
   * The account endpoint is free and does not count towards the quota.
   *
   * @see https://serpapi.com/account-api
   * @returns {Promise<Object[] | null>} one entry per key; null when no API key provided
   */
  async getQuota() {
    if (!this.apiKeys.length) {
      return null;
    }

    return Promise.all(this.apiKeys.map(async (apiKey) => {
      return {
        apiKey: apiKey,
        current: apiKey === this.apiKey,
        exhausted: this.exhaustedKeys.has(apiKey),
        ...await this.fetchKeyQuota(apiKey),
      };
    }));
  }

  /**
   * @param {string} apiKey
   * @returns {Promise<Object>}
   */
  async fetchKeyQuota(apiKey) {
    const data = await this.fetchJsonWithKey('/account.json', {}, null, apiKey);

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
    // one attempt per key at most
    // so a pool of exhausted keys would not enter an endless loop
    for (let attempt = 1; ; attempt += 1) {
      const apiKey = this.apiKey;

      try {
        return await this.fetchJsonWithKey(path, params, ttl, apiKey);
      } catch (error) {
        const isRateLimited = error instanceof HttpError
          && error.status === 429;

        if (!isRateLimited || attempt >= this.apiKeys.length) {
          throw error;
        }

        if (!await this.switchKey(apiKey)) {
          throw error;
        }
      }
    }
  }

  /**
   * Called after a 429. Marks the key exhausted when it has no searches left
   * (to avoid the hourly cap, the key is still usable), then moves to the
   * next usable key.
   *
   * @param {string} apiKey - the key that just received 429
   * @returns {Promise<boolean>} false when no usable key is left
   */
  async switchKey(apiKey) {
    // a concurrent request has already shifted away from this key
    if (apiKey !== this.apiKey) {
      return true;
    }

    const quota = await this.fetchKeyQuota(apiKey).catch(() =>
      null);

    if (quota?.creditsRemaining === 0) {
      this.exhaustedKeys.add(apiKey);
    }

    for (let step = 1; step <= this.apiKeys.length; step += 1) {
      const index = (this.keyIndex + step) % this.apiKeys.length;

      if (!this.exhaustedKeys.has(this.apiKeys[index])) {
        this.keyIndex = index;

        return this.apiKeys[index] !== apiKey;
      }
    }

    return false;
  }

  /**
   * @param {string} path
   * @param {Object} params
   * @param {number|null} ttl - transient param for HttpClient.getJson
   * @param {string} [apiKey]
   * @returns {Promise<any>} the response body
   */
  async fetchJsonWithKey(path, params, ttl, apiKey) {
    const url = new URL(path, this.baseUrl);

    const { data } = await this.httpClient.getJson(
      url,
      ttl,
      {},
      {
        ...params,
        ...apiKey && {
          api_key: {
            value: apiKey,
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
   * @param {number|null} ttl - cache lifetime in ms
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
