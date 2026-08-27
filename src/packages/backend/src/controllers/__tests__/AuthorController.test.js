import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { AuthorController } from '../AuthorController.js';

const request = {
  params: {
    provider: 'openalex',
    authorId: 'A1',
  },
};

describe('AuthorController', () => {
  let authorServiceMock;
  let citationGraphServiceMock;
  let classificationServiceMock;
  let controller;

  beforeEach(() => {
    authorServiceMock = {
      getProviderPublications: jest.fn(),
    };
    citationGraphServiceMock = {
      getAuthorTree: jest.fn(),
    };
    classificationServiceMock = {
      getMetrics: jest.fn(),
    };
    controller = new AuthorController(
      authorServiceMock,
      citationGraphServiceMock,
      classificationServiceMock,
    );
  });

  describe('getAuthorPapers', () => {
    describe('when the author service returns publications', () => {
      beforeEach(() => {
        authorServiceMock.getProviderPublications.mockResolvedValue({
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
        authorServiceMock.getProviderPublications.mockResolvedValue(null);
      });

      it('is a 404', async () => {
        await expect(controller.getAuthorPapers(request))
          .rejects.toThrow('author not found');
      });
    });

    describe('but the author service rejects', () => {
      beforeEach(() => {
        authorServiceMock.getProviderPublications.mockRejectedValue(new Error('error-1'));
      });

      it('propagates the error', async () => {
        await expect(controller.getAuthorPapers(request))
          .rejects.toThrow('error-1');
      });
    });
  });

  describe('getStoredMetrics', () => {
    describe('when the citation graph returns the author tree', () => {
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
            throw new Error('error-2');
          });
        });

        it('propagates the error', () => {
          expect(() =>
            controller.getStoredMetrics(request)).toThrow('error-2');
        });
      });
    });

    describe('but the citation graph returns nothing', () => {
      beforeEach(() => {
        citationGraphServiceMock.getAuthorTree.mockReturnValue(null);
      });

      it('is a 404', () => {
        expect(() =>
          controller.getStoredMetrics(request)).toThrow('no stored metrics');
      });
    });

    describe('but the citation graph throws', () => {
      beforeEach(() => {
        citationGraphServiceMock.getAuthorTree.mockImplementation(() => {
          throw new Error('error-3');
        });
      });

      it('propagates the error', () => {
        expect(() =>
          controller.getStoredMetrics(request)).toThrow('error-3');
      });
    });
  });
});
