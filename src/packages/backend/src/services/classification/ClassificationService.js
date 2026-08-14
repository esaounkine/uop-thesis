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
   * @param {import('../tree/TreeService.js').TreeService} [args.treeService]
   */
  constructor(
    {
      publicationService,
      treeService,
    } = {},
  ) {
    this.publicationService = publicationService;
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
   * Scenario 1: citation metrics for a paper, with per-citation debug details.
   *
   * @param {string} pubId
   * @returns {Promise<null | {
   *   publication: import('../../db/schema.js').Publication,
   *   metrics: ReturnType<ClassificationService['aggregate']>,
   *   citations: {
   *     publication: import('../../db/schema.js').Publication,
   *     classification: string,
   *   }[],
   * }>} null when the paper is not found
   */
  async getPaperMetrics(pubId) {
    const tree = await this.publicationService.getCitationTree(pubId);

    if (!tree) {
      return null;
    }

    const classified = tree.citing.map((entry) => {
      return {
        publication: entry.publication,
        contributions: entry.contributions,
        classification: this.classifyCitation(
          tree.citedContributions,
          entry.contributions,
        ),
      };
    });

    this.treeService?.save({
      publication: tree.publication,
      citedContributions: tree.citedContributions,
      citing: classified,
    });

    const metrics = this.aggregate(
      classified.map((entry) =>
        entry.classification));

    return {
      publication: tree.publication,
      metrics: metrics,
      citations: classified.map((entry) => {
        return {
          publication: entry.publication,
          classification: entry.classification,
        };
      }),
    };
  }
}
