import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { directFetchTtlMs, searchTtlMs } from '../../../config/env.js';
import { OpenAlexConnector } from '../OpenAlexConnector.js';

const emptyPage = {
  results: [],
  meta: {
    next_cursor: null,
  },
};

describe('OpenAlexConnector', () => {
  let httpClientMock;
  let connector;

  beforeEach(() => {
    httpClientMock = {
      getJson: jest.fn(),
    };
    connector = new OpenAlexConnector({
      httpClient: httpClientMock,
      baseUrl: 'https://api.openalex.org',
      apiKey: undefined,
    });
  });

  describe('searchAuthors', () => {
    describe('when authors match', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockResolvedValue({
          data: {
            results: [
              {
                id: 'https://openalex.org/A1',
                display_name: 'Jane Roe',
                last_known_institutions: [{ display_name: 'University 1' }],
              },
            ],
          },
        });
      });

      it('maps them to authors', async () => {
        expect(await connector.searchAuthors('jane')).toEqual([
          {
            authorId: 'A1',
            originalName: 'Jane Roe',
            normalisedName: 'jane roe',
            organisation: 'University 1',
          },
        ]);
      });
    });

    describe('when no author matches', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockResolvedValue({
          data: {
            results: [],
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
            id: 'https://openalex.org/A1',
            display_name: 'Jane Roe',
            last_known_institutions: [{ display_name: 'University 1' }],
          },
        });
      });

      it('maps it to an author', async () => {
        expect(await connector.getAuthorById('A1')).toEqual({
          authorId: 'A1',
          originalName: 'Jane Roe',
          normalisedName: 'jane roe',
          organisation: 'University 1',
        });
      });

      describe('and cache is enabled (default)', () => {
        it('reads through the direct-fetch ttl', async () => {
          await connector.getAuthorById('A1');
          expect(httpClientMock.getJson).toHaveBeenCalledWith(
            expect.any(URL),
            directFetchTtlMs,
            expect.anything(),
          );
        });
      });

      describe('and cache is disabled', () => {
        it('skips the cache', async () => {
          await connector.getAuthorById('A1', { cache: false });
          expect(httpClientMock.getJson)
            .toHaveBeenCalledWith(expect.any(URL), null, expect.anything());
        });
      });
    });

    describe('when the http client rejects', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockRejectedValue(new Error('error-1'));
      });

      it('propagates the error', async () => {
        await expect(connector.getAuthorById('A1')).rejects.toThrow('error-1');
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
          await connector.getAuthorPublications('A1');
          expect(httpClientMock.getJson).toHaveBeenCalledWith(
            expect.any(URL),
            searchTtlMs,
            expect.anything(),
          );
        });
      });

      describe('and the cache is disabled', () => {
        it('skips the cache', async () => {
          await connector.getAuthorPublications('A1', { cache: false });
          expect(httpClientMock.getJson)
            .toHaveBeenCalledWith(expect.any(URL), null, expect.anything());
        });
      });
    });

    describe('when the http client rejects', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockRejectedValue(new Error('error-1'));
      });

      it('propagates the error', async () => {
        await expect(connector.getAuthorPublications('A1')).rejects.toThrow('error-1');
      });
    });
  });

  describe('getCitations', () => {
    describe('when a work is returned', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockResolvedValue({
          data: {
            results: [
              {
                id: 'https://openalex.org/W1',
                title: 'A Paper',
                doi: 'https://doi.org/10.1/x',
                publication_year: 2020,
                cited_by_count: 7,
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
              },
            ],
            meta: {
              next_cursor: null,
            },
          },
        });
      });

      it('maps it to a publication', async () => {
        const [publication] = await connector.getCitations('W0');
        expect(publication).toEqual({
          pubId: 'W1',
          title: 'A Paper',
          normalisedTitle: 'a paper',
          externalId: 'https://doi.org/10.1/x',
          year: 2020,
          citationCount: 7,
          contributions: [
            {
              pubId: 'W1',
              authorId: 'A1',
              authorName: 'Jane Roe',
              organisation: 'University 1',
              position: 1,
            },
            {
              pubId: 'W1',
              authorId: 'A2',
              authorName: 'John Doe',
              organisation: null,
              position: 2,
            },
          ],
        });
      });

      describe('and the cache is enabled (default)', () => {
        it('reads through the search ttl', async () => {
          await connector.getCitations('W0');
          expect(httpClientMock.getJson).toHaveBeenCalledWith(
            expect.any(URL),
            searchTtlMs,
            expect.anything(),
          );
        });
      });

      describe('and the cache is disabled', () => {
        it('skips the cache', async () => {
          await connector.getCitations('W0', { cache: false });
          expect(httpClientMock.getJson)
            .toHaveBeenCalledWith(expect.any(URL), null, expect.anything());
        });
      });
    });

    describe('when a work has an unmatched author', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockResolvedValue({
          data: {
            results: [
              {
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
              },
            ],
            meta: {
              next_cursor: null,
            },
          },
        });
      });

      it('drops it but keeps the position of the rest', async () => {
        const [publication] = await connector.getCitations('W0');
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

    describe('when the results span several pages', () => {
      beforeEach(() => {
        httpClientMock.getJson
          .mockResolvedValueOnce({
            data: {
              results: [{ id: 'https://openalex.org/W2' }],
              meta: {
                next_cursor: 'c2',
              },
            },
          })
          .mockResolvedValueOnce({
            data: {
              results: [{ id: 'https://openalex.org/W3' }],
              meta: {
                next_cursor: null,
              },
            },
          });
      });

      it('follows the cursor until it is exhausted', async () => {
        const citations = await connector.getCitations('W1');
        expect(citations.map((publication) =>
          publication.pubId)).toEqual(['W2', 'W3']);
      });
    });

    describe('when a later page rejects', () => {
      beforeEach(() => {
        httpClientMock.getJson
          .mockResolvedValueOnce({
            data: {
              results: [{ id: 'https://openalex.org/W2' }],
              meta: {
                next_cursor: 'c2',
              },
            },
          })
          .mockRejectedValueOnce(new Error('error-2'));
      });

      it('propagates the error', async () => {
        await expect(connector.getCitations('W1')).rejects.toThrow('error-2');
      });
    });

    describe('when the http client rejects', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockRejectedValue(new Error('error-1'));
      });

      it('propagates the error', async () => {
        await expect(connector.getCitations('W1')).rejects.toThrow('error-1');
      });
    });
  });

  describe('getQuota', () => {
    describe('when there is an api key', () => {
      beforeEach(() => {
        connector = new OpenAlexConnector({
          httpClient: httpClientMock,
          baseUrl: 'https://api.openalex.org',
          apiKey: 'secret',
        });
      });

      describe('and the quota is returned', () => {
        beforeEach(() => {
          httpClientMock.getJson.mockResolvedValue({
            data: {
              rate_limit: {
                credits_limit: 10_000,
                credits_used: 250,
                credits_remaining: 9_750,
                resets_at: '2026-08-23T00:00:00.000Z',
              },
            },
          });
        });

        it('maps the remaining credits', async () => {
          expect(await connector.getQuota()).toEqual({
            creditsLimit: 10_000,
            creditsUsed: 250,
            creditsRemaining: 9_750,
            resetsAt: '2026-08-23T00:00:00.000Z',
          });
        });
      });

      describe('but the http client rejects', () => {
        beforeEach(() => {
          httpClientMock.getJson.mockRejectedValue(new Error('error-1'));
        });

        it('propagates the error', async () => {
          await expect(connector.getQuota()).rejects.toThrow('error-1');
        });
      });
    });

    describe('when there is no api key', () => {
      beforeEach(() => {
        connector = new OpenAlexConnector({
          httpClient: httpClientMock,
          apiKey: null,
        });
      });

      it('returns null', async () => {
        expect(await connector.getQuota()).toBeNull();
      });

      it('does not query the http client', async () => {
        await connector.getQuota();
        expect(httpClientMock.getJson).not.toHaveBeenCalled();
      });
    });
  });
});
