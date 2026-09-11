import { CITATION_TYPE } from '../../constants/citation-type.js';

const getUniqueAuthorIds = (contributions) =>
  new Set(contributions.map((contribution) =>
    contribution.authorId).filter((authorId) =>
    authorId != null));

/**
 * Classifies the citations of a paper.
 */
export class ClassificationService {
  /**
   * @param {Object[]} cited - authors of the cited paper
   * @param {Object[]} citing - authors of one citing paper
   * @param {string} authorId - researcher being analyzed
   * @returns {string} one of CITATION_TYPE
   */
  getCitationType(cited, citing, authorId) {
    if (typeof authorId !== 'string' || authorId.trim() === '') {
      throw new TypeError('authorId is required for citation classification');
    }

    const citingAuthors = getUniqueAuthorIds(citing);

    if (citingAuthors.has(authorId)) {
      return CITATION_TYPE.SELF_DIRECT;
    }

    return getUniqueAuthorIds(cited).isDisjointFrom(citingAuthors)
      ? CITATION_TYPE.EXTERNAL
      : CITATION_TYPE.SELF_COAUTHOR;
  }

  /**
   * @param {string[]} labels - one CITATION_TYPE per citation
   * @returns {{
   *   total: number,
   *   external: number,
   *   self: { total: number, direct: number, coauthor: number },
   * }}
   */
  getMetrics(labels) {
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
}
