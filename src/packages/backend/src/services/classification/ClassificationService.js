import { CITATION_TYPE } from '../../constants/citation-type.js';

/** @typedef {import('../../db/schema.js').Contribution} Contribution */

const getLeadAuthorId = (contributions) =>
  contributions.find((contribution) =>
    contribution.position === 1)?.authorId ?? null;

const getUniqueAuthorIds = (contributions) =>
  new Set(contributions.map((contribution) =>
    contribution.authorId));

/**
 * Classifies the citations of a paper.
 */
export class ClassificationService {
  /**
   * @param {Contribution[]} cited - authors of the cited paper
   * @param {Contribution[]} citing - authors of one citing paper
   * @returns {string} one of CITATION_TYPE
   */
  classifyCitation(cited, citing) {
    if (getUniqueAuthorIds(cited).isDisjointFrom(getUniqueAuthorIds(citing))) {
      return CITATION_TYPE.EXTERNAL;
    }

    const citedLead = getLeadAuthorId(cited);

    if (citedLead != null && citedLead === getLeadAuthorId(citing)) {
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
}
