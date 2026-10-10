import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { directFetchTtlMs, searchTtlMs } from '../../../../config/env.js';
import { HttpError } from '../../../../lib/HttpClient.js';
import { SerpApiConnector } from '../SerpApiConnector.js';

describe('SerpApiConnector', () => {
  let httpClientMock;
  let connector;

  beforeEach(() => {
    httpClientMock = {
      getJson: jest.fn(),
    };
    connector = new SerpApiConnector({
      httpClient: httpClientMock,
      baseUrl: 'https://serpapi.com',
      apiKeys: ['secret'],
    });
  });

  describe('searchAuthors', () => {
    describe('when profiles match', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockResolvedValue({
          data: {
            profiles: {
              authors: [
                {
                  author_id: 'A1',
                  name: 'Jane Roe',
                  affiliations: 'University 1',
                },
              ],
            },
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

    describe('when no profile matches', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockResolvedValue({ data: {} });
      });

      it('returns an empty list', async () => {
        expect(await connector.searchAuthors('jane')).toEqual([]);
      });
    });

    describe('when the http client rejects (not rate limited)', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockRejectedValue(new Error('error-1'));
      });

      it('propagates the error', async () => {
        await expect(connector.searchAuthors('jane')).rejects.toThrow('error-1');
      });

      describe('and there are more keys', () => {
        beforeEach(() => {
          connector = new SerpApiConnector({
            httpClient: httpClientMock,
            apiKeys: ['key-1', 'key-2'],
          });
        });

        it('does not switch keys', async () => {
          await expect(connector.searchAuthors('jane')).rejects.toThrow('error-1');
          expect(httpClientMock.getJson).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe('when the http client rejects (rate limited)', () => {
      let rateLimitError;

      beforeEach(() => {
        rateLimitError = new HttpError({ status: 429 });
      });

      describe('and there is a single key', () => {
        beforeEach(() => {
          httpClientMock.getJson.mockRejectedValue(rateLimitError);
        });

        it('propagates the error', async () => {
          await expect(connector.searchAuthors('jane')).rejects.toBe(rateLimitError);
        });

        it('does not check the quota', async () => {
          await expect(connector.searchAuthors('jane')).rejects.toBe(rateLimitError);
          expect(httpClientMock.getJson).toHaveBeenCalledTimes(1);
        });
      });

      describe('and there are more keys', () => {
        beforeEach(() => {
          connector = new SerpApiConnector({
            httpClient: httpClientMock,
            apiKeys: ['key-1', 'key-2'],
          });
        });

        describe('and the key has no searches left', () => {
          beforeEach(() => {
            httpClientMock.getJson
              .mockRejectedValueOnce(rateLimitError)
              .mockResolvedValueOnce({ data: { total_searches_left: 0 } })
              .mockResolvedValueOnce({ data: { profiles: { authors: [] } } })
              .mockResolvedValue({ data: {} });
          });

          it('checks the quota of the key', async () => {
            await connector.searchAuthors('jane');
            const [
              url, , , query,
            ] = httpClientMock.getJson.mock.calls[1];
            expect([url.pathname, query.api_key.value])
              .toEqual(['/account.json', 'key-1']);
          });

          it('retries with the next key', async () => {
            await connector.searchAuthors('jane');
            const [
              , , , query,
            ] = httpClientMock.getJson.mock.calls[2];
            expect(query.api_key.value).toBe('key-2');
          });

          it('returns the result of the retry', async () => {
            expect(await connector.searchAuthors('jane')).toEqual([]);
          });

          it('reports the key as exhausted', async () => {
            await connector.searchAuthors('jane');
            const quota = await connector.getQuota();
            expect(quota.map((entry) =>
              [
                entry.apiKey,
                entry.current,
                entry.exhausted,
              ])).toEqual([
              [
                'key-1',
                false,
                true,
              ],
              [
                'key-2',
                true,
                false,
              ],
            ]);
          });
        });

        describe('and the key still has searches left', () => {
          beforeEach(() => {
            httpClientMock.getJson
              .mockRejectedValueOnce(rateLimitError)
              .mockResolvedValueOnce({ data: { total_searches_left: 50 } })
              .mockResolvedValueOnce({ data: { profiles: { authors: [] } } })
              .mockResolvedValue({ data: {} });
          });

          it('retries with the next key', async () => {
            await connector.searchAuthors('jane');
            const [
              , , , query,
            ] = httpClientMock.getJson.mock.calls[2];
            expect(query.api_key.value).toBe('key-2');
          });

          it('keeps the key usable', async () => {
            await connector.searchAuthors('jane');
            const quota = await connector.getQuota();
            expect(quota.map((entry) =>
              entry.exhausted)).toEqual([false, false]);
          });
        });

        describe('but the quota check fails', () => {
          beforeEach(() => {
            httpClientMock.getJson
              .mockRejectedValueOnce(rateLimitError)
              .mockRejectedValueOnce(new Error('error-2'))
              .mockResolvedValueOnce({ data: { profiles: { authors: [] } } });
          });

          it('retries with the next key', async () => {
            expect(await connector.searchAuthors('jane')).toEqual([]);
            const [
              , , , query,
            ] = httpClientMock.getJson.mock.calls[2];
            expect(query.api_key.value).toBe('key-2');
          });
        });

        describe('but the next key is rate limited too', () => {
          beforeEach(() => {
            httpClientMock.getJson
              .mockRejectedValueOnce(rateLimitError)
              .mockResolvedValueOnce({ data: { total_searches_left: 0 } })
              .mockRejectedValueOnce(rateLimitError);
          });

          it('propagates the error', async () => {
            await expect(connector.searchAuthors('jane')).rejects.toBe(rateLimitError);
          });
        });
      });
    });
  });

  describe('getAuthorById', () => {
    describe('when the author exists', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockResolvedValue({
          data: {
            author: {
              name: 'Jane Roe',
              affiliations: 'University 1',
            },
          },
        });
      });

      it('maps it to an author with the requested id', async () => {
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
            expect.anything(),
          );
        });
      });

      describe('and cache is disabled', () => {
        it('skips the cache', async () => {
          await connector.getAuthorById('A1', { cache: false });
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
        await expect(connector.getAuthorById('A1')).rejects.toThrow('error-1');
      });
    });
  });

  describe('getAuthorPublications', () => {
    describe('when an article is returned', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockResolvedValue({
          data: {
            author: {
              name: 'Jane Roe',
              affiliations: 'University 1',
            },
            articles: [
              {
                title: 'A Paper',
                citation_id: 'A1:cit1',
                year: '2020',
                cited_by: {
                  value: 7,
                  cites_id: 'clust123',
                },
              },
            ],
          },
        });
      });

      it('maps it to a publication under the cluster id', async () => {
        const [publication] = await connector.getAuthorPublications('A1');
        expect(publication).toEqual({
          pubId: 'clust123',
          title: 'A Paper',
          normalisedTitle: 'a paper',
          externalId: null,
          year: 2020,
          citationCount: 7,
          contributions: [
            {
              pubId: 'clust123',
              authorId: 'A1',
              authorName: 'Jane Roe',
              organisation: 'University 1',
              position: 1,
            },
          ],
        });
      });

      describe('and cache is enabled (default)', () => {
        it('reads through the search ttl', async () => {
          await connector.getAuthorPublications('A1');
          expect(httpClientMock.getJson).toHaveBeenCalledWith(
            expect.any(URL),
            searchTtlMs,
            expect.anything(),
            expect.anything(),
          );
        });
      });

      describe('and cache is disabled', () => {
        it('skips the cache', async () => {
          await connector.getAuthorPublications('A1', { cache: false });
          expect(httpClientMock.getJson).toHaveBeenCalledWith(
            expect.any(URL),
            null,
            expect.anything(),
            expect.anything(),
          );
        });
      });
    });

    describe('when an article has no citations', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockResolvedValue({
          data: {
            author: { name: 'Jane Roe' },
            articles: [
              {
                title: 'Uncited',
                citation_id: 'A1:cit2',
              },
            ],
          },
        });
      });

      it('falls back to the citation id', async () => {
        const [publication] = await connector.getAuthorPublications('A1');
        expect(publication.pubId).toBe('A1:cit2');
      });
    });

    describe('when the articles span several pages', () => {
      beforeEach(() => {
        httpClientMock.getJson
          .mockResolvedValueOnce({
            data: {
              author: { name: 'Jane Roe' },
              articles: [{ citation_id: 'c1' }],
              serpapi_pagination: { next: 'page-2' },
            },
          })
          .mockResolvedValueOnce({
            data: {
              author: { name: 'Jane Roe' },
              articles: [{ citation_id: 'c2' }],
            },
          });
      });

      it('follows the next page until there is none', async () => {
        const publications = await connector.getAuthorPublications('A1');
        expect(publications).toHaveLength(2);
      });
    });

    describe('when a later page rejects', () => {
      beforeEach(() => {
        httpClientMock.getJson
          .mockResolvedValueOnce({
            data: {
              author: { name: 'Jane Roe' },
              articles: [{ citation_id: 'c1' }],
              serpapi_pagination: { next: 'page-2' },
            },
          })
          .mockRejectedValueOnce(new Error('error-2'));
      });

      it('propagates the error', async () => {
        await expect(connector.getAuthorPublications('A1'))
          .rejects.toThrow('error-2');
      });
    });

    describe('when the http client rejects', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockRejectedValue(new Error('error-1'));
      });

      it('propagates the error', async () => {
        await expect(connector.getAuthorPublications('A1'))
          .rejects.toThrow('error-1');
      });
    });
  });

  describe('getCitations', () => {
    describe('when a citing paper is returned', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockResolvedValue({
          data: {
            organic_results: [
              {
                result_id: 'r1',
                title: 'Citing Paper',
                inline_links: {
                  cited_by: {
                    total: 3,
                  },
                },
                publication_info: {
                  authors: [
                    {
                      name: 'Amy Ng',
                      author_id: 'B1',
                    },
                  ],
                },
              },
            ],
          },
        });
      });

      it('maps it to a publication', async () => {
        const [publication] = await connector.getCitations('clust123');
        expect(publication).toEqual({
          pubId: 'r1',
          title: 'Citing Paper',
          normalisedTitle: 'citing paper',
          externalId: null,
          year: null,
          citationCount: 3,
          contributions: [
            {
              pubId: 'r1',
              authorId: 'B1',
              authorName: 'Amy Ng',
              position: 1,
            },
          ],
        });
      });

      describe('and cache is enabled (default)', () => {
        it('reads through the search ttl', async () => {
          await connector.getCitations('clust123');
          expect(httpClientMock.getJson).toHaveBeenCalledWith(
            expect.any(URL),
            searchTtlMs,
            expect.anything(),
            expect.anything(),
          );
        });
      });

      describe('and cache is disabled', () => {
        it('skips the cache', async () => {
          await connector.getCitations('clust123', { cache: false });
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
            organic_results: [
              {
                result_id: 'r1',
                publication_info: {
                  authors: [
                    {
                      name: 'Anon',
                      author_id: null,
                    },
                    {
                      name: 'Amy Ng',
                      author_id: 'B2',
                    },
                  ],
                },
              },
            ],
          },
        });
      });

      it('keeps it under the normalised name as its id', async () => {
        const [publication] = await connector.getCitations('clust123');
        expect(publication.contributions).toEqual([
          {
            pubId: 'r1',
            authorId: 'anon',
            authorName: 'Anon',
            position: 1,
          },
          {
            pubId: 'r1',
            authorId: 'B2',
            authorName: 'Amy Ng',
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
              organic_results: [{ result_id: 'r1' }],
              serpapi_pagination: { next: 'page-2' },
            },
          })
          .mockResolvedValueOnce({
            data: {
              organic_results: [{ result_id: 'r2' }],
            },
          });
      });

      it('follows the next page until there is none', async () => {
        const citations = await connector.getCitations('clust123');
        expect(citations).toHaveLength(2);
      });
    });

    describe('when a later page rejects', () => {
      beforeEach(() => {
        httpClientMock.getJson
          .mockResolvedValueOnce({
            data: {
              organic_results: [{ result_id: 'r1' }],
              serpapi_pagination: { next: 'page-2' },
            },
          })
          .mockRejectedValueOnce(new Error('error-2'));
      });

      it('propagates the error', async () => {
        await expect(connector.getCitations('clust123'))
          .rejects.toThrow('error-2');
      });
    });

    describe('when the http client rejects', () => {
      beforeEach(() => {
        httpClientMock.getJson.mockRejectedValue(new Error('error-1'));
      });

      it('propagates the error', async () => {
        await expect(connector.getCitations('clust123'))
          .rejects.toThrow('error-1');
      });
    });
  });

  describe('getQuota', () => {
    describe('when there is an api key', () => {
      describe('and the account is returned', () => {
        beforeEach(() => {
          httpClientMock.getJson.mockResolvedValue({
            data: {
              searches_per_month: 10_000,
              this_month_usage: 250,
              total_searches_left: 9_750,
              plan_renewal_date: '2026-09-01',
            },
          });
        });

        it('maps the account usage of the key', async () => {
          expect(await connector.getQuota()).toEqual([
            {
              apiKey: 'secret',
              current: true,
              exhausted: false,
              creditsLimit: 10_000,
              creditsUsed: 250,
              creditsRemaining: 9_750,
              resetsAt: '2026-09-01',
            },
          ]);
        });

        describe('and there are more keys', () => {
          beforeEach(() => {
            connector = new SerpApiConnector({
              httpClient: httpClientMock,
              apiKeys: ['key-1', 'key-2'],
            });
          });

          it('reports every key', async () => {
            const quota = await connector.getQuota();
            expect(quota.map((entry) =>
              [entry.apiKey, entry.current])).toEqual([['key-1', true], ['key-2', false]]);
          });

          it('queries the account of each key', async () => {
            await connector.getQuota();
            expect(httpClientMock.getJson.mock.calls.map(([
              , , , query,
            ]) =>
              query.api_key.value)).toEqual(['key-1', 'key-2']);
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
        connector = new SerpApiConnector({
          httpClient: httpClientMock,
          apiKeys: [],
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
