import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SemanticScholarConnector } from '../SemanticScholarConnector.js';

const createConnector = (...pages) => {
  const getJsonMock = jest.fn();
  pages.forEach((page) =>
    getJsonMock.mockResolvedValueOnce({
      data: page,
      fetchedAt: new Date(),
    }));

  return new SemanticScholarConnector({
    httpClient: { getJson: getJsonMock },
    baseUrl: 'https://api.semanticscholar.org/graph/v1',
    apiKey: undefined,
  });
};

const createSingleCitationPage = (paper) => {
  return {
    data: [{ citingPaper: paper }],
  };
};

describe('SemanticScholarConnector', () => {
  describe('getCitations', () => {
    describe('when the results span multiple pages', () => {
      let citations;

      beforeEach(async () => {
        citations = await createConnector(
          {
            data: [
              {
                citingPaper: {
                  paperId: 'p2',
                  title: 'W2',
                },
              },
            ],
            next: 1,
          },
          {
            data: [
              {
                citingPaper: {
                  paperId: 'p3',
                  title: 'W3',
                },
              },
            ],
          },
        ).getCitations('p1');
      });

      it('follows the offset until it is exhausted', () => {
        expect(citations.map((publication) =>
          publication.pubId)).toEqual(['p2', 'p3']);
      });
    });

    describe('when a citing paper has null id', () => {
      let citations;

      beforeEach(async () => {
        citations = await createConnector({
          data: [
            {
              citingPaper: {
                paperId: null,
                title: 'Unresolved',
              },
            },
            {
              citingPaper: {
                paperId: 'p2',
                title: 'W2',
              },
            },
          ],
        }).getCitations('p1');
      });

      it('drops the unidentified citing paper', () => {
        expect(citations.map((publication) =>
          publication.pubId)).toEqual(['p2']);
      });
    });

    describe('when a citing paper has the full fields', () => {
      let publication;

      beforeEach(async () => {
        [publication] = await createConnector(createSingleCitationPage({
          paperId: 'p1',
          title: 'A Paper',
          year: 2020,
          citationCount: 7,
          externalIds: { DOI: '10.1/x' },
          authors: [
            {
              authorId: 'a1',
              name: 'Jane Roe',
            },
            {
              authorId: 'a2',
              name: 'John Doe',
            },
          ],
        })).getCitations('p0');
      });

      it('keeps the id, title, year and doi', () => {
        expect(publication).toMatchObject({
          pubId: 'p1',
          title: 'A Paper',
          normalisedTitle: 'a paper',
          externalId: '10.1/x',
          year: 2020,
        });
      });

      it('keeps the citation count', () => {
        expect(publication.citationCount).toBe(7);
      });

      it('carries the contributions with author name, no organisation', () => {
        expect(publication.contributions[0]).toEqual({
          pubId: 'p1',
          authorId: 'a1',
          authorName: 'Jane Roe',
          position: 1,
        });
      });
    });

    describe('when a citing author has no id', () => {
      let publication;

      beforeEach(async () => {
        [publication] = await createConnector(createSingleCitationPage({
          paperId: 'p1',
          authors: [
            {
              authorId: null,
              name: 'Anon',
            },
            {
              authorId: 'a2',
              name: 'John Doe',
            },
          ],
        })).getCitations('p0');
      });

      it('drops it but keeps the original position of the rest', () => {
        expect(publication.contributions).toEqual([
          {
            pubId: 'p1',
            authorId: 'a2',
            authorName: 'John Doe',
            position: 2,
          },
        ]);
      });
    });
  });

  describe('searchAuthors', () => {
    describe('when authors match', () => {
      let authors;

      beforeEach(async () => {
        authors = await createConnector({
          data: [
            {
              authorId: 'a1',
              name: 'Jane Roe',
              affiliations: ['University 1'],
            },
          ],
        }).searchAuthors('jane');
      });

      it('maps the results with organisation', () => {
        expect(authors).toEqual([
          {
            authorId: 'a1',
            originalName: 'Jane Roe',
            normalisedName: 'jane roe',
            organisation: 'University 1',
          },
        ]);
      });
    });
  });
});
