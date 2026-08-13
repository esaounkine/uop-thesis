const createCacheKeyFromUrl = (url) => {
  const normalised = new URL(url);
  normalised.searchParams.sort();
  return normalised.toString();
};

/**
 * UserAgent for HTTP requests.
 * Wrapper around the standard node `fetch`, plus a read-through cache.
 */
export class HttpClient {
  /**
   * @param {Object} [args]
   * @param {typeof fetch} [args.fetchImpl]
   * @param {import('../repositories/CacheRepository.js').CacheRepository} [args.cache]
   */
  constructor({
    fetchImpl = fetch,
    cache,
  } = {}) {
    this.fetch = fetchImpl;
    this.cache = cache;
  }

  /**
   * @param {string|URL} url
   * @param {number} [ttl] - cache lifetime in ms; undefined = forever
   * @param headers {Object} - additional headers to inject into the request
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

    const response = await this.fetch(url, {
      headers: {
        ...(headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Request to ${url} failed with ${response.status}`);
    }

    const data = await response.json();
    const fetchedAt = this.cache?.put(key, data) ?? new Date();

    return {
      data: data,
      fetchedAt: fetchedAt,
    };
  }
}
