import { normalise } from '../../lib/normalise.js';

/** Converts a classified publication tree into database rows. */
export const convertCitationTreeToDbRows = (provider, {
  publication, citations,
}) => {
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

  return {
    publications: publicationRows,
    authors: authorRows,
    contributions: contributionRows,
    citations: citationRows,
  };
};

/** Rebuilds a publication tree from database rows. */
export const convertDbRowsToCitationTree = ({
  publication,
  citingPublications,
  contributions,
  citations,
}) => {
  const publicationById = new Map(citingPublications.map((row) =>
    [row.pubId, row]));
  const contributionsByPub = Map.groupBy(contributions, (contribution) =>
    contribution.pubId);
  const withContributions = (row) => {
    return {
      ...row,
      contributions: contributionsByPub.get(row.pubId) ?? [],
    };
  };

  return {
    publication: withContributions(publication),
    citations: citations.map((edge) => {
      return {
        publication: withContributions(publicationById.get(edge.sourcePubId)),
        classification: edge.classification,
      };
    }),
  };
};
