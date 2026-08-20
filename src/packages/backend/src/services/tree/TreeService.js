import { normalise } from '../../lib/normalise.js';

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
   * @param {Object} args
   * @param {string} args.provider - tags every stored row; scopes restore
   * @param {import('../../repositories/PublicationRepository.js').PublicationRepository} args.publicationRepository
   * @param {import('../../repositories/AuthorRepository.js').AuthorRepository} args.authorRepository
   * @param {import('../../repositories/ContributionRepository.js').ContributionRepository} args.contributionRepository
   * @param {import('../../repositories/CitationRepository.js').CitationRepository} args.citationRepository
   */
  constructor({
    provider,
    publicationRepository,
    authorRepository,
    contributionRepository,
    citationRepository,
  }) {
    this.provider = provider;
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
    const contributions = [
      citedContributions,
      ...citing.map((entry) =>
        entry.contributions),
    ].flat();

    const publicationRows = [
      publication,
      ...citing.map((entry) =>
        entry.publication),
    ].map((row) => {
      return {
        provider: this.provider,
        pubId: row.pubId,
        title: row.title,
        normalisedTitle: row.normalisedTitle,
        externalId: row.externalId,
        year: row.year ?? null,
      };
    });
    const contributionRows = contributions.map((contribution) => {
      return {
        provider: this.provider,
        pubId: contribution.pubId,
        authorId: contribution.authorId,
        position: contribution.position,
      };
    });
    const authorRows = [
      ...new Map(contributions.map((contribution) =>
        [contribution.authorId, contribution])),
    ].map(([authorId, contribution]) => {
      const name = contribution.authorName ?? null;

      return {
        provider: this.provider,
        authorId: authorId,
        originalName: name,
        normalisedName: name == null
          ? null
          : normalise(name),
        organisation: contribution.organisation ?? null,
      };
    });
    const citationRows = citing.map((entry) => {
      return {
        provider: this.provider,
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
    const [publication] = this.publicationRepository.findByIds(
      this.provider, [pubId],
    );

    if (!publication) {
      return null;
    }

    const edges = this.citationRepository.findByTarget(this.provider, pubId);
    const citingIds = edges.map((edge) =>
      edge.sourcePubId);
    const publicationById = new Map(
      this.publicationRepository
        .findByIds(this.provider, citingIds)
        .map((row) =>
          [row.pubId, row]));
    const contributionsByPub = Map.groupBy(
      this.contributionRepository.findByPubIds(
        this.provider, [pubId, ...citingIds],
      ),
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
