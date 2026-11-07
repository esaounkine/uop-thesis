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

  describe('getProviderAuthor', () => {
    describe('when the provider is unknown', () => {
      it('returns a 404', async () => {
        await expect(authorService.getProviderAuthor('nope', 'A1'))
          .rejects.toMatchObject({ status: 404 });
      });
    });

    describe('when the provider is known', () => {
      describe('but the author is not found', () => {
        beforeEach(() => {
          connectorMock.getAuthorById.mockResolvedValue(null);
        });

        it('returns null', async () => {
          expect(await authorService.getProviderAuthor('openalex', 'A1')).toBeNull();
        });

        it('does not look up a job', async () => {
          await authorService.getProviderAuthor('openalex', 'A1');
          expect(jobServiceMock.getLastUpdateJob).not.toHaveBeenCalled();
        });
      });

      describe('but the author lookup rejects', () => {
        beforeEach(() => {
          connectorMock.getAuthorById.mockRejectedValue(new Error('error-5'));
        });

        it('propagates the error', async () => {
          await expect(authorService.getProviderAuthor('openalex', 'A1'))
            .rejects.toThrow('error-5');
        });
      });

      describe('and the author is found', () => {
        beforeEach(() => {
          connectorMock.getAuthorById.mockResolvedValue(Object.freeze({ authorId: 'A1' }));
        });

        it('looks up the author by id', async () => {
          await authorService.getProviderAuthor('openalex', 'A1');
          expect(connectorMock.getAuthorById).toHaveBeenCalledWith('A1');
        });

        it('does not fetch papers', async () => {
          await authorService.getProviderAuthor('openalex', 'A1');
          expect(connectorMock.getAuthorPublications).not.toHaveBeenCalled();
        });

        it('looks up the job using both keys', async () => {
          await authorService.getProviderAuthor('openalex', 'A1');
          expect(jobServiceMock.getLastUpdateJob).toHaveBeenCalledWith('openalex', 'A1');
        });

        describe('and no stored job exists', () => {
          beforeEach(() => {
            jobServiceMock.getLastUpdateJob.mockReturnValue(null);
          });

          it('returns the author without a stored date', async () => {
            expect(await authorService.getProviderAuthor('openalex', 'A1')).toEqual({
              authorId: 'A1',
              storedAt: null,
            });
          });
        });

        describe('and a stored job exists', () => {
          beforeEach(() => {
            jobServiceMock.getLastUpdateJob.mockReturnValue({ updatedAt: '2026-09-07' });
          });

          it('returns the author with the stored date', async () => {
            expect(await authorService.getProviderAuthor('openalex', 'A1')).toEqual({
              authorId: 'A1',
              storedAt: '2026-09-07',
            });
          });
        });

        describe('but the job lookup throws', () => {
          beforeEach(() => {
            jobServiceMock.getLastUpdateJob.mockImplementation(() => {
              throw new Error('error-6');
            });
          });

          it('propagates the error', async () => {
            await expect(authorService.getProviderAuthor('openalex', 'A1'))
              .rejects.toThrow('error-6');
          });
        });
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
