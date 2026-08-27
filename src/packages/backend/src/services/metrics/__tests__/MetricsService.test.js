import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { MetricsService } from '../MetricsService.js';

const contribution = (authorId, position) => {
  return {
    authorId: authorId,
    position: position,
  };
};

const publication = (pubId) => {
  return {
    pubId: pubId,
    contributions: [contribution('A1', 1)],
  };
};

describe('MetricsService', () => {
  let authorServiceMock;
  let publicationServiceMock;
  let classificationServiceMock;
  let citationGraphServiceMock;
  let metricsService;

  beforeEach(() => {
    authorServiceMock = {
      getProviderPublications: jest.fn(),
    };
    publicationServiceMock = {
      getCitations: jest.fn(),
    };
    classificationServiceMock = {
      getCitationType: jest.fn(),
      getMetrics: jest.fn(),
    };
    citationGraphServiceMock = {
      storePubTree: jest.fn(),
    };
    metricsService = new MetricsService({
      authorService: authorServiceMock,
      publicationService: publicationServiceMock,
      classificationService: classificationServiceMock,
      citationGraphService: citationGraphServiceMock,
    });
  });

  describe('getProviderPublicationMetrics', () => {
    const paper = {
      pubId: 'W1',
      contributions: [contribution('A1', 1)],
    };
    const aggregate = {
      total: 2,
    };

    describe('when the publication service returns citations', () => {
      const citations = [
        {
          pubId: 'W2',
          contributions: [contribution('A1', 1)],
        },
        {
          pubId: 'W3',
          contributions: [contribution('Z1', 1)],
        },
      ];

      beforeEach(() => {
        publicationServiceMock.getCitations.mockResolvedValue(citations);
        classificationServiceMock.getCitationType
          .mockReturnValueOnce('self-direct')
          .mockReturnValueOnce('external');
        classificationServiceMock.getMetrics.mockReturnValue(aggregate);
      });

      it('returns the publication', async () => {
        const result = await metricsService
          .getProviderPublicationMetrics('openalex', paper);

        expect(result.publication).toBe(paper);
      });

      it('compares the cited paper to each citing paper', async () => {
        const { getCitationType } = classificationServiceMock;

        await metricsService.getProviderPublicationMetrics('openalex', paper);

        expect(getCitationType).toHaveBeenNthCalledWith(
          1,
          paper.contributions,
          citations[0].contributions,
        );
        expect(getCitationType).toHaveBeenNthCalledWith(
          2,
          paper.contributions,
          citations[1].contributions,
        );
      });

      it('labels each citation with the classification', async () => {
        const result = await metricsService
          .getProviderPublicationMetrics('openalex', paper);

        expect(result.citations).toEqual([
          {
            publication: citations[0],
            classification: 'self-direct',
          },
          {
            publication: citations[1],
            classification: 'external',
          },
        ]);
      });

      it('aggregates the classifications', async () => {
        await metricsService.getProviderPublicationMetrics('openalex', paper);

        expect(classificationServiceMock.getMetrics)
          .toHaveBeenCalledWith(['self-direct', 'external']);
      });

      it('returns the aggregate', async () => {
        const result = await metricsService
          .getProviderPublicationMetrics('openalex', paper);

        expect(result.metrics).toBe(aggregate);
      });

      describe('and the cache is enabled (default)', () => {
        it('uses the cache for the citations fetch', async () => {
          await metricsService.getProviderPublicationMetrics('openalex', paper);

          expect(publicationServiceMock.getCitations)
            .toHaveBeenCalledWith('openalex', 'W1', { cache: true });
        });
      });

      describe('and the cache is disabled', () => {
        it('skips the cache for the citations fetch', async () => {
          await metricsService
            .getProviderPublicationMetrics('openalex', paper, { cache: false });

          expect(publicationServiceMock.getCitations)
            .toHaveBeenCalledWith('openalex', 'W1', { cache: false });
        });
      });
    });

    describe('when the publication service returns no citations', () => {
      beforeEach(() => {
        publicationServiceMock.getCitations.mockResolvedValue([]);
        classificationServiceMock.getMetrics.mockReturnValue(aggregate);
      });

      it('has no citations', async () => {
        const result = await metricsService
          .getProviderPublicationMetrics('openalex', paper);

        expect(result.citations).toEqual([]);
      });

      it('aggregates an empty classification list', async () => {
        await metricsService.getProviderPublicationMetrics('openalex', paper);

        expect(classificationServiceMock.getMetrics).toHaveBeenCalledWith([]);
      });
    });

    describe('when the publication service rejects', () => {
      beforeEach(() => {
        publicationServiceMock.getCitations
          .mockRejectedValue(new Error('error-1'));
      });

      it('propagates the error', async () => {
        await expect(metricsService.getProviderPublicationMetrics('openalex', paper))
          .rejects.toThrow('error-1');
      });
    });
  });

  describe('getAuthorMetrics', () => {
    describe('when the author service returns nothing', () => {
      beforeEach(() => {
        authorServiceMock.getProviderPublications.mockResolvedValue(null);
      });

      it('returns null', async () => {
        expect(await metricsService.getAuthorMetrics('openalex', 'A1'))
          .toBeNull();
      });
    });

    describe('when the author service rejects', () => {
      beforeEach(() => {
        authorServiceMock.getProviderPublications
          .mockRejectedValue(new Error('error-2'));
      });

      it('propagates the error', async () => {
        await expect(metricsService.getAuthorMetrics('openalex', 'A1'))
          .rejects.toThrow('error-2');
      });
    });

    describe('when the author has no publications', () => {
      beforeEach(() => {
        authorServiceMock.getProviderPublications.mockResolvedValue({
          author: {
            authorId: 'A1',
          },
          publications: [],
        });
      });

      it('reports zero stats', async () => {
        const result = await metricsService.getAuthorMetrics('openalex', 'A1');

        expect(result.stats).toEqual({
          total: 0,
          fetched: 0,
          failed: 0,
        });
      });

      it('persists nothing', async () => {
        await metricsService.getAuthorMetrics('openalex', 'A1');

        expect(citationGraphServiceMock.storePubTree).not.toHaveBeenCalled();
      });
    });

    describe('when the author has publications', () => {
      const authorAggregate = {
        total: 3,
      };
      const citationsByPub = {
        W1: [{ pubId: 'W10' }, { pubId: 'W11' }],
        W2: [{ pubId: 'W20' }],
      };

      beforeEach(() => {
        authorServiceMock.getProviderPublications.mockResolvedValue({
          author: {
            authorId: 'A1',
          },
          publications: [publication('W1'), publication('W2')],
        });
      });

      describe('and every paper fetches', () => {
        beforeEach(() => {
          publicationServiceMock.getCitations
            .mockImplementation((providerId, pubId) =>
              Promise.resolve(citationsByPub[pubId]));
          classificationServiceMock.getCitationType.mockReturnValue('external');
          classificationServiceMock.getMetrics.mockReturnValue(authorAggregate);
        });

        it('returns the author', async () => {
          const result = await metricsService
            .getAuthorMetrics('openalex', 'A1');

          expect(result.author).toEqual({
            authorId: 'A1',
          });
        });

        it('aggregates the classifications across papers', async () => {
          await metricsService.getAuthorMetrics('openalex', 'A1');

          expect(classificationServiceMock.getMetrics)
            .toHaveBeenCalledWith([
              'external',
              'external',
              'external',
            ]);
        });

        it('returns the aggregate', async () => {
          const result = await metricsService
            .getAuthorMetrics('openalex', 'A1');

          expect(result.metrics).toBe(authorAggregate);
        });

        it('reports the fetch stats', async () => {
          const result = await metricsService
            .getAuthorMetrics('openalex', 'A1');

          expect(result.stats).toEqual({
            total: 2,
            fetched: 2,
            failed: 0,
          });
        });

        it('persists each paper graph under the provider', async () => {
          await metricsService.getAuthorMetrics('openalex', 'A1');

          expect(citationGraphServiceMock.storePubTree)
            .toHaveBeenCalledTimes(2);
          expect(citationGraphServiceMock.storePubTree)
            .toHaveBeenCalledWith('openalex', expect.anything());
        });
      });

      describe('but a paper fails to fetch', () => {
        beforeEach(() => {
          publicationServiceMock.getCitations
            .mockImplementation((providerId, pubId) => {
              if (pubId === 'W2') {
                return Promise.reject(new Error('error-3'));
              }

              return Promise.resolve(citationsByPub[pubId]);
            });
        });

        it('counts the failure and keeps the rest', async () => {
          const result = await metricsService
            .getAuthorMetrics('openalex', 'A1');

          expect(result.stats).toEqual({
            total: 2,
            fetched: 1,
            failed: 1,
          });
        });
      });

      describe('but persisting a paper fails', () => {
        beforeEach(() => {
          publicationServiceMock.getCitations.mockResolvedValue([]);
          citationGraphServiceMock.storePubTree.mockImplementation(() => {
            throw new Error('error-4');
          });
        });

        it('propagates the error', async () => {
          await expect(metricsService.getAuthorMetrics('openalex', 'A1'))
            .rejects.toThrow('error-4');
        });
      });

      describe('and the cache is enabled (default)', () => {
        beforeEach(() => {
          publicationServiceMock.getCitations.mockResolvedValue([]);
        });

        it('uses the cache for the author fetch', async () => {
          await metricsService.getAuthorMetrics('openalex', 'A1');

          expect(authorServiceMock.getProviderPublications)
            .toHaveBeenCalledWith('openalex', 'A1', { cache: true });
        });

        it('uses the cache for the citations fetch', async () => {
          await metricsService.getAuthorMetrics('openalex', 'A1');

          expect(publicationServiceMock.getCitations)
            .toHaveBeenCalledWith('openalex', 'W1', { cache: true });
        });
      });

      describe('and the cache is disabled', () => {
        beforeEach(() => {
          publicationServiceMock.getCitations.mockResolvedValue([]);
        });

        it('forwards the flag to the author fetch', async () => {
          await metricsService
            .getAuthorMetrics('openalex', 'A1', { cache: false });

          expect(authorServiceMock.getProviderPublications)
            .toHaveBeenCalledWith('openalex', 'A1', { cache: false });
        });

        it('forwards the flag to the citations fetch', async () => {
          await metricsService
            .getAuthorMetrics('openalex', 'A1', { cache: false });

          expect(publicationServiceMock.getCitations)
            .toHaveBeenCalledWith('openalex', 'W1', { cache: false });
        });
      });
    });
  });
});
