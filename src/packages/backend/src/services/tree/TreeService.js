/**
 * @typedef {{
 *   publication: import('../../db/schema.js').Publication,
 *   citedContributions: import('../../db/schema.js').Contribution[],
 *   citing: {
 *     publication: import('../../db/schema.js').Publication,
 *     contributions: import('../../db/schema.js').Contribution[],
 *     classification: string,
 *   }[],
 * }} ClassifiedTree
 */

/**
 * Saves and restores a classified citation tree.
 */
export class TreeService {
  /**
   * @param {Object} deps
   * @param {import('../../repositories/PublicationRepository.js').PublicationRepository} deps.publicationRepository
   * @param {import('../../repositories/AuthorRepository.js').AuthorRepository} deps.authorRepository
   * @param {import('../../repositories/ContributionRepository.js').ContributionRepository} deps.contributionRepository
   * @param {import('../../repositories/CitationRepository.js').CitationRepository} deps.citationRepository
   */
  constructor({
    publicationRepository,
    authorRepository,
    contributionRepository,
    citationRepository,
  }) {
    this.publicationRepository = publicationRepository;
    this.authorRepository = authorRepository;
    this.contributionRepository = contributionRepository;
    this.citationRepository = citationRepository;
  }

  /**
   * Decomposes the tree and stores it.
   *
   * @param {ClassifiedTree} tree
   */
  save({
    publication, citedContributions, citing,
  }) {
    const publicationRows = [
      publication,
      ...citing.map((entry) =>
        entry.publication),
    ];
    const contributionRows = [
      citedContributions,
      ...citing.map((entry) =>
        entry.contributions),
    ].flat();
    const authorRows = [
      ...new Set(contributionRows.map((contribution) =>
        contribution.authorId)),
    ].map((authorId) => {
      return {
        authorId: authorId,
        originalName: null,
        normalisedName: null,
      };
    });
    const citationRows = citing.map((entry) => {
      return {
        sourcePubId: entry.publication.pubId,
        targetPubId: publication.pubId,
        classification: entry.classification,
      };
    });

    this.publicationRepository.saveAll(publicationRows);
    this.authorRepository.saveAll(authorRows);
    this.contributionRepository.saveAll(contributionRows);
    this.citationRepository.saveAll(citationRows);
  }

  /**
   * Rebuilds the classified tree for a paper from the DB.
   *
   * @param {string} pubId - the cited publication id
   * @returns {ClassifiedTree | null} null when the tree was never saved
   */
  restore(pubId) {
    const [publication] = this.publicationRepository.findByIds([pubId]);

    if (!publication) {
      return null;
    }

    const edges = this.citationRepository.findByTarget(pubId);
    const citingIds = edges.map((edge) =>
      edge.sourcePubId);
    const publicationById = new Map(
      this.publicationRepository
        .findByIds(citingIds)
        .map((row) =>
          [row.pubId, row]));
    const contributionsByPub = Map.groupBy(
      this.contributionRepository.findByPubIds([pubId, ...citingIds]),
      (contribution) =>
        contribution.pubId,
    );

    const citing = edges.map((edge) => {
      return {
        publication: publicationById.get(edge.sourcePubId),
        contributions: contributionsByPub.get(edge.sourcePubId) ?? [],
        classification: edge.classification,
      };
    });

    return {
      publication: publication,
      citedContributions: contributionsByPub.get(pubId) ?? [],
      citing: citing,
    };
  }
}
