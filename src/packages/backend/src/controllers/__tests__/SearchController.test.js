import {
  beforeEach, describe, expect, it, jest,
} from '@jest/globals';
import { SearchController } from '../SearchController.js';

describe('SearchController', () => {
  let authorServiceMock;
  let controller;

  beforeEach(() => {
    authorServiceMock = {
      searchByName: jest.fn(),
    };
    controller = new SearchController(authorServiceMock);
  });

  describe('searchAuthors', () => {
    describe('when no query term is provided', () => {
      it('is a 400', async () => {
        await expect(controller.searchAuthors({ query: {} }))
          .rejects.toThrow('missing query parameter q');
      });
    });

    describe('when a query term is provided', () => {
      describe('and the author service returns results', () => {
        const results = [
          {
            provider: 'openalex',
            authors: [],
          },
        ];

        beforeEach(() => {
          authorServiceMock.searchByName.mockResolvedValue(results);
        });

        it('returns them', async () => {
          expect(await controller.searchAuthors({ query: { q: 'roe' } }))
            .toBe(results);
        });

        it('searches by the query term', async () => {
          await controller.searchAuthors({ query: { q: 'roe' } });
          expect(authorServiceMock.searchByName).toHaveBeenCalledWith('roe');
        });
      });

      describe('but the author service rejects', () => {
        beforeEach(() => {
          authorServiceMock.searchByName.mockRejectedValue(new Error('error-1'));
        });

        it('propagates the error', async () => {
          await expect(controller.searchAuthors({ query: { q: 'roe' } }))
            .rejects.toThrow('error-1');
        });
      });
    });
  });
});
