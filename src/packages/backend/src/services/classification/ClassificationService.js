import { CITATION_TYPE } from '../../constants/citation-type.js';

/** @typedef {import('../../db/schema.js').Contribution} Contribution */

const leadAuthorId = (contributions) =>
  contributions.find((contribution) =>
    contribution.position === 1)?.authorId ?? null;

const authorIdSet = (contributions) =>
  new Set(contributions.map((contribution) =>
    contribution.authorId));

/**
 * Classifies the citations of a paper.
 */
export class ClassificationService {
  /**
   * @param {Object} [args]
   * @param {import('../publication/PublicationService.js').PublicationService} [args.publicationService]
   * @param {import('../author/AuthorService.js').AuthorService} [args.authorService]
   * @param {import('../tree/TreeService.js').TreeService} [args.treeService]
   */
  constructor(
    {
      publicationService,
      authorService,
      treeService,
    } = {},
  ) {
    this.publicationService = publicationService;
    this.authorService = authorService;
    this.treeService = treeService;
  }

  /**
   * @param {Contribution[]} cited - authors of the cited paper
   * @param {Contribution[]} citing - authors of one citing paper
   * @returns {string} one of CITATION_TYPE
   */
  classifyCitation(cited, citing) {
    if (authorIdSet(cited).isDisjointFrom(authorIdSet(citing))) {
      return CITATION_TYPE.EXTERNAL;
    }

    const citedLead = leadAuthorId(cited);

    if (citedLead != null && citedLead === leadAuthorId(citing)) {
      return CITATION_TYPE.SELF_DIRECT;
    }

    return CITATION_TYPE.SELF_COAUTHOR;
  }

  /**
   * @param {string[]} labels - one CITATION_TYPE per citation
   * @returns {{
   *   total: number,
   *   external: number,
   *   self: { total: number, direct: number, coauthor: number },
   * }}
   */
  aggregate(labels) {
    const groups = Map.groupBy(labels, (x) =>
      x);
    const countOf = (type) =>
      groups.get(type)?.length ?? 0;

    const direct = countOf(CITATION_TYPE.SELF_DIRECT);
    const coauthor = countOf(CITATION_TYPE.SELF_COAUTHOR);

    return {
      total: labels.length,
      external: countOf(CITATION_TYPE.EXTERNAL),
      self: {
        total: direct + coauthor,
        direct: direct,
        coauthor: coauthor,
      },
    };
  }

  /**
   * @param {Contribution[]} cited - authors of the cited paper
   * @param {Contribution[][]} citingList - authors per citing paper
   * @returns {ReturnType<ClassificationService['aggregate']>}
   */
  classify(cited, citingList) {
    return this.aggregate(
      citingList.map((citing) =>
        this.classifyCitation(cited, citing)),
    );
  }

  /**
   * Get publication citation metrics.
   *
   * @param {import('../../db/schema.js').Publication} publication
   * @returns {Promise<{
   *   publication: import('../../db/schema.js').Publication,
   *   metrics: ReturnType<ClassificationService['aggregate']>,
   *   citations: {
   *     publication: import('../../db/schema.js').Publication,
   *     classification: string,
   *   }[],
   * }>}
   */
  async getPublicationMetrics(publication) {
    const citations = await this.publicationService
      .getCitations(publication.pubId);

    const classified = citations.map((citation) => {
      return {
        publication: citation,
        classification: this.classifyCitation(
          publication.contributions,
          citation.contributions,
        ),
      };
    });

    return {
      publication: publication,
      metrics: this.aggregate(
        classified.map((entry) =>
          entry.classification)),
      citations: classified,
    };
  }

  /**
   * Get author citation metrics, aggregated across all their papers.
   *
   * @param {string} authorId
   * @returns {Promise<null | {
   *   author: import('../../db/schema.js').Author,
   *   metrics: ReturnType<ClassificationService['aggregate']>,
   *   publications: Awaited<ReturnType<ClassificationService['getPublicationMetrics']>>[],
   *   stats: { total: number, fetched: number, failed: number },
   * }>} null when the author is not found
   */
  async getAuthorMetrics(authorId) {
    const tree = await this.authorService.getPublications(authorId);

    if (!tree) {
      return null;
    }

    const settled = await Promise.allSettled(
      tree.publications.map((publication) =>
        this.getPublicationMetrics(publication)),
    );
    const publications = settled
      .filter((result) =>
        result.status === 'fulfilled' && result.value != null)
      .map((result) =>
        result.value);
    const failed = settled.filter((result) =>
      result.status === 'rejected').length;

    publications.forEach((entry) =>
      this.treeService?.save({
        publication: entry.publication,
        citedContributions: entry.publication.contributions,
        citing: entry.citations.map((citation) => {
          return {
            publication: citation.publication,
            contributions: citation.publication.contributions,
            classification: citation.classification,
          };
        }),
      }));

    const metrics = this.aggregate(
      publications.flatMap((entry) =>
        entry.citations.map((citation) =>
          citation.classification)),
    );

    return {
      author: tree.author,
      metrics: metrics,
      publications: publications,
      stats: {
        total: tree.publications.length,
        fetched: publications.length,
        failed: failed,
      },
    };
  }
}
