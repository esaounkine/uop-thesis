import { ApiError } from '../lib/api.js';

/**
 * Controller for author lookups against a single provider.
 */
export class AuthorController {
  constructor(providers) {
    this.providers = providers;
  }

  extractProviderOrFail(params) {
    const provider = this.providers.find((each) =>
      each.id === params.provider);

    if (!provider) {
      throw new ApiError(404, `unknown provider: ${params.provider}`);
    }

    return provider;
  }

  async getAuthorPapers({ params }) {
    const provider = this.extractProviderOrFail(params);

    const result = await provider.authorService
      .getPublications(params.authorId);

    if (!result) {
      throw new ApiError(404, `author not found: ${params.authorId}`);
    }

    return {
      papers: result.publications,
    };
  }

  /**
   * Get stored metrics graph for an author.
   */
  getStoredMetrics({ params }) {
    const provider = this.extractProviderOrFail(params);

    const tree = provider?.citationGraphService
      .getAuthorTree(params.provider, params.authorId);

    if (!tree) {
      throw new ApiError(404, 'no stored metrics for this author');
    }

    return {
      author: tree.author,
      metrics: provider.classificationService.getMetrics(
        tree.publications.flatMap((entry) =>
          entry.citations.map((citation) =>
            citation.classification)),
      ),
      publications: tree.publications,
    };
  }
}
