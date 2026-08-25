import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { AuthorController } from '../AuthorController.js';

describe('AuthorController', () => {
  let authorServiceMock;
  let controller;

  beforeEach(() => {
    authorServiceMock = {
      getPublications: jest.fn(),
    };
    controller = new AuthorController([
      {
        id: 'openalex',
        authorService: authorServiceMock,
      },
    ]);
  });

  describe('getAuthorPapers', () => {
    const request = {
      params: {
        provider: 'openalex',
        authorId: 'A1',
      },
    };

    describe('when the provider is unknown', () => {
      it('is a 404', async () => {
        await expect(controller.getAuthorPapers({
          params: {
            provider: 'nope',
            authorId: 'A1',
          },
        })).rejects.toThrow('unknown provider');
      });
    });

    describe('when the provider is known', () => {
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
});
