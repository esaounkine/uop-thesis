/** @typedef {import('../../db/schema.js').Publication} Publication */

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
   * Get citation metrics of an author.
   *
   * @param {string} authorId
   * @returns {Promise<null | {
   *   author: import('../../db/schema.js').Author,
   *   metrics: ReturnType<import('../classification/ClassificationService.js').ClassificationService['getMetrics']>,
   *   publications: Awaited<ReturnType<MetricsService['getPublicationMetrics']>>[],
   *   stats: { total: number, fetched: number, failed: number },
   * }>} null when the author is not found
   */
  async getAuthorMetrics(authorId) {
    const author = await this.authorService.getPublications(authorId);

    if (!author) {
      return null;
    }

    const settled = await Promise.allSettled(
      author.publications.map((publication) =>
        this.getPublicationMetrics(publication)),
    );
    const publications = settled
      .filter((result) =>
        result.status === 'fulfilled')
      .map((result) =>
        result.value);
    const failed = settled.filter((result) =>
      result.status === 'rejected').length;

    publications.forEach((entry) =>
      this.citationGraphService?.save(entry));

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
   * Get citation metrics of a publication.
   *
   * @param {Publication} publication
   * @returns {Promise<{
   *   publication: Publication,
   *   metrics: ReturnType<import('../classification/ClassificationService.js').ClassificationService['getMetrics']>,
   *   citations: { publication: Publication, classification: string }[],
   * }>}
   */
  async getPublicationMetrics(publication) {
    const citations = await this.publicationService
      .getCitations(publication.pubId);

    const classified = citations.map((citation) => {
      return {
        publication: citation,
        classification: this.classificationService.getCitationType(
          publication.contributions,
          citation.contributions,
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
