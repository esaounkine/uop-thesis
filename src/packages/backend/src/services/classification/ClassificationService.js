import { CITATION_TYPE } from '../../constants/citation-type.js';

/** @typedef {import('../../db/schema.js').Contribution} Contribution */

const leadAuthorId = (contributions) =>
  contributions.find((contribution) => contribution.position === 1)?.authorId ?? null;

const authorIdSet = (contributions) =>
  new Set(contributions.map((contribution) => contribution.authorId));

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
   * @param {Contribution[]} cited - authors of the cited paper
   * @param {Contribution[][]} citingList - authors per citing paper
   * @returns {{
   *   total: number,
   *   external: number,
   *   self: { total: number, direct: number, coauthor: number },
   * }}
   */
  classify(cited, citingList) {
    const labels = citingList.map((citing) =>
      this.classifyCitation(cited, citing));
    const groups = Map.groupBy(labels, (label) => label);
    const countOf = (type) => groups.get(type)?.length ?? 0;

    const direct = countOf(CITATION_TYPE.SELF_DIRECT);
    const coauthor = countOf(CITATION_TYPE.SELF_COAUTHOR);

    return {
      total: labels.length,
      external: countOf(CITATION_TYPE.EXTERNAL),
      self: {
        total: direct + coauthor,
        direct,
        coauthor,
      },
    };
  }
}
