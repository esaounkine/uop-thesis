import { ApiError } from '../lib/api.js';

/**
 * Controller for author lookups against a single provider.
 */
export class AuthorController {
  constructor(providers) {
    this.providers = providers;
  }

  async getAuthorPapers({ params }) {
    const provider = this.providers.find((each) =>
      each.id === params.provider);

    if (!provider) {
      throw new ApiError(404, `unknown provider: ${params.provider}`);
    }

    const result = await provider.authors.getPublications(params.authorId);

    if (!result) {
      throw new ApiError(404, `author not found: ${params.authorId}`);
    }

    return {
      papers: result.publications,
    };
  }
}
