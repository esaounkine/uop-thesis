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
   * @see https://github.com/ourresearch/openalex-docs/blob/main/api-entities/works/search-works.md
   */
  async searchPublications(name) {
    const data = await this.fetchJson('/works', {
      search: name,
    }, searchTtlMs);
    return data.results.map((work) =>
      this.toPublication(work));
  }

  /**
   * @see https://github.com/ourresearch/openalex-docs/blob/main/api-entities/authors/get-a-single-author.md
   */
  async getAuthorById(id) {
    const author = await this.fetchJson(`/authors/${id}`, {}, directFetchTtlMs);
    return this.toAuthor(author);
  }

  /**
   * @see https://github.com/ourresearch/openalex-docs/blob/main/api-entities/works/filter-works.md
   */
  async getAuthorPublications(authorId) {
    return this.fetchAllPages('/works', {
      filter: `author.id:${authorId}`,
    }, searchTtlMs, (work) =>
      this.toPublication(work));
  }

  /**
   * @see https://github.com/ourresearch/openalex-docs/blob/main/api-entities/works/get-a-single-work.md
   */
  async getPublication(id) {
    const work = await this.fetchJson(`/works/${id}`, {}, directFetchTtlMs);
    return this.toPublication(work);
  }

  /**
   * @see https://github.com/ourresearch/openalex-docs/blob/main/api-entities/works/filter-works.md
   */
  async getCitations(pubId) {
    return this.fetchAllPages('/works', {
      filter: `cites:${pubId}`,
    }, searchTtlMs, (work) =>
      this.toPublication(work));
  }

  /**
   * @see https://github.com/ourresearch/openalex-docs/blob/main/api-entities/works/work-object/authorship-object.md
   */
  async getContributions(pubId) {
    const work = await this.fetchJson(`/works/${pubId}`, {}, directFetchTtlMs);
    return work.authorships
      .map((entry, index) => {
        return {
          pubId: pubId,
          authorId: OpenAlexConnector.extractShortId(entry.author?.id),
          position: index + 1, // OpenAlex returns them in the order of appearance
        };
      })
      // author.id might be null if:
      // - there's raw_author_name, but no id, when the author is unmatched
      // - new records that have not assigned an author id yet
      // - group authors publishing as a collective
      // - maybe other cases of missing or low quality data
      // we just drop these contribution records
      .filter((contribution) =>
        contribution.authorId != null);
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
    };
  }

  toAuthor(author) {
    return {
      authorId: OpenAlexConnector.extractShortId(author.id),
      originalName: author.display_name,
      normalisedName: normalise(author.display_name),
    };
  }
}
