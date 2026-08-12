import { beforeEach, describe, expect, it } from '@jest/globals';
import { OpenAlexConnector } from '../OpenAlexConnector.js';

// getJson returns next page on each call
const createConnector = (...pages) => {
  let call = 0;
  const getJson = async () => {
    const page = pages[call];
    call += 1;
    return {
      data: page,
      fetchedAt: new Date(),
    };
  };

  return new OpenAlexConnector({
    httpClient: { getJson: getJson },
    baseUrl: 'https://api.openalex.org',
    apiKey: undefined,
  });
};

describe('OpenAlexConnector', () => {
  describe('getPublication', () => {
    describe('when the work exists', () => {
      let publication;

      beforeEach(async () => {
        publication = await createConnector({
          id: 'https://openalex.org/W1',
          title: 'A Paper',
          doi: 'https://doi.org/10.1/x',
        }).getPublication('W1');
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
    });
  });

  describe('getContributions', () => {
    describe('when the work has authors', () => {
      let contributions;

      beforeEach(async () => {
        contributions = await createConnector({
          id: 'https://openalex.org/W1',
          authorships: [
            { author: { id: 'https://openalex.org/A1' } },
            { author: { id: 'https://openalex.org/A2' } },
          ],
        }).getContributions('W1');
      });

      it('numbers the positions by order', () => {
        expect(contributions.map((entry) => entry.position)).toEqual([1, 2]);
      });

      it('carries the pub id and a short author id', () => {
        expect(contributions[0]).toEqual({
          pubId: 'W1',
          authorId: 'A1',
          position: 1,
        });
      });
    });
  });

  describe('getCitations', () => {
    describe('when the results span multiple pages', () => {
      let citations;

      beforeEach(async () => {
        citations = await createConnector(
          {
            results: [{ id: 'https://openalex.org/W2', title: 'W2' }],
            meta: { next_cursor: 'c2' },
          },
          {
            results: [{ id: 'https://openalex.org/W3', title: 'W3' }],
            meta: { next_cursor: null },
          },
        ).getCitations('W1');
      });

      it('follows the cursor until it is exhausted', () => {
        expect(citations.map((pub) => pub.pubId)).toEqual(['W2', 'W3']);
      });
    });
  });

  describe('searchAuthors', () => {
    describe('when authors match', () => {
      let authors;

      beforeEach(async () => {
        authors = await createConnector({
          results: [{ id: 'https://openalex.org/A1', display_name: 'Jane Roe' }],
        }).searchAuthors('jane');
      });

      it('maps the results', () => {
        expect(authors).toEqual([
          {
            authorId: 'A1',
            originalName: 'Jane Roe',
            normalisedName: 'jane roe',
          },
        ]);
      });
    });
  });
});
