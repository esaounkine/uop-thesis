import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { directFetchTtlMs, searchTtlMs } from '../../../config/env.js';
import { SemanticScholarConnector } from '../SemanticScholarConnector.js';

const emptyPage = {
  data: [],
};

describe('SemanticScholarConnector', () => {
  let httpClientMock;
  let connector;

  beforeEach(() => {
    httpClientMock = {
      getJson: jest.fn(),
    };
    connector = new SemanticScholarConnector({
      httpClient: httpClientMock,
      baseUrl: 'https://api.semanticscholar.org/graph/v1',
      apiKey: undefined,
    });
  });

  describe('searchAuthors', () => {
    describe('when authors match', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockResolvedValue({
          data: {
            data: [
              {
                authorId: 'a1',
                name: 'Jane Roe',
                affiliations: ['University 1'],
              },
            ],
          },
        });
      });

      it('maps them to authors', async () => {
        expect(await connector.searchAuthors('jane')).toEqual([
          {
            authorId: 'a1',
            originalName: 'Jane Roe',
            normalisedName: 'jane roe',
            organisation: 'University 1',
          },
        ]);
      });

      it('keeps the base path in the request url', async () => {
        await connector.searchAuthors('test');
        const [url] = httpClientMock.getJson.mock.calls[0];
        expect(url.pathname).toBe('/graph/v1/author/search');
      });
    });

    describe('when no author matches', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockResolvedValue({
          data: {
            data: [],
          },
        });
      });

      it('returns an empty list', async () => {
        expect(await connector.searchAuthors('jane')).toEqual([]);
      });
    });

    describe('when the http client rejects', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockRejectedValue(new Error('error-1'));
      });

      it('propagates the error', async () => {
        await expect(connector.searchAuthors('jane')).rejects.toThrow('error-1');
      });
    });
  });

  describe('getAuthorById', () => {
    describe('when the author exists', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockResolvedValue({
          data: {
            authorId: 'a1',
            name: 'Jane Roe',
            affiliations: ['University 1'],
          },
        });
      });

      it('maps it to an author', async () => {
        expect(await connector.getAuthorById('a1')).toEqual({
          authorId: 'a1',
          originalName: 'Jane Roe',
          normalisedName: 'jane roe',
          organisation: 'University 1',
        });
      });

      describe('and cache is enabled (default)', () => {
        it('reads through the direct-fetch ttl', async () => {
          await connector.getAuthorById('a1');
          expect(httpClientMock.getJson).toHaveBeenCalledWith(
            expect.any(URL),
            directFetchTtlMs,
            expect.anything(),
            expect.anything(),
          );
        });
      });

      describe('and cache is disabled', () => {
        it('skips the cache', async () => {
          await connector.getAuthorById('a1', { cache: false });
          expect(httpClientMock.getJson).toHaveBeenCalledWith(
            expect.any(URL),
            null,
            expect.anything(),
            expect.anything(),
          );
        });
      });
    });

    describe('when the http client rejects', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockRejectedValue(new Error('error-1'));
      });

      it('propagates the error', async () => {
        await expect(connector.getAuthorById('a1')).rejects.toThrow('error-1');
      });
    });
  });

  describe('getAuthorPublications', () => {
    describe('when the http client returns a page', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockResolvedValue({ data: emptyPage });
      });

      describe('and the cache is enabled (default)', () => {
        it('reads through the search ttl', async () => {
          await connector.getAuthorPublications('a1');
          expect(httpClientMock.getJson).toHaveBeenCalledWith(
            expect.any(URL),
            searchTtlMs,
            expect.anything(),
            expect.anything(),
          );
        });
      });

      describe('and the cache is disabled', () => {
        it('skips the cache', async () => {
          await connector.getAuthorPublications('a1', { cache: false });
          expect(httpClientMock.getJson).toHaveBeenCalledWith(
            expect.any(URL),
            null,
            expect.anything(),
            expect.anything(),
          );
        });
      });
    });

    describe('when the http client rejects', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockRejectedValue(new Error('error-1'));
      });

      it('propagates the error', async () => {
        await expect(connector.getAuthorPublications('a1')).rejects.toThrow('error-1');
      });
    });
  });

  describe('getCitations', () => {
    describe('when a citing paper is returned', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockResolvedValue({
          data: {
            data: [
              {
                citingPaper: {
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
                },
              },
            ],
          },
        });
      });

      it('maps it to a publication', async () => {
        const [publication] = await connector.getCitations('p0');
        expect(publication).toEqual({
          pubId: 'p1',
          title: 'A Paper',
          normalisedTitle: 'a paper',
          externalId: '10.1/x',
          year: 2020,
          citationCount: 7,
          contributions: [
            {
              pubId: 'p1',
              authorId: 'a1',
              authorName: 'Jane Roe',
              position: 1,
            },
            {
              pubId: 'p1',
              authorId: 'a2',
              authorName: 'John Doe',
              position: 2,
            },
          ],
        });
      });

      describe('and the cache is enabled (default)', () => {
        it('reads through the search ttl', async () => {
          await connector.getCitations('p0');
          expect(httpClientMock.getJson).toHaveBeenCalledWith(
            expect.any(URL),
            searchTtlMs,
            expect.anything(),
            expect.anything(),
          );
        });
      });

      describe('and the cache is disabled', () => {
        it('skips the cache', async () => {
          await connector.getCitations('p0', { cache: false });
          expect(httpClientMock.getJson).toHaveBeenCalledWith(
            expect.any(URL),
            null,
            expect.anything(),
            expect.anything(),
          );
        });
      });
    });

    describe('when a citing author has no id', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockResolvedValue({
          data: {
            data: [
              {
                citingPaper: {
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
                },
              },
            ],
          },
        });
      });

      it('drops it but keeps the position of the rest', async () => {
        const [publication] = await connector.getCitations('p0');
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

    describe('when a citing paper has no id', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockResolvedValue({
          data: {
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
          },
        });
      });

      it('drops the unidentified citing paper', async () => {
        const citations = await connector.getCitations('p1');
        expect(citations.map((publication) =>
          publication.pubId)).toEqual(['p2']);
      });
    });

    describe('when the results span several pages', () => {
      beforeEach(() => {
        httpClientMock.getJson
          .mockResolvedValueOnce({
            data: {
              data: [{ citingPaper: { paperId: 'p2' } }],
              next: 1,
            },
          })
          .mockResolvedValueOnce({
            data: {
              data: [{ citingPaper: { paperId: 'p3' } }],
            },
          });
      });

      it('follows the offset until it is exhausted', async () => {
        const citations = await connector.getCitations('p1');
        expect(citations.map((publication) =>
          publication.pubId)).toEqual(['p2', 'p3']);
      });
    });

    describe('when a later page rejects', () => {
      beforeEach(() => {
        httpClientMock.getJson
          .mockResolvedValueOnce({
            data: {
              data: [{ citingPaper: { paperId: 'p2' } }],
              next: 1,
            },
          })
          .mockRejectedValueOnce(new Error('error-2'));
      });

      it('propagates the error', async () => {
        await expect(connector.getCitations('p1')).rejects.toThrow('error-2');
      });
    });

    describe('when the http client rejects', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockRejectedValue(new Error('error-1'));
      });

      it('propagates the error', async () => {
        await expect(connector.getCitations('p1')).rejects.toThrow('error-1');
      });
    });
  });
});
