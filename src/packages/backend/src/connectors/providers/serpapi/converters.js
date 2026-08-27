import { normalise } from '../../../lib/normalise.js';
import { stripMarkup } from '../../../lib/strip-markup.js';

/**
 * @see https://serpapi.com/google-scholar-api
 * @param {Object} profile
 * @returns {import('../../../db/schema.js').Author}
 */
export const serpApiProfileToAuthor = (profile) => {
  return {
    authorId: profile.author_id,
    originalName: profile.name,
    normalisedName: normalise(profile.name),
    organisation: profile.affiliations ?? null,
  };
};

/**
 * @see https://serpapi.com/google-scholar-organic-results
 * @param {Object} author
 * @param {string} pubId
 * @param {number} position
 */
export const serpApiAuthorToContribution = (author, pubId, position) => {
  return {
    pubId: pubId,
    authorId: author.author_id ?? (normalise(author.name) || null),
    authorName: author.name ?? null,
    position: position,
  };
};

/**
 * @see https://serpapi.com/google-scholar-author-articles
 * @param {Object} article
 * @param {string} authorId
 * @param {Object} [author]
 * @returns {import('../../../db/schema.js').Publication}
 */
export const serpApiArticleToPublication = (article, authorId, author) => {
  const title = stripMarkup(article.title);
  const pubId = article.cited_by?.cites_id ?? article.citation_id;

  return {
    pubId: pubId,
    title: title,
    normalisedTitle: normalise(title),
    externalId: null,
    year: article.year
      ? Number(article.year)
      : null,
    citationCount: article.cited_by?.value ?? null,
    contributions: [
      {
        pubId: pubId,
        authorId: authorId,
        authorName: author?.name ?? null,
        organisation: author?.affiliations ?? null,
        position: 1,
      },
    ],
  };
};

/**
 * @see https://serpapi.com/google-scholar-organic-results
 * @param {Object} result
 * @returns {import('../../../db/schema.js').Publication}
 */
export const serpApiResultToPublication = (result) => {
  const title = stripMarkup(result.title);
  const pubId = result.result_id;

  return {
    pubId: pubId,
    title: title,
    normalisedTitle: normalise(title),
    externalId: null,
    year: null,
    citationCount: result.inline_links?.cited_by?.total ?? null,
    contributions: (result.publication_info?.authors ?? [])
      .map((author, index) =>
        serpApiAuthorToContribution(author, pubId, index + 1))
      // authorId (substituted by name if absent) might be null in which case we just drop the contribution
      .filter((contribution) =>
        contribution.authorId != null),
  };
};
