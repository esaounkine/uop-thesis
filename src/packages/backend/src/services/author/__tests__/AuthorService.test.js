import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { AuthorService } from '../AuthorService.js';

describe('AuthorService', () => {
  let connectorMock;
  let jobServiceMock;
  let authorService;

  beforeEach(() => {
    connectorMock = {
      id: 'openalex',
      searchAuthors: jest.fn(),
      getAuthorById: jest.fn(),
      getAuthorPublications: jest.fn(),
    };
    jobServiceMock = {
      getLastUpdateJob: jest.fn(),
    };
    authorService = new AuthorService([connectorMock], jobServiceMock);
  });

  describe('searchByName', () => {
    describe('when the provider returns candidates', () => {
      beforeEach(() => {
        connectorMock.searchAuthors.mockResolvedValue([
          {
            authorId: 'A1',
            originalName: 'Jane Roe',
          },
        ]);
      });

      describe('and a stored job exists', () => {
        beforeEach(() => {
          jobServiceMock.getLastUpdateJob.mockReturnValue({
            updatedAt: '2026-08-20T00:00:00.000Z',
          });
        });

        it('tags the author with the stored date', async () => {
          const result = await authorService.searchByName('roe');
          expect(result).toEqual([
            {
              provider: 'openalex',
              authors: [
                {
                  authorId: 'A1',
                  originalName: 'Jane Roe',
                  storedAt: '2026-08-20T00:00:00.000Z',
                },
              ],
            },
          ]);
        });
      });

      describe('and no stored job exists', () => {
        beforeEach(() => {
          jobServiceMock.getLastUpdateJob.mockReturnValue(undefined);
        });

        it('tags the author with a null stored date', async () => {
          const [entry] = await authorService.searchByName('roe');
          expect(entry.authors[0].storedAt).toBeNull();
        });
      });
    });

    describe('and the provider returns no candidates', () => {
      beforeEach(() => {
        connectorMock.searchAuthors.mockResolvedValue([]);
      });

      it('returns the provider with an empty list', async () => {
        const result = await authorService.searchByName('roe');
        expect(result).toEqual([
          {
            provider: 'openalex',
            authors: [],
          },
        ]);
      });
    });

    describe('but the provider search rejects', () => {
      beforeEach(() => {
        connectorMock.searchAuthors.mockRejectedValue(new Error('error-1'));
      });

      it('reports the error for that provider', async () => {
        const result = await authorService.searchByName('roe');
        expect(result).toEqual([
          {
            provider: 'openalex',
            error: 'error-1',
          },
        ]);
      });
    });

    describe('but one of several providers fails', () => {
      beforeEach(() => {
        const okConnectorMock = {
          id: 'openalex',
          searchAuthors: jest.fn().mockResolvedValue([{ authorId: 'A1' }]),
        };
        const failConnectorMock = {
          id: 'semanticscholar',
          searchAuthors: jest.fn().mockRejectedValue(new Error('error-2')),
        };
        jobServiceMock.getLastUpdateJob.mockReturnValue(undefined);
        authorService = new AuthorService(
          [okConnectorMock, failConnectorMock],
          jobServiceMock,
        );
      });

      it('isolates the failure to its provider', async () => {
        const result = await authorService.searchByName('roe');
        expect(result).toEqual([
          {
            provider: 'openalex',
            authors: [
              {
                authorId: 'A1',
                storedAt: null,
              },
            ],
          },
          {
            provider: 'semanticscholar',
            error: 'error-2',
          },
        ]);
      });
    });
  });

  describe('getProviderPublications', () => {
    describe('when the provider is unknown', () => {
      it('is a 404', async () => {
        await expect(authorService.getProviderPublications('nope', 'A1'))
          .rejects.toThrow('unknown provider: nope');
      });
    });

    describe('when the provider is known', () => {
      describe('but the author is not found', () => {
        beforeEach(() => {
          connectorMock.getAuthorById.mockResolvedValue(null);
        });

        it('returns null', async () => {
          expect(await authorService.getProviderPublications('openalex', 'missing'))
            .toBeNull();
        });

        it('does not fetch publications', async () => {
          await authorService.getProviderPublications('openalex', 'missing');
          expect(connectorMock.getAuthorPublications).not.toHaveBeenCalled();
        });
      });

      describe('but the author fetch rejects', () => {
        beforeEach(() => {
          connectorMock.getAuthorById.mockRejectedValue(new Error('error-3'));
        });

        it('propagates the error', async () => {
          await expect(authorService.getProviderPublications('openalex', 'A1'))
            .rejects.toThrow('error-3');
        });
      });

      describe('and the author is found', () => {
        beforeEach(() => {
          connectorMock.getAuthorById.mockResolvedValue({ authorId: 'A1' });
        });

        describe('and the publications fetch succeeds', () => {
          const publications = [{ pubId: 'W1' }, { pubId: 'W2' }];

          beforeEach(() => {
            connectorMock.getAuthorPublications.mockResolvedValue(publications);
          });

          it('returns the author', async () => {
            const result = await authorService.getProviderPublications('openalex', 'A1');
            expect(result.author).toEqual({ authorId: 'A1' });
          });

          it('returns their publications', async () => {
            const result = await authorService.getProviderPublications('openalex', 'A1');
            expect(result.publications).toBe(publications);
          });

          describe('and the cache is enabled (default)', () => {
            it('uses the cache for the author fetch', async () => {
              await authorService.getProviderPublications('openalex', 'A1');
              expect(connectorMock.getAuthorById)
                .toHaveBeenCalledWith('A1', { cache: true });
            });

            it('uses the cache for the publications fetch', async () => {
              await authorService.getProviderPublications('openalex', 'A1');
              expect(connectorMock.getAuthorPublications)
                .toHaveBeenCalledWith('A1', { cache: true });
            });
          });

          describe('and the cache is disabled', () => {
            it('forwards the flag to the author fetch', async () => {
              await authorService.getProviderPublications('openalex', 'A1', { cache: false });
              expect(connectorMock.getAuthorById)
                .toHaveBeenCalledWith('A1', { cache: false });
            });

            it('forwards the flag to the publications fetch', async () => {
              await authorService.getProviderPublications('openalex', 'A1', { cache: false });
              expect(connectorMock.getAuthorPublications)
                .toHaveBeenCalledWith('A1', { cache: false });
            });
          });
        });

        describe('but the publications fetch rejects', () => {
          beforeEach(() => {
            connectorMock.getAuthorPublications.mockRejectedValue(new Error('error-4'));
          });

          it('propagates the error', async () => {
            await expect(authorService.getProviderPublications('openalex', 'A1'))
              .rejects.toThrow('error-4');
          });
        });
      });
    });
  });
});
