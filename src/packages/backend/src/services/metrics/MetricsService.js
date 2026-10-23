/**
 * Composition of the citation metrics pipeline.
 */
export class MetricsService {
  /**
   * @param {Object} args
   * @param {import('../author/AuthorService.js').AuthorService} args.authorService
   * @param {import('../publication/PublicationService.js').PublicationService} args.publicationService
   * @param {import('../classification/ClassificationService.js').ClassificationService} args.classificationService
   * @param {import('../citation-graph/CitationGraphService.js').CitationGraphService} [args.citationGraphService]
   */
  constructor({
    authorService,
    publicationService,
    classificationService,
    citationGraphService,
  }) {
    this.authorService = authorService;
    this.publicationService = publicationService;
    this.classificationService = classificationService;
    this.citationGraphService = citationGraphService;
  }

  /**
   * @param {string} providerId
   * @param {string} authorId
   * @param {Object} [options]
   * @param {boolean} [options.cache] - true = use, false = skip the cache
   * @returns {Promise<Object|null>} null when the author is not found
   */
  async getAuthorMetrics(providerId, authorId, { cache = true } = {}) {
    const author = await this.authorService
      .getProviderPublications(providerId, authorId, { cache: cache });

    if (!author) {
      return null;
    }

    const settled = await Promise.allSettled(
      author.publications.map((publication) =>
        this.getProviderPublicationMetrics(
          providerId,
          publication,
          authorId,
          { cache: cache },
        )),
    );
    const publications = settled
      .filter((result) =>
        result.status === 'fulfilled')
      .map((result) =>
        result.value);
    const failed = settled.filter((result) =>
      result.status === 'rejected').length;

    publications.forEach((entry) =>
      this.citationGraphService?.storePubTree(providerId, entry));

    return {
      author: author.author,
      metrics: this.classificationService.getMetrics(
        publications.flatMap((entry) =>
          entry.citations.map((citation) =>
            citation.classification)),
      ),
      publications: publications,
      stats: {
        total: author.publications.length,
        fetched: publications.length,
        failed: failed,
      },
    };
  }

  /**
   * @param {string} providerId
   * @param {Object} publication
   * @param {string} authorId
   * @param {Object} [options]
   * @param {boolean} [options.cache] - true = use, false = skip the cache
   * @returns {Promise<Object>}
   */
  async getProviderPublicationMetrics(
    providerId,
    publication,
    authorId,
    { cache = true } = {},
  ) {
    const citations = await this.publicationService
      .getCitations(providerId, publication.pubId, { cache: cache });

    const classified = citations.map((citation) => {
      return {
        publication: citation,
        classification: this.classificationService.getCitationType(
          publication.contributions,
          citation.contributions,
          authorId,
        ),
      };
    });

    return {
      publication: publication,
      metrics: this.classificationService.getMetrics(
        classified.map((entry) =>
          entry.classification)),
      citations: classified,
    };
  }
}
