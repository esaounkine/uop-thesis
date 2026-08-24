import { directFetchTtlMs, searchTtlMs, semanticScholarApiKey, semanticScholarBaseUrl } from '../../config/env.js';
import { HttpClient } from '../../lib/HttpClient.js';
import { normalise } from '../../lib/normalise.js';
import { ProviderConnector } from '../ProviderConnector.js';
import { stripMarkup } from '../../lib/strip-markup.js';

/**
 * Semantic Scholar provider connector.
 */
export class SemanticScholarConnector extends ProviderConnector {
  id = 'semanticscholar';

  static PAGE_LIMIT = 1000; // max for citations and author-papers endpoints

  static SEARCH_LIMIT = 100; // max for search endpoints

  static PAPER_FIELDS = 'title,year,externalIds,authors,citationCount';

  static AUTHOR_FIELDS = 'name,externalIds,homepage,paperCount,affiliations,papers';

  static toContributions = (paper) =>
    (paper.authors ?? [])
      .map((author, index) => {
        return {
          pubId: paper.paperId,
          authorId: author.authorId,
          authorName: author.name ?? null,
          position: index + 1, // Semantic Scholar returns them in the order of appearance
        };
      })
      // authorId might be null if:
      // - no id, when the author is unmatched
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
    baseUrl = semanticScholarBaseUrl,
    apiKey = semanticScholarApiKey,
  } = {}) {
    super();
    this.httpClient = httpClient;
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * @see https://api.semanticscholar.org/api-docs/#tag/Author-Data/operation/get_graph_get_author_search
   */
  async searchAuthors(name) {
    const data = await this.fetchJson('/author/search', {
      query: name,
      fields: SemanticScholarConnector.AUTHOR_FIELDS,
      limit: SemanticScholarConnector.SEARCH_LIMIT,
    }, searchTtlMs);
    return (data.data ?? []).map((author) =>
      this.toAuthor(author));
  }

  /**
   * @see https://api.semanticscholar.org/api-docs/#tag/Author-Data/operation/get_graph_get_author
   * @param {string} id
   * @param {Object} [options]
   * @param {boolean} [options.cache] - true = use, false = skip the cache
   */
  async getAuthorById(id, { cache = true } = {}) {
    const author = await this.fetchJson(`/author/${id}`, {
      fields: SemanticScholarConnector.AUTHOR_FIELDS,
    }, cache
      ? directFetchTtlMs
      : null);
    return this.toAuthor(author);
  }

  /**
   * @see https://api.semanticscholar.org/api-docs/#tag/Author-Data/operation/get_graph_get_author_papers
   * @param {string} authorId
   * @param {Object} [options]
   * @param {boolean} [options.cache] - true = use, false = skip the cache
   */
  async getAuthorPublications(authorId, { cache = true } = {}) {
    return this.fetchAllPages(`/author/${authorId}/papers`, {
      fields: SemanticScholarConnector.PAPER_FIELDS,
    }, cache
      ? searchTtlMs
      : null, (paper) =>
      this.toPublication(paper));
  }

  /**
   * @see https://api.semanticscholar.org/api-docs/#tag/Paper-Data/operation/get_graph_get_paper_citations
   * @param {string} pubId
   * @param {Object} [options]
   * @param {boolean} [options.cache] - true = use, false = skip the cache
   */
  async getCitations(pubId, { cache = true } = {}) {
    const citing = await this.fetchAllPages(`/paper/${pubId}/citations`, {
      fields: SemanticScholarConnector.PAPER_FIELDS,
    }, cache
      ? searchTtlMs
      : null, (item) =>
      item.citingPaper);
    // paperId might be `null` if the paper does not belong to the Semantic Scholar corpus.
    // We just drop them.
    return citing
      .filter((paper) =>
        paper?.paperId != null)
      .map((paper) =>
        this.toPublication(paper));
  }

  /**
   * @param {string} path
   * @param {Object} params
   * @param {number} ttl - cache lifetime in ms
   * @returns {Promise<any>} the response body
   */
  async fetchJson(path, params, ttl) {
    const url = new URL(`${this.baseUrl}${path}`);

    url.search = new URLSearchParams(params).toString();

    const { data } = await this.httpClient.getJson(url, ttl, {
      ...this.apiKey && {
        'x-api-key': this.apiKey,
      },
    });
    return data;
  }

  /**
   * Follows the offset paging until the results are exhausted.
   *
   * @param {string} path
   * @param {Object} params
   * @param {number} ttl - cache lifetime in ms
   * @param {(item: any) => any} map
   * @returns {Promise<any[]>}
   */
  async fetchAllPages(path, params, ttl, map) {
    const items = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const data = await this.fetchJson(path, {
        ...params,
        offset: offset,
        limit: SemanticScholarConnector.PAGE_LIMIT,
      }, ttl);

      (data.data ?? []).forEach((item) =>
        items.push(map(item)));

      hasMore = data.next != null;
      offset = data.next;
    }

    return items;
  }

  toPublication(paper) {
    const title = stripMarkup(paper.title);

    return {
      pubId: paper.paperId,
      title: title,
      normalisedTitle: normalise(title),
      externalId: paper.externalIds?.DOI ?? null,
      year: paper.year ?? null,
      citationCount: paper.citationCount ?? null,
      contributions: SemanticScholarConnector.toContributions(paper),
    };
  }

  toAuthor(author) {
    return {
      authorId: author.authorId,
      originalName: author.name,
      normalisedName: normalise(author.name),
      organisation: author.affiliations?.[0] ?? null,
    };
  }
}
