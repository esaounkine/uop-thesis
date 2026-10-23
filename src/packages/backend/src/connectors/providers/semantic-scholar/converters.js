import { normalise } from '../../../lib/normalise.js';
import { stripMarkup } from '../../../lib/strip-markup.js';

const convertSemanticScholarPaperToContributions = (paper) =>
  (paper.authors ?? [])
    .map((author, index) => {
      return {
        pubId: paper.paperId,
        authorId: author.authorId,
        authorName: author.name ?? null,
        position: index + 1, // Semantic Scholar returns them in the order of appearance
      };
    })
    // Unmatched authors are excluded from identity-based classification.
    .filter((contribution) =>
      contribution.authorId != null);

export const convertSemanticScholarPaperToPublication = (paper) => {
  const title = stripMarkup(paper.title);

  return {
    pubId: paper.paperId,
    title: title,
    normalisedTitle: normalise(title),
    externalId: paper.externalIds?.DOI ?? null,
    year: paper.year ?? null,
    citationCount: paper.citationCount ?? null,
    contributions: convertSemanticScholarPaperToContributions(paper),
  };
};

export const convertSemanticScholarAuthorToAuthor = (author) => {
  return {
    authorId: author.authorId,
    originalName: author.name,
    normalisedName: normalise(author.name),
    organisation: author.affiliations?.[0] ?? null,
  };
};
