import { ApiError } from '../lib/api.js';

/**
 * Controller for author lookups against a single provider.
 */
export class AuthorController {
  /**
   *
   * @param {import('../services/AuthorService.js').AuthorService} authorService
   * @param {import('../service/CitationGraphService.js').CitationGraphService} citationGraphService
   * @param {import('../service/ClassificationService.js').ClassificationService} classificationService
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
   *
   * @param {Object} params
   * @param {string} params.provider
   * @param {string} params.authorId
   * @returns {Promise<{papers: Publication[]}>}
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
   * Get stored metrics graph for an author.
   *
   * @param {Object} params
   * @param {string} params.provider
   * @param {string} params.authorId
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
