import { normalise } from '../../lib/normalise.js';

/**
 * @typedef {{
 *   publication: import('../../db/schema.js').Publication,
 *   citations: {
 *     publication: import('../../db/schema.js').Publication,
 *     classification: string,
 *   }[],
 * }} ClassifiedTree
 */

/**
 * Saves and restores a classified citation graph.
 */
export class CitationGraphService {
  /**
   * @param {Object} args
   * @param {import('../../repositories/PublicationRepository.js').PublicationRepository} args.publicationRepository
   * @param {import('../../repositories/AuthorRepository.js').AuthorRepository} args.authorRepository
   * @param {import('../../repositories/ContributionRepository.js').ContributionRepository} args.contributionRepository
   * @param {import('../../repositories/CitationRepository.js').CitationRepository} args.citationRepository
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
   * @param {string} provider
   * @param {ClassifiedTree} tree
   */
  storePubTree(provider, {
    publication, citations,
  }) {
    const publications = [
      publication,
      ...citations.map((citation) =>
        citation.publication),
    ];
    const contributions = publications.flatMap((row) =>
      row.contributions ?? []);

    const publicationRows = publications.map((row) => {
      return {
        provider: provider,
        pubId: row.pubId,
        title: row.title,
        normalisedTitle: row.normalisedTitle,
        externalId: row.externalId,
        year: row.year ?? null,
      };
    });
    const contributionRows = contributions.map((contribution) => {
      return {
        provider: provider,
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
        provider: provider,
        authorId: authorId,
        originalName: name,
        normalisedName: name == null
          ? null
          : normalise(name),
        organisation: contribution.organisation ?? null,
      };
    });
    const citationRows = citations.map((citation) => {
      return {
        provider: provider,
        sourcePubId: citation.publication.pubId,
        targetPubId: publication.pubId,
        classification: citation.classification,
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
   * @param {string} provider
   * @param {string} pubId - the cited publication id
   * @returns {ClassifiedTree | null} null when the tree was never saved
   */
  getPubTree(provider, pubId) {
    const publication = this.publicationRepository.findPublication({
      provider: provider,
      pubId: pubId,
    });

    if (!publication) {
      return null;
    }

    const edges = this.citationRepository.findCitations({
      provider: provider,
      targetPubId: pubId,
    });
    const citingIds = edges.map((edge) =>
      edge.sourcePubId);
    const publicationById = new Map(
      this.publicationRepository
        .findPublications({
          provider: provider,
          pubId: citingIds,
        })
        .map((row) =>
          [row.pubId, row]));
    const contributionsByPub = Map.groupBy(
      this.contributionRepository.findContributions({
        provider: provider,
        pubId: [pubId, ...citingIds],
      }),
      (contribution) =>
        contribution.pubId,
    );
    const withContributions = (row) => {
      return {
        ...row,
        contributions: contributionsByPub.get(row.pubId) ?? [],
      };
    };

    return {
      publication: withContributions(publication),
      citations: edges.map((edge) => {
        return {
          publication: withContributions(publicationById.get(edge.sourcePubId)),
          classification: edge.classification,
        };
      }),
    };
  }

  /**
   * Rebuilds tree for an author from the DB.
   *
   * @param {string} provider
   * @param {string} authorId
   * @returns {{ author: import('../../db/schema.js').Author, publications: ClassifiedTree[] } | null}
   *   null when the author was never saved
   */
  getAuthorTree(provider, authorId) {
    const author = this.authorRepository.findAuthor({
      provider: provider,
      authorId: authorId,
    });

    if (!author) {
      return null;
    }

    const pubIds = [
      ...new Set(this.contributionRepository
        .findContributions({
          provider: provider,
          authorId: authorId,
        })
        .map((contribution) =>
          contribution.pubId)),
    ];

    return {
      author: author,
      publications: pubIds
        .map((pubId) =>
          this.getPubTree(provider, pubId))
        .filter(Boolean),
    };
  }
}
