import { ApiError } from '../lib/api.js';

/**
 * Controller for author lookups against a single provider.
 */
export class AuthorController {
  /**
   * @param {import('../services/author/AuthorService.js').AuthorService} authorService
   * @param {import('../services/citation-graph/CitationGraphService.js').CitationGraphService} citationGraphService
   * @param {import('../services/classification/ClassificationService.js').ClassificationService} classificationService
   */
  constructor(
    authorService,
    citationGraphService,
    classificationService,
  ) {
    this.authorService = authorService;
    this.citationGraphService = citationGraphService;
    this.classificationService = classificationService;
  }

  /**
   * @param {Object} request
   * @returns {Promise<Object>}
   * @throws {ApiError} When the author is not found.
   */
  async getAuthor({ params }) {
    const author = await this.authorService
      .getProviderAuthor(params.provider, params.authorId);

    if (!author) {
      throw new ApiError(404, `author not found: ${params.authorId}`);
    }

    return { author: author };
  }

  /**
   * @param {Object} request
   * @param {Object} request.params
   * @param {string} request.params.provider
   * @param {string} request.params.authorId
   * @returns {Promise<Object>}
   * @throws {ApiError} When the author is not found.
   */
  async getAuthorPapers({ params }) {
    const result = await this.authorService
      .getProviderPublications(params.provider, params.authorId);

    if (!result) {
      throw new ApiError(404, `author not found: ${params.authorId}`);
    }

    return {
      papers: result.publications,
    };
  }

  /**
   * @param {Object} request
   * @param {Object} request.params
   * @param {string} request.params.provider
   * @param {string} request.params.authorId
   * @returns {Object}
   * @throws {ApiError} When no stored author graph exists.
   */
  getStoredMetrics({ params }) {
    const tree = this.citationGraphService
      .getAuthorTree(params.provider, params.authorId);

    if (!tree) {
      throw new ApiError(404, 'no stored metrics for this author under this provider');
    }

    return {
      author: tree.author,
      metrics: this.classificationService.getMetrics(
        tree.publications.flatMap((entry) =>
          entry.citations.map((citation) =>
            citation.classification)),
      ),
      publications: tree.publications,
    };
  }
}
