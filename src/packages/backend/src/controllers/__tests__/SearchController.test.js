import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { SearchController } from '../SearchController.js';

describe('SearchController', () => {
  let authorServiceMock;
  let jobServiceMock;
  let controller;

  beforeEach(() => {
    authorServiceMock = {
      searchByName: jest.fn(),
    };
    jobServiceMock = {
      getLastUpdateJob: jest.fn(),
    };
    const providers = [
      {
        id: 'openalex',
        authorService: authorServiceMock,
      },
    ];
    controller = new SearchController(providers, jobServiceMock);
  });

  describe('searchAuthors', () => {
    const request = {
      query: {
        q: 'roe',
      },
    };

    describe('when no query term is provided', () => {
      it('is a 400', () => {
        expect(() =>
          controller.searchAuthors({ query: {} }))
          .toThrow('missing query parameter q');
      });
    });

    describe('when a query term is provided', () => {
      describe('and the provider returns candidates', () => {
        beforeEach(() => {
          authorServiceMock.searchByName.mockResolvedValue([
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
            const result = await controller.searchAuthors(request);
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
            const [entry] = await controller.searchAuthors(request);
            expect(entry.authors[0].storedAt).toBeNull();
          });
        });
      });

      describe('and the provider returns more than the candidate limit', () => {
        beforeEach(() => {
          const many = Array.from({ length: 12 }, (each, index) => {
            return {
              authorId: `A${index}`,
            };
          });
          authorServiceMock.searchByName.mockResolvedValue(many);
          jobServiceMock.getLastUpdateJob.mockReturnValue(undefined);
        });

        it('caps the candidates at ten', async () => {
          const [entry] = await controller.searchAuthors(request);
          expect(entry.authors).toHaveLength(10);
        });
      });

      describe('and the provider returns no candidates', () => {
        beforeEach(() => {
          authorServiceMock.searchByName.mockResolvedValue([]);
        });

        it('returns the provider with an empty list', async () => {
          const result = await controller.searchAuthors(request);
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
          authorServiceMock.searchByName.mockRejectedValue(new Error('error-1'));
        });

        it('reports the error for that provider', async () => {
          const result = await controller.searchAuthors(request);
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
          const okServiceMock = {
            searchByName: jest.fn().mockResolvedValue([{ authorId: 'A1' }]),
          };
          const failServiceMock = {
            searchByName: jest.fn().mockRejectedValue(new Error('error-2')),
          };
          jobServiceMock.getLastUpdateJob.mockReturnValue(undefined);
          controller = new SearchController(
            [
              {
                id: 'openalex',
                authorService: okServiceMock,
              },
              {
                id: 'semanticscholar',
                authorService: failServiceMock,
              },
            ],
            jobServiceMock,
          );
        });

        it('isolates the failure to its provider', async () => {
          const result = await controller.searchAuthors(request);
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
  });
});
