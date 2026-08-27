import { RetryStrategy } from './RetryStrategy.js';
import { httpMaxRetries, httpRetryBaseMs } from '../config/env.js';

const createCacheKeyFromUrl = (url, query) => {
  const normalised = new URL(url);

  const sanitisedQuery = Object.fromEntries(
    Object.entries(query)
      .map(([key, value]) =>
        !value?.secret
          ? [key, value]
          : null)
      .filter(Boolean),
  );
  normalised.search = new URLSearchParams(sanitisedQuery).toString();

  normalised.searchParams.sort();
  return normalised.toString();
};

export class HttpError extends Error {
  constructor(response) {
    super(`Request failed with ${response.status}`);
    this.name = 'HttpError';
    this.status = response.status;
    this.retryAfterMs = this.getRetryAfterMs(response);
  }

  getRetryAfterMs = (response) => {
    // The Retry-After header supports two formats: number of seconds, or a date;
    // this function only supports the number of seconds version.
    const seconds = Number(response.headers?.get?.('retry-after'));

    return Number.isFinite(seconds) && seconds > 0
      ? seconds * 1000
      : undefined;
  };
}

const backoffMs = (attempt, baseMs) =>
  baseMs * (2 ** attempt) + Math.random() * baseMs;

const defaultRetryStrategy = new RetryStrategy({
  maxRetries: httpMaxRetries,
  shouldRetry: (error) =>
    error instanceof HttpError && (error.status === 429 || error.status >= 500),
  delayMs: (error, attempt) =>
    error.retryAfterMs ?? backoffMs(attempt, httpRetryBaseMs),
});

/**
 * UserAgent for HTTP requests.
 * Wrapper around the standard node `fetch`, behind a read-through cache.
 */
export class HttpClient {
  /**
   * @param {Object} [args]
   * @param {typeof fetch} [args.fetchImpl]
   * @param {import('../repositories/CacheRepository.js').CacheRepository} [args.cacheRepository]
   * @param {import('./RequestQueue.js').RequestQueue} [args.queue] - paces requests
   * @param {import('./RetryStrategy.js').RetryStrategy} [args.retryStrategy] - overrides the default HTTP retry strategy
   */
  constructor({
    fetchImpl = fetch,
    cacheRepository,
    queue,
    retryStrategy = defaultRetryStrategy,
  } = {}) {
    this.fetch = fetchImpl;
    this.cacheRepository = cacheRepository;
    this.queue = queue;
    this.retryStrategy = retryStrategy;
  }

  /**
   * @param {string|URL} url
   * @param {number|null} [ttl] - cache lifetime in ms; `null` means no cache is needed
   * @param {Object} [headers] - additional headers to inject into the request
   * @param {Object} [query] - query params; wrap a secret value as
   *   `{ value, secret: true }` to keep it out of the cache key
   * @returns {Promise<{ data: any, fetchedAt: Date }>}
   * @throws Error
   */
  async getJson(url, ttl, headers, query = {}) {
    const key = createCacheKeyFromUrl(url, query);

    if (ttl) {
      const hit = this.cacheRepository?.get(key, ttl);

      if (hit) {
        return {
          data: hit.value,
          fetchedAt: hit.fetchedAt,
        };
      }
    }

    // The search string MUST be assigned AFTER the cache key is created
    // as for some providers there's a chance of having API key in the
    // query params.
    const requestUrl = new URL(url);
    requestUrl.search = new URLSearchParams(
      Object.entries(query).map(([param, value]) =>
        [param, value?.value ?? value]),
    ).toString();

    const response = await this.retryStrategy.run(() =>
      this.runFetch(requestUrl, headers));

    const data = await response.json();
    const fetchedAt = this.cacheRepository?.put(key, data) ?? new Date();

    return {
      data: data,
      fetchedAt: fetchedAt,
    };
  }

  /**
   * Fetches url or throws an HttpError.
   *
   * @param {string|URL} url
   * @param {Object} [headers]
   * @returns {Promise<Response>}
   * @throws HttpError
   */
  async runFetch(url, headers) {
    const task = () =>
      this.fetch(url, {
        headers: {
          ...(headers ?? {}),
        },
      });

    const response = await (this.queue
      ? this.queue.add(task)
      : task());

    if (!response.ok) {
      throw new HttpError(response);
    }

    return response;
  }
}
