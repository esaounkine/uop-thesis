import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { CitationGraphService } from '../CitationGraphService.js';

const provider = 'openalex';

describe('CitationGraphService', () => {
  let publicationRepositoryMock;
  let authorRepositoryMock;
  let contributionRepositoryMock;
  let citationRepositoryMock;
  let citationGraphService;

  beforeEach(() => {
    publicationRepositoryMock = {
      saveAll: jest.fn(),
      findPublication: jest.fn(),
      findPublications: jest.fn().mockReturnValue([]),
    };
    authorRepositoryMock = {
      saveAll: jest.fn(),
      findAuthor: jest.fn(),
    };
    contributionRepositoryMock = {
      saveAll: jest.fn(),
      findContributions: jest.fn().mockReturnValue([]),
    };
    citationRepositoryMock = {
      saveAll: jest.fn(),
      findCitations: jest.fn().mockReturnValue([]),
    };
    citationGraphService = new CitationGraphService({
      publicationRepository: publicationRepositoryMock,
      authorRepository: authorRepositoryMock,
      contributionRepository: contributionRepositoryMock,
      citationRepository: citationRepositoryMock,
    });
  });

  describe('storePubTree', () => {
    const completeTree = {
      publication: {
        pubId: 'W1',
        title: 'W1',
        normalisedTitle: 'w1',
        externalId: null,
        year: 2020,
        contributions: [
          {
            pubId: 'W1',
            authorId: 'A1',
            authorName: 'Jane Roe',
            organisation: 'University 1',
            position: 1,
          },
        ],
      },
      citations: [
        {
          publication: {
            pubId: 'W2',
            title: 'W2',
            normalisedTitle: 'w2',
            externalId: null,
            year: 2019,
            contributions: [],
          },
          classification: 'self-direct',
        },
      ],
    };

    const treeWithoutCitations = {
      publication: completeTree.publication,
      citations: [],
    };

    describe('when the tree has citations', () => {
      it('stores the contributors', () => {
        citationGraphService.storePubTree(provider, completeTree);

        expect(authorRepositoryMock.saveAll).toHaveBeenCalledWith([
          {
            provider: provider,
            authorId: 'A1',
            originalName: 'Jane Roe',
            normalisedName: 'jane roe',
            organisation: 'University 1',
          },
        ]);
      });

      it('stores the contributions', () => {
        citationGraphService.storePubTree(provider, completeTree);

        expect(contributionRepositoryMock.saveAll).toHaveBeenCalledWith([
          {
            provider: provider,
            pubId: 'W1',
            authorId: 'A1',
            position: 1,
          },
        ]);
      });

      it('stores the cited publication', () => {
        citationGraphService.storePubTree(provider, completeTree);

        expect(publicationRepositoryMock.saveAll).toHaveBeenCalledWith(
          expect.arrayContaining([
            {
              provider: provider,
              pubId: 'W1',
              title: 'W1',
              normalisedTitle: 'w1',
              externalId: null,
              year: 2020,
            },
          ]),
        );
      });

      it('stores the citing publication', () => {
        citationGraphService.storePubTree(provider, completeTree);

        expect(publicationRepositoryMock.saveAll).toHaveBeenCalledWith(
          expect.arrayContaining([
            {
              provider: provider,
              pubId: 'W2',
              title: 'W2',
              normalisedTitle: 'w2',
              externalId: null,
              year: 2019,
            },
          ]),
        );
      });

      it('stores the citations', () => {
        citationGraphService.storePubTree(provider, completeTree);

        expect(citationRepositoryMock.saveAll).toHaveBeenCalledWith([
          {
            provider: provider,
            sourcePubId: 'W2',
            targetPubId: 'W1',
            classification: 'self-direct',
          },
        ]);
      });
    });

    describe('when the tree has no citations', () => {
      it('stores only the cited publication', () => {
        citationGraphService.storePubTree(provider, treeWithoutCitations);

        expect(publicationRepositoryMock.saveAll).toHaveBeenCalledTimes(1);
        expect(publicationRepositoryMock.saveAll).toHaveBeenCalledWith([
          {
            provider: provider,
            pubId: 'W1',
            title: 'W1',
            normalisedTitle: 'w1',
            externalId: null,
            year: 2020,
          },
        ]);
      });

      it('does not touch the citation repo', () => {
        citationGraphService.storePubTree(provider, treeWithoutCitations);

        expect(citationRepositoryMock.saveAll).not.toHaveBeenCalled();
      });
    });
  });

  describe('getPubTree', () => {
    describe('when called with a pubId', () => {
      const pubId = 'W1';

      describe('but the publication repo returns nothing', () => {
        beforeEach(() => {
          publicationRepositoryMock.findPublication.mockReturnValue(null);
        });

        it('returns null', () => {
          expect(citationGraphService.getPubTree(provider, pubId)).toBeNull();
        });
      });

      describe('but the publication repo throws', () => {
        beforeEach(() => {
          publicationRepositoryMock.findPublication.mockImplementation(() => {
            throw new Error('error-1');
          });
        });

        it('propagates the error', () => {
          expect(() =>
            citationGraphService.getPubTree(provider, pubId)).toThrow('error-1');
        });
      });

      describe('and the publication repo returns the paper', () => {
        beforeEach(() => {
          publicationRepositoryMock.findPublication.mockReturnValue({
            provider: provider,
            pubId: pubId,
            title: 'W1',
          });
        });

        describe('but the citation repo throws', () => {
          beforeEach(() => {
            citationRepositoryMock.findCitations.mockImplementation(() => {
              throw new Error('error-2');
            });
          });

          it('propagates the error', () => {
            expect(() =>
              citationGraphService.getPubTree(provider, pubId))
              .toThrow('error-2');
          });
        });

        describe('and the citation repo returns no citations', () => {
          beforeEach(() => {
            citationRepositoryMock.findCitations.mockReturnValue([]);
          });

          it('rebuilds the paper with no citations', () => {
            expect(citationGraphService.getPubTree(provider, pubId)).toEqual({
              publication: {
                provider: provider,
                pubId: pubId,
                title: 'W1',
                contributions: [],
              },
              citations: [],
            });
          });

          describe('but the contribution repo throws', () => {
            beforeEach(() => {
              contributionRepositoryMock.findContributions
                .mockImplementation(() => {
                  throw new Error('error-3');
                });
            });

            it('propagates the error', () => {
              expect(() =>
                citationGraphService.getPubTree(provider, pubId))
                .toThrow('error-3');
            });
          });

          describe('and the contribution repo returns contributions', () => {
            beforeEach(() => {
              contributionRepositoryMock.findContributions.mockReturnValue([
                {
                  provider: provider,
                  pubId: pubId,
                  authorId: 'A1',
                  position: 1,
                },
              ]);
            });

            it('attaches them to the paper', () => {
              expect(citationGraphService.getPubTree(provider, pubId)
                .publication.contributions).toEqual([
                {
                  provider: provider,
                  pubId: pubId,
                  authorId: 'A1',
                  position: 1,
                },
              ]);
            });
          });
        });

        describe('and the citation repo returns citations', () => {
          beforeEach(() => {
            citationRepositoryMock.findCitations.mockReturnValue([
              {
                provider: provider,
                sourcePubId: 'W2',
                targetPubId: pubId,
                classification: 'self-direct',
              },
            ]);
            publicationRepositoryMock.findPublications.mockReturnValue([
              {
                provider: provider,
                pubId: 'W2',
                title: 'W2',
              },
            ]);
          });

          it('rebuilds each citation with its classification', () => {
            expect(citationGraphService.getPubTree(provider, pubId).citations)
              .toEqual([
                {
                  publication: {
                    provider: provider,
                    pubId: 'W2',
                    title: 'W2',
                    contributions: [],
                  },
                  classification: 'self-direct',
                },
              ]);
          });

          describe('but the citing-publication repo throws', () => {
            beforeEach(() => {
              publicationRepositoryMock.findPublications
                .mockImplementation(() => {
                  throw new Error('error-4');
                });
            });

            it('propagates the error', () => {
              expect(() =>
                citationGraphService.getPubTree(provider, pubId))
                .toThrow('error-4');
            });
          });

          describe('and the contribution repo returns contributions', () => {
            beforeEach(() => {
              contributionRepositoryMock.findContributions.mockReturnValue([
                {
                  provider: provider,
                  pubId: pubId,
                  authorId: 'A1',
                  position: 1,
                },
                {
                  provider: provider,
                  pubId: 'W2',
                  authorId: 'A2',
                  position: 1,
                },
              ]);
            });

            it('attaches each publication its own contributions', () => {
              const tree = citationGraphService.getPubTree(provider, pubId);

              expect(tree.publication.contributions).toEqual([
                {
                  provider: provider,
                  pubId: pubId,
                  authorId: 'A1',
                  position: 1,
                },
              ]);
              expect(tree.citations[0].publication.contributions).toEqual([
                {
                  provider: provider,
                  pubId: 'W2',
                  authorId: 'A2',
                  position: 1,
                },
              ]);
            });
          });
        });
      });
    });
  });

  // getAuthorTree's own collaborators are the author repo and the contribution
  // repo (for the author's pubIds); the per-publication reconstruction is
  // getPubTree, branched in its own describe above.
  describe('getAuthorTree', () => {
    describe('when called with an authorId', () => {
      const authorId = 'A1';

      describe('but the author repo returns nothing', () => {
        beforeEach(() => {
          authorRepositoryMock.findAuthor.mockReturnValue(null);
        });

        it('returns null', () => {
          expect(citationGraphService.getAuthorTree(provider, authorId))
            .toBeNull();
        });
      });

      describe('but the author repo throws', () => {
        beforeEach(() => {
          authorRepositoryMock.findAuthor.mockImplementation(() => {
            throw new Error('error-5');
          });
        });

        it('propagates the error', () => {
          expect(() =>
            citationGraphService.getAuthorTree(provider, authorId))
            .toThrow('error-5');
        });
      });

      describe('and the author repo returns the author', () => {
        beforeEach(() => {
          authorRepositoryMock.findAuthor.mockReturnValue({
            provider: provider,
            authorId: authorId,
          });
        });

        it('returns the author', () => {
          expect(citationGraphService.getAuthorTree(provider, authorId).author)
            .toEqual({
              provider: provider,
              authorId: authorId,
            });
        });

        describe('but the contribution repo throws', () => {
          beforeEach(() => {
            contributionRepositoryMock.findContributions
              .mockImplementation(() => {
                throw new Error('error-6');
              });
          });

          it('propagates the error', () => {
            expect(() =>
              citationGraphService.getAuthorTree(provider, authorId))
              .toThrow('error-6');
          });
        });

        describe('and the contribution repo returns no contributions', () => {
          beforeEach(() => {
            contributionRepositoryMock.findContributions.mockReturnValue([]);
          });

          it('returns the author with no publications', () => {
            expect(citationGraphService.getAuthorTree(provider, authorId)
              .publications).toEqual([]);
          });
        });

        describe('and the contribution repo returns the author publications', () => {
          beforeEach(() => {
            contributionRepositoryMock.findContributions
              .mockReturnValue([{ pubId: 'W1' }, { pubId: 'W2' }]);
            publicationRepositoryMock.findPublication
              .mockImplementation((filters) => {
                return {
                  provider: provider,
                  pubId: filters.pubId,
                };
              });
          });

          it('rebuilds a tree per publication', () => {
            expect(citationGraphService.getAuthorTree(provider, authorId)
              .publications.map((entry) =>
                entry.publication.pubId)).toEqual(['W1', 'W2']);
          });
        });
      });
    });
  });
});
