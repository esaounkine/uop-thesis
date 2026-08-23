import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { OpenAlexConnector } from '../OpenAlexConnector.js';

const createConnector = (...pages) => {
  const getJsonMock = jest.fn();
  pages.forEach((page) =>
    getJsonMock.mockResolvedValueOnce({
      data: page,
      fetchedAt: new Date(),
    }));

  return new OpenAlexConnector({
    httpClient: { getJson: getJsonMock },
    baseUrl: 'https://api.openalex.org',
    apiKey: undefined,
  });
};

const createSinglePage = (work) => {
  return {
    results: [work],
    meta: { next_cursor: null },
  };
};

describe('OpenAlexConnector', () => {
  describe('getCitations', () => {
    describe('when the results span multiple pages', () => {
      let citations;

      beforeEach(async () => {
        citations = await createConnector(
          {
            results: [
              {
                id: 'https://openalex.org/W2',
                title: 'W2',
              },
            ],
            meta: { next_cursor: 'c2' },
          },
          {
            results: [
              {
                id: 'https://openalex.org/W3',
                title: 'W3',
              },
            ],
            meta: { next_cursor: null },
          },
        ).getCitations('W1');
      });

      it('follows the cursor until it is exhausted', () => {
        expect(citations.map((pub) =>
          pub.pubId)).toEqual(['W2', 'W3']);
      });
    });

    describe('when a citing work has the full fields', () => {
      let publication;

      beforeEach(async () => {
        [publication] = await createConnector(createSinglePage({
          id: 'https://openalex.org/W1',
          title: 'A Paper',
          doi: 'https://doi.org/10.1/x',
          publication_year: 2020,
          cited_by_count: 7,
        })).getCitations('W0');
      });

      it('shortens the id', () => {
        expect(publication.pubId).toBe('W1');
      });

      it('keeps the title and normalises it', () => {
        expect(publication.title).toBe('A Paper');
        expect(publication.normalisedTitle).toBe('a paper');
      });

      it('keeps the DOI as the external id', () => {
        expect(publication.externalId).toBe('https://doi.org/10.1/x');
      });

      it('keeps the publication year', () => {
        expect(publication.year).toBe(2020);
      });

      it('maps the citation count', () => {
        expect(publication.citationCount).toBe(7);
      });
    });

    describe('contributions', () => {
      describe('when the work has authors', () => {
        let publication;

        beforeEach(async () => {
          [publication] = await createConnector(createSinglePage({
            id: 'https://openalex.org/W1',
            authorships: [
              {
                author: {
                  id: 'https://openalex.org/A1',
                  display_name: 'Jane Roe',
                },
                institutions: [{ display_name: 'University 1' }],
              },
              {
                author: {
                  id: 'https://openalex.org/A2',
                  display_name: 'John Doe',
                },
              },
            ],
          })).getCitations('W0');
        });

        it('numbers the positions by order', () => {
          expect(publication.contributions.map((entry) =>
            entry.position)).toEqual([1, 2]);
        });

        it('carries the pub id, author id, name and organisation', () => {
          expect(publication.contributions[0]).toEqual({
            pubId: 'W1',
            authorId: 'A1',
            authorName: 'Jane Roe',
            organisation: 'University 1',
            position: 1,
          });
        });
      });

      describe('when an authorship has no author id', () => {
        let publication;

        beforeEach(async () => {
          [publication] = await createConnector(createSinglePage({
            id: 'https://openalex.org/W1',
            authorships: [
              {
                author: {
                  id: null,
                  display_name: 'Anon',
                },
              },
              {
                author: {
                  id: 'https://openalex.org/A2',
                  display_name: 'John Doe',
                },
              },
            ],
          })).getCitations('W0');
        });

        it('drops it but keeps the original position of the rest', () => {
          expect(publication.contributions).toEqual([
            {
              pubId: 'W1',
              authorId: 'A2',
              authorName: 'John Doe',
              organisation: null,
              position: 2,
            },
          ]);
        });
      });
    });
  });

  describe('searchAuthors', () => {
    describe('when authors match', () => {
      let authors;

      beforeEach(async () => {
        authors = await createConnector({
          results: [
            {
              id: 'https://openalex.org/A1',
              display_name: 'Jane Roe',
              last_known_institutions: [{ display_name: 'University 1' }],
            },
          ],
        }).searchAuthors('jane');
      });

      it('maps the results with organisation', () => {
        expect(authors).toEqual([
          {
            authorId: 'A1',
            originalName: 'Jane Roe',
            normalisedName: 'jane roe',
            organisation: 'University 1',
          },
        ]);
      });
    });
  });

  describe('getQuota', () => {
    describe('with an api key', () => {
      let quota;

      beforeEach(async () => {
        const getJsonMock = jest.fn().mockResolvedValue({
          data: {
            rate_limit: {
              credits_limit: 10000,
              credits_used: 250,
              credits_remaining: 9750,
              resets_at: '2026-08-23T00:00:00.000Z',
            },
          },
          fetchedAt: new Date(),
        });

        quota = await new OpenAlexConnector({
          httpClient: { getJson: getJsonMock },
          baseUrl: 'https://api.openalex.org',
          apiKey: 'secret',
        }).getQuota();
      });

      it('maps the remaining credits', () => {
        expect(quota).toEqual({
          creditsLimit: 10000,
          creditsUsed: 250,
          creditsRemaining: 9750,
          resetsAt: '2026-08-23T00:00:00.000Z',
        });
      });
    });

    describe('without an api key', () => {
      it('returns null', async () => {
        const connector = new OpenAlexConnector({
          httpClient: { getJson: jest.fn() },
          apiKey: null,
        });

        expect(await connector.getQuota()).toBeNull();
      });
    });
  });
});
