import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { ClassificationService } from '../ClassificationService.js';

const contribution = (authorId, position) => {
  return {
    pubId: 'X',
    authorId: authorId,
    position: position,
  };
};

describe('ClassificationService', () => {
  let service;

  beforeEach(() => {
    service = new ClassificationService();
  });

  describe('classifyCitation', () => {
    describe('when the papers share no author', () => {
      let label;

      beforeEach(() => {
        label = service.classifyCitation(
          [contribution('A1', 1)],
          [contribution('B1', 1)],
        );
      });

      it('is external', () => {
        expect(label).toBe('external');
      });
    });

    describe('when both lead authors are the same', () => {
      let label;

      beforeEach(() => {
        label = service.classifyCitation(
          [contribution('A1', 1), contribution('A2', 2)],
          [contribution('A1', 1), contribution('C1', 2)],
        );
      });

      it('is a direct self citation', () => {
        expect(label).toBe('self-direct');
      });
    });

    describe('when the cited lead is a co-author of the citing paper', () => {
      let label;

      beforeEach(() => {
        label = service.classifyCitation(
          [contribution('A1', 1)],
          [contribution('C1', 1), contribution('A1', 2)],
        );
      });

      it('is a co-author self citation', () => {
        expect(label).toBe('self-coauthor');
      });
    });

    describe('when only a non-lead author is shared', () => {
      let label;

      beforeEach(() => {
        label = service.classifyCitation(
          [contribution('A1', 1), contribution('B1', 2)],
          [contribution('C1', 1), contribution('B1', 2)],
        );
      });

      it('is a co-author self citation', () => {
        expect(label).toBe('self-coauthor');
      });
    });
  });

  describe('classify', () => {
    describe('when the citing papers are mixed', () => {
      let metrics;

      beforeEach(() => {
        const cited = [contribution('A1', 1), contribution('A2', 2)];

        metrics = service.classify(cited, [
          [contribution('A1', 1)], // direct
          [contribution('C1', 1), contribution('A1', 2)], // coauthor
          [contribution('Z1', 1)], // external
        ]);
      });

      it('counts the total', () => {
        expect(metrics.total).toBe(3);
      });

      it('counts the external citations', () => {
        expect(metrics.external).toBe(1);
      });

      it('counts the self citations', () => {
        expect(metrics.self.total).toBe(2);
      });

      it('counts the direct self citations', () => {
        expect(metrics.self.direct).toBe(1);
      });

      it('counts the co-author self citations', () => {
        expect(metrics.self.coauthor).toBe(1);
      });
    });
  });

  describe('getPublicationMetrics', () => {
    let result;

    beforeEach(async () => {
      const publication = {
        pubId: 'W1',
        contributions: [contribution('A1', 1), contribution('A2', 2)],
      };
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
      result = await new ClassificationService({
        publicationService: publicationServiceMock,
      }).getPublicationMetrics(publication);
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
    const publication = (pubId) => {
      return {
        pubId: pubId,
        contributions: [contribution('A1', 1)],
      };
    };

    describe('when the author exists', () => {
      let result;

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
        const publicationServiceMock = {
          getCitations: jest.fn(async (pubId) =>
            citationsByPub[pubId]),
        };
        const authorServiceMock = {
          getPublications: jest.fn().mockResolvedValue({
            author: { authorId: 'A1' },
            publications: [publication('W1'), publication('W2')],
          }),
        };
        result = await new ClassificationService({
          publicationService: publicationServiceMock,
          authorService: authorServiceMock,
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
    });

    describe('when some papers fail to fetch', () => {
      let result;

      beforeEach(async () => {
        const publicationServiceMock = {
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
        };
        const authorServiceMock = {
          getPublications: jest.fn().mockResolvedValue({
            author: { authorId: 'A1' },
            publications: [publication('W1'), publication('W2')],
          }),
        };
        result = await new ClassificationService({
          publicationService: publicationServiceMock,
          authorService: authorServiceMock,
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

    describe('when the author is not found', () => {
      let result;

      beforeEach(async () => {
        const authorServiceMock = {
          getPublications: jest.fn().mockResolvedValue(null),
        };
        result = await new ClassificationService({
          authorService: authorServiceMock,
        }).getAuthorMetrics('missing');
      });

      it('returns null', () => {
        expect(result).toBeNull();
      });
    });
  });
});
