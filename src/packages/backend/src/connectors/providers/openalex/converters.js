import { normalise } from '../../../lib/normalise.js';
import { stripMarkup } from '../../../lib/strip-markup.js';

// 'https://openalex.org/W123' -> 'W123'
const convertOpenAlexUrlToId = (id) =>
  (id
    ? id.split('/').pop()
    : id);

const convertOpenAlexWorkToContributions = (work) =>
  (work.authorships ?? [])
    .map((entry, index) => {
      return {
        pubId: convertOpenAlexUrlToId(work.id),
        authorId: convertOpenAlexUrlToId(entry.author?.id),
        authorName: entry.author?.display_name ?? null,
        organisation: entry.institutions?.[0]?.display_name ?? null,
        position: index + 1, // OpenAlex returns them in the order of appearance
      };
    })
    // Unmatched authors are excluded from identity-based classification.
    .filter((contribution) =>
      contribution.authorId != null);

export const convertOpenAlexWorkToPublication = (work) => {
  const title = stripMarkup(work.title);

  return {
    pubId: convertOpenAlexUrlToId(work.id),
    title: title,
    normalisedTitle: normalise(title),
    externalId: work.doi ?? null,
    year: work.publication_year ?? null,
    citationCount: work.cited_by_count ?? null,
    contributions: convertOpenAlexWorkToContributions(work),
  };
};

export const convertOpenAlexAuthorToAuthor = (author) => {
  return {
    authorId: convertOpenAlexUrlToId(author.id),
    originalName: author.display_name,
    normalisedName: normalise(author.display_name),
    organisation: author.last_known_institutions?.[0]?.display_name ?? null,
  };
};
