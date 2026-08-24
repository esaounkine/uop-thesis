import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { ClassificationService } from '../../classification/ClassificationService.js';
import { MetricsService } from '../MetricsService.js';

const contribution = (authorId, position) => {
  return {
    pubId: 'X',
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

const createService = ({
  authorServiceMock, publicationServiceMock, citationGraphMock,
}) =>
  new MetricsService({
    authorService: authorServiceMock,
    publicationService: publicationServiceMock,
    classificationService: new ClassificationService(),
    citationGraphService: citationGraphMock,
  });

describe('MetricsService', () => {
  describe('getPublicationMetrics', () => {
    let result;

    beforeEach(async () => {
      const publicationServiceMock = {
        getCitations: jest.fn().mockResolvedValue([
          {
            pubId: 'W2',
            contributions: [contribution('A1', 1)], // direct
          },
          {
            pubId: 'W3',
            contributions: [contribution('C1', 1), contribution('A1', 2)], // co-author
          },
          {
            pubId: 'W4',
            contributions: [contribution('Z1', 1)], // external
          },
        ]),
      };
      result = await createService({
        publicationServiceMock: publicationServiceMock,
      }).getPublicationMetrics({
        pubId: 'W1',
        contributions: [contribution('A1', 1), contribution('A2', 2)],
      });
    });

    it('returns the publication', () => {
      expect(result.publication.pubId).toBe('W1');
    });

    it('aggregates the metrics', () => {
      expect(result.metrics).toEqual({
        total: 3,
        external: 1,
        self: {
          total: 2,
          direct: 1,
          coauthor: 1,
        },
      });
    });

    it('labels each citation for the debug details', () => {
      expect(result.citations.map((entry) =>
        [entry.publication.pubId, entry.classification])).toEqual([
        ['W2', 'self-direct'],
        ['W3', 'self-coauthor'],
        ['W4', 'external'],
      ]);
    });
  });

  describe('getAuthorMetrics', () => {
    describe('when the author exists', () => {
      let result;
      let citationGraphMock;

      beforeEach(async () => {
        const citationsByPub = {
          W1: [
            {
              pubId: 'W10',
              contributions: [contribution('A1', 1)], // direct
            },
            {
              pubId: 'W11',
              contributions: [contribution('Z1', 1)], // external
            },
          ],
          W2: [
            {
              pubId: 'W20',
              contributions: [contribution('C1', 1), contribution('A1', 2)], // co-author
            },
          ],
        };
        citationGraphMock = { save: jest.fn() };
        result = await createService({
          publicationServiceMock: {
            getCitations: jest.fn(async (pubId) =>
              citationsByPub[pubId]),
          },
          authorServiceMock: {
            getPublications: jest.fn().mockResolvedValue({
              author: { authorId: 'A1' },
              publications: [publication('W1'), publication('W2')],
            }),
          },
          citationGraphMock: citationGraphMock,
        }).getAuthorMetrics('A1');
      });

      it('returns the author', () => {
        expect(result.author.authorId).toBe('A1');
      });

      it('aggregates the metrics across all their papers', () => {
        expect(result.metrics).toEqual({
          total: 3,
          external: 1,
          self: {
            total: 2,
            direct: 1,
            coauthor: 1,
          },
        });
      });

      it('keeps the per-paper metrics for the debug details', () => {
        expect(result.publications.map((entry) =>
          entry.publication.pubId)).toEqual(['W1', 'W2']);
      });

      it('reports the fetch stats', () => {
        expect(result.stats).toEqual({
          total: 2,
          fetched: 2,
          failed: 0,
        });
      });

      it('persists each classified publication graph', () => {
        expect(citationGraphMock.save).toHaveBeenCalledTimes(2);
      });
    });

    describe('when some papers fail to fetch', () => {
      let result;

      beforeEach(async () => {
        result = await createService({
          publicationServiceMock: {
            getCitations: jest.fn(async (pubId) => {
              if (pubId === 'W2') {
                throw new Error('rate limited');
              }

              return [
                {
                  pubId: 'W10',
                  contributions: [contribution('A1', 1)], // direct
                },
              ];
            }),
          },
          authorServiceMock: {
            getPublications: jest.fn().mockResolvedValue({
              author: { authorId: 'A1' },
              publications: [publication('W1'), publication('W2')],
            }),
          },
        }).getAuthorMetrics('A1');
      });

      it('skips the failed paper and counts it', () => {
        expect(result.stats).toEqual({
          total: 2,
          fetched: 1,
          failed: 1,
        });
      });

      it('aggregates over the papers it could fetch', () => {
        expect(result.metrics.total).toBe(1);
      });
    });

    describe('when cache is disabled', () => {
      let authorServiceMock;
      let publicationServiceMock;

      beforeEach(async () => {
        authorServiceMock = {
          getPublications: jest.fn().mockResolvedValue({
            author: { authorId: 'A1' },
            publications: [publication('W1')],
          }),
        };
        publicationServiceMock = {
          getCitations: jest.fn().mockResolvedValue([]),
        };
        await createService({
          authorServiceMock: authorServiceMock,
          publicationServiceMock: publicationServiceMock,
        }).getAuthorMetrics('A1', { cache: false });
      });

      it('forwards the flag to the publications fetch', () => {
        expect(authorServiceMock.getPublications).toHaveBeenCalledWith('A1', { cache: false });
      });

      it('forwards the flag to the citations fetch', () => {
        expect(publicationServiceMock.getCitations).toHaveBeenCalledWith('W1', { cache: false });
      });
    });

    describe('when the author is not found', () => {
      let result;

      beforeEach(async () => {
        result = await createService({
          authorServiceMock: {
            getPublications: jest.fn().mockResolvedValue(null),
          },
        }).getAuthorMetrics('missing');
      });

      it('returns null', () => {
        expect(result).toBeNull();
      });
    });
  });
});
