import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { AuthorController } from '../AuthorController.js';

describe('AuthorController', () => {
  let authorServiceMock;
  let citationGraphServiceMock;
  let classificationServiceMock;
  let metricsServiceMock;

  let controller;

  beforeEach(() => {
    authorServiceMock = {
      getPublications: jest.fn(),
    };
    metricsServiceMock = {
      getAuthorMetrics: jest.fn(),
    };
    citationGraphServiceMock = {
      getAuthorTree: jest.fn(),
    };
    classificationServiceMock = {
      getMetrics: jest.fn(),
    };
    controller = new AuthorController([
      {
        id: 'openalex',
        authorService: authorServiceMock,
        metricsService: metricsServiceMock,
        citationGraphService: citationGraphServiceMock,
        classificationService: classificationServiceMock,
      },
    ]);
  });

  describe('getAuthorPapers', () => {
    describe('when provider is unknown', () => {
      const request = {
        params: {
          provider: 'unknown',
          authorId: 'A1',
        },
      };

      it('is a 404', async () => {
        await expect(controller.getAuthorPapers(request)).rejects.toThrow('unknown provider');
      });
    });

    describe('when provider is known', () => {
      const request = {
        params: {
          provider: 'openalex',
          authorId: 'A1',
        },
      };

      describe('and the author service returns publications', () => {
        beforeEach(() => {
          authorServiceMock.getPublications.mockResolvedValue({
            publications: [{ pubId: 'W1' }],
          });
        });

        it('returns the papers', async () => {
          expect(await controller.getAuthorPapers(request)).toEqual({
            papers: [{ pubId: 'W1' }],
          });
        });
      });

      describe('but the author service returns nothing', () => {
        beforeEach(() => {
          authorServiceMock.getPublications.mockResolvedValue(null);
        });

        it('is a 404', async () => {
          await expect(controller.getAuthorPapers(request))
            .rejects.toThrow('author not found');
        });
      });

      describe('but the author service rejects', () => {
        beforeEach(() => {
          authorServiceMock.getPublications.mockRejectedValue(new Error('error-1'));
        });

        it('propagates the error', async () => {
          await expect(controller.getAuthorPapers(request))
            .rejects.toThrow('error-1');
        });
      });
    });
  });

  describe('getStoredMetrics', () => {
    describe('when provider is unknown', () => {
      const request = {
        params: {
          provider: 'unknown',
          authorId: 'A1',
        },
      };

      it('is a 404', () => {
        expect(() =>
          controller.getStoredMetrics(request))
          .toThrow('unknown provider: unknown');
      });
    });

    describe('when provider is known', () => {
      const request = {
        params: {
          provider: 'openalex',
          authorId: 'A1',
        },
      };

      describe('and citation graph returns author tree', () => {
        const tree = {
          author: { authorId: 'A1' },
          publications: [
            {
              citations: [{ classification: 'external' }],
            },
          ],
        };

        beforeEach(() => {
          citationGraphServiceMock.getAuthorTree.mockReturnValue(tree);
        });

        describe('and classification returns metrics', () => {
          beforeEach(() => {
            classificationServiceMock.getMetrics.mockReturnValue({ total: 1 });
          });

          it('aggregates citation classifications', () => {
            controller.getStoredMetrics(request);

            expect(classificationServiceMock.getMetrics)
              .toHaveBeenCalledWith(['external']);
          });

          it('returns author, metrics, and publications', () => {
            expect(controller.getStoredMetrics(request)).toEqual({
              author: { authorId: 'A1' },
              metrics: { total: 1 },
              publications: [
                {
                  citations: [{ classification: 'external' }],
                },
              ],
            });
          });
        });

        describe('but classification throws', () => {
          beforeEach(() => {
            classificationServiceMock.getMetrics.mockImplementation(() => {
              throw new Error('error-6');
            });
          });

          it('propagates the error', () => {
            expect(() =>
              controller.getStoredMetrics(request)).toThrow('error-6');
          });
        });
      });

      describe('but citation graph returns nothing', () => {
        beforeEach(() => {
          citationGraphServiceMock.getAuthorTree.mockReturnValue(null);
        });

        it('is a 404', () => {
          expect(() =>
            controller.getStoredMetrics(request))
            .toThrow('no stored metrics for this author');
        });
      });

      describe('but citation graph throws', () => {
        beforeEach(() => {
          citationGraphServiceMock.getAuthorTree.mockImplementation(() => {
            throw new Error('error-5');
          });
        });

        it('propagates the error', () => {
          expect(() =>
            controller.getStoredMetrics(request)).toThrow('error-5');
        });
      });
    });
  });
});
