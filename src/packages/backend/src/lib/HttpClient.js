import { httpMaxRetries, httpRetryBaseMs } from '../config/env.js';

const createCacheKeyFromUrl = (url) => {
  const normalised = new URL(url);
  normalised.searchParams.sort();
  return normalised.toString();
};

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isTransient = (status) =>
  status === 429 || status >= 500;

/**
 * UserAgent for HTTP requests.
 * Wrapper around the standard node `fetch`, plus a read-through cache and
 * retries with backoff on transient responses (429, 5xx).
 */
export class HttpClient {
  /**
   * @param {Object} [args]
   * @param {typeof fetch} [args.fetchImpl]
   * @param {import('../repositories/CacheRepository.js').CacheRepository} [args.cache]
   * @param {{ add: (task: () => Promise<any>) => Promise<any> }} [args.queue] - paces requests (e.g. p-queue)
   * @param {number} [args.maxRetries]
   * @param {number} [args.retryBaseMs]
   * @param {(ms: number) => Promise<void>} [args.sleepFn]
   */
  constructor({
    fetchImpl = fetch,
    cache,
    queue,
    maxRetries = httpMaxRetries,
    retryBaseMs = httpRetryBaseMs,
    sleepFn = sleep,
  } = {}) {
    this.fetch = fetchImpl;
    this.cache = cache;
    this.queue = queue;
    this.maxRetries = maxRetries;
    this.retryBaseMs = retryBaseMs;
    this.sleep = sleepFn;
  }

  /**
   * @param {string|URL} url
   * @param {number} [ttl] - cache lifetime in ms; undefined = forever
   * @param {Object} [headers] - additional headers to inject into the request
   * @returns {Promise<{ data: any, fetchedAt: Date }>}
   * @throws Error
   */
  async getJson(url, ttl, headers) {
    const key = createCacheKeyFromUrl(url);
    const hit = this.cache?.get(key, ttl);

    if (hit) {
      return {
        data: hit.value,
        fetchedAt: hit.fetchedAt,
      };
    }

    const response = await this.request(url, headers, 0);
    const data = await response.json();
    const fetchedAt = this.cache?.put(key, data) ?? new Date();

    return {
      data: data,
      fetchedAt: fetchedAt,
    };
  }

  /**
   * Fetches url, retrying on a transient status with a backoff.
   *
   * @param {string|URL} url
   * @param {Object} [headers]
   * @param {number} attempt
   * @returns {Promise<Response>}
   * @throws Error on a non-ok response once retries are exhausted
   */
  async request(url, headers, attempt) {
    const response = await this.runFetch(url, headers);

    if (isTransient(response.status) && attempt < this.maxRetries) {
      await this.sleep(this.retryDelayMs(response, attempt));
      return this.request(url, headers, attempt + 1);
    }

    if (!response.ok) {
      throw new Error(`Request to ${url} failed with ${response.status}`);
    }

    return response;
  }

  /**
   * Runs the fetch through the queue when one is set, so requests are paced.
   *
   * @param {string|URL} url
   * @param {Object} [headers]
   * @returns {Promise<Response>}
   */
  runFetch(url, headers) {
    const task = () =>
      this.fetch(url, {
        headers: {
          ...(headers ?? {}),
        },
      });

    return this.queue
      ? this.queue.add(task)
      : task();
  }

  /**
   * @param {Response} response
   * @param {number} attempt
   * @returns {number} the delay in ms - the Retry-After header, or an exponential backoff with jitter
   */
  retryDelayMs(response, attempt) {
    const retryAfterSeconds = Number(response.headers?.get?.('retry-after'));

    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
      return retryAfterSeconds * 1000;
    }

    const backoff = this.retryBaseMs * (2 ** attempt);
    const jitter = Math.random() * this.retryBaseMs;
    return backoff + jitter;
  }
}
