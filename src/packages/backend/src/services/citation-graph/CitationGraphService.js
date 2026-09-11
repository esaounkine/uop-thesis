import { convertCitationTreeToDbRows, convertDbRowsToCitationTree } from './converters.js';

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
   * @param {ClassificationService} args.classificationService
   */
  constructor({
    publicationRepository,
    authorRepository,
    contributionRepository,
    citationRepository,
    classificationService,
  }) {
    this.publicationRepository = publicationRepository;
    this.authorRepository = authorRepository;
    this.contributionRepository = contributionRepository;
    this.citationRepository = citationRepository;
    this.classificationService = classificationService;
  }

  /**
   * Decomposes the tree and stores it.
   *
   * @param {string} provider
   * @param {Object} tree
   */
  storePubTree(provider, tree) {
    const rows = convertCitationTreeToDbRows(provider, tree);

    this.publicationRepository.saveAll(rows.publications);
    this.authorRepository.saveAll(rows.authors);
    this.contributionRepository.saveAll(rows.contributions);

    if (rows.citations.length > 0) {
      this.citationRepository.saveAll(rows.citations);
    }
  }

  /**
   * Rebuilds the classified tree for a paper from the DB.
   *
   * @param {string} provider
   * @param {string} pubId - the cited publication id
   * @returns {Object | null} null when the tree was never saved
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
    const citingPublications = this.publicationRepository.findPublications({
      provider: provider,
      pubId: citingIds,
    });
    const contributions = this.contributionRepository.findContributions({
      provider: provider,
      pubId: [pubId, ...citingIds],
    });

    return convertDbRowsToCitationTree({
      publication: publication,
      citingPublications: citingPublications,
      contributions: contributions,
      citations: edges,
    });
  }

  /**
   * Rebuilds tree for an author from the DB.
   *
   * @param {string} providerId
   * @param {string} authorId
   * @returns {Object | null}
   *   null when the author was never saved
   */
  getAuthorTree(providerId, authorId) {
    const author = this.authorRepository.findAuthor({
      provider: providerId,
      authorId: authorId,
    });

    if (!author) {
      return null;
    }

    const pubIds = [
      ...new Set(this.contributionRepository
        .findContributions({
          provider: providerId,
          authorId: authorId,
        })
        .map((contribution) =>
          contribution.pubId)),
    ];

    return {
      author: author,
      publications: pubIds
        .map((pubId) =>
          this.getPubTree(providerId, pubId))
        .filter(Boolean)
        .map((entry) => {
          return {
            ...entry,
            citations: entry.citations.map((citation) => {
              return {
                ...citation,
                classification: this.classificationService.getCitationType(
                  entry.publication.contributions,
                  citation.publication.contributions,
                  authorId,
                ),
              };
            }),
          };
        }),
    };
  }
}
