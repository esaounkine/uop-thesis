import { citationsTtlMs, metadataTtlMs, openAlexApiKey, openAlexBaseUrl } from '../../config/env.js';
import { HttpClient } from '../../lib/HttpClient.js';
import { normalise } from '../../lib/normalise.js';
import { ProviderConnector } from '../ProviderConnector.js';

const PER_PAGE = 200; // OpenAlex maximum

// 'https://openalex.org/W123' -> 'W123'
const shortId = (id) =>
  (id
    ? id.split('/').pop()
    : id);

/**
 * OpenAlex provider connector.
 */
export class OpenAlexConnector extends ProviderConnector {
  id = 'openalex';

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

  async searchAuthors(name) {
    const data = await this.fetchJson('/authors', {
      search: name,
    }, citationsTtlMs);
    return data.results.map((author) =>
      this.toAuthor(author));
  }

  async getAuthorById(id) {
    const author = await this.fetchJson(`/authors/${id}`, {}, metadataTtlMs);
    return this.toAuthor(author);
  }

  async getAuthorPublications(authorId) {
    return this.fetchAllPages('/works', {
      filter: `author.id:${authorId}`,
    }, citationsTtlMs, (work) =>
      this.toPublication(work));
  }

  async getPublication(id) {
    const work = await this.fetchJson(`/works/${id}`, {}, metadataTtlMs);
    return this.toPublication(work);
  }

  async getCitations(pubId) {
    return this.fetchAllPages('/works', {
      filter: `cites:${pubId}`,
    }, citationsTtlMs, (work) =>
      this.toPublication(work));
  }

  async getContributions(pubId) {
    const work = await this.fetchJson(`/works/${pubId}`, {}, metadataTtlMs);
    return work.authorships.map((entry, index) => {
      return {
        pubId: pubId,
        authorId: shortId(entry.author.id),
        position: index + 1, // OpenAlex returns them in order
      };
    });
  }

  /**
   * @param {string} path
   * @param {Object} params
   * @param {number} ttl - cache lifetime in ms
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
        per_page: PER_PAGE,
      }, ttl);

      data.results.forEach((item) =>
        items.push(map(item)));
      cursor = data.meta?.next_cursor ?? null;
    }

    return items;
  }

  toPublication(work) {
    return {
      pubId: shortId(work.id),
      title: work.title,
      normalisedTitle: normalise(work.title),
      externalId: work.doi ?? null,
    };
  }

  toAuthor(author) {
    return {
      authorId: shortId(author.id),
      originalName: author.display_name,
      normalisedName: normalise(author.display_name),
    };
  }
}
