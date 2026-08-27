import { ApiError } from '../lib/api.js';

export class SearchController {
  /**
   *
   * @param {import('../services/author/AuthorService.js').AuthorService} authorService
   */
  constructor(authorService) {
    this.authorService = authorService;
  }

  async searchAuthors({ query }) {
    const term = query.q;

    if (!term) {
      throw new ApiError(400, 'missing query parameter q');
    }

    return this.authorService.searchByName(term);
  }
}
