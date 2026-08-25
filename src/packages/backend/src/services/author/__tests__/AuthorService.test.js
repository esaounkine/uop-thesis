import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AuthorService } from '../AuthorService.js';

const author1 = {
  authorId: 'A1',
  originalName: 'A1',
  normalisedName: 'a1',
};

const author2 = {
  authorId: 'A2',
  originalName: 'A2',
  normalisedName: 'a2',
};

const pub1 = {
  pubId: 'W1',
  title: 'W1',
  normalisedTitle: 'w1',
  externalId: null,
};

const pub2 = {
  pubId: 'W2',
  title: 'W2',
  normalisedTitle: 'w2',
  externalId: null,
};

describe('AuthorService', () => {
  let connectorMock;
  let authorService;

  beforeEach(() => {
    connectorMock = {
      searchAuthors: jest.fn(),
      getAuthorById: jest.fn(),
      getAuthorPublications: jest.fn(),
    };
    authorService = new AuthorService({
      connector: connectorMock,
    });
  });

  describe('searchByName', () => {
    describe('when the connector returns', () => {
      beforeEach(() => {
        connectorMock.searchAuthors
          .mockResolvedValue([author1, author2]);
      });

      it('returns the candidate authors', async () => {
        expect(await authorService.searchByName('jane'))
          .toEqual([author1, author2]);
      });
    });

    describe('when the connector rejects', () => {
      beforeEach(() => {
        connectorMock.searchAuthors.mockRejectedValue(new Error('error-1'));
      });

      it('propagates the error', async () => {
        await expect(authorService.searchByName('jane'))
          .rejects.toThrow('error-1');
      });
    });
  });

  describe('getPublications', () => {
    describe('when the connector returns no results', () => {
      beforeEach(() => {
        connectorMock.getAuthorById.mockResolvedValue(null);
      });

      it('returns null', async () => {
        expect(await authorService.getPublications('missing')).toBeNull();
      });

      it('does not fetch publications', async () => {
        await authorService.getPublications('missing');

        expect(connectorMock.getAuthorPublications).not.toHaveBeenCalled();
      });
    });

    describe('when the connector rejects', () => {
      beforeEach(() => {
        connectorMock.getAuthorById.mockRejectedValue(new Error('error-2'));
      });

      it('propagates the error', async () => {
        await expect(authorService.getPublications('A1'))
          .rejects.toThrow('error-2');
      });
    });

    describe('when the connector returns results', () => {
      beforeEach(() => {
        connectorMock.getAuthorById
          .mockResolvedValue(author1);
      });

      describe('and the publications fetch succeeds', () => {
        const publications = [pub1, pub2];

        beforeEach(() => {
          connectorMock.getAuthorPublications
            .mockResolvedValue(publications);
        });

        it('returns the author', async () => {
          const result = await authorService.getPublications('A1');

          expect(result.author).toEqual(author1);
        });

        it('returns their publications', async () => {
          const result = await authorService.getPublications('A1');

          expect(result.publications).toBe(publications);
        });
      });

      describe('but the publications fetch rejects', () => {
        beforeEach(() => {
          connectorMock.getAuthorPublications
            .mockRejectedValue(new Error('error-3'));
        });

        it('propagates the error', async () => {
          await expect(authorService.getPublications('A1'))
            .rejects.toThrow('error-3');
        });
      });

      describe('and the cache is enabled (default)', () => {
        beforeEach(() => {
          connectorMock.getAuthorPublications.mockResolvedValue([]);
        });

        it('uses the cache for the author fetch', async () => {
          await authorService.getPublications('A1');

          expect(connectorMock.getAuthorById)
            .toHaveBeenCalledWith('A1', { cache: true });
        });

        it('uses the cache for the publications fetch', async () => {
          await authorService.getPublications('A1');

          expect(connectorMock.getAuthorPublications)
            .toHaveBeenCalledWith('A1', { cache: true });
        });
      });

      describe('and the cache is disabled', () => {
        beforeEach(() => {
          connectorMock.getAuthorPublications.mockResolvedValue([]);
        });

        it('forwards the flag to the author fetch', async () => {
          await authorService.getPublications('A1', { cache: false });

          expect(connectorMock.getAuthorById)
            .toHaveBeenCalledWith('A1', { cache: false });
        });

        it('forwards the flag to the publications fetch', async () => {
          await authorService.getPublications('A1', { cache: false });

          expect(connectorMock.getAuthorPublications)
            .toHaveBeenCalledWith('A1', { cache: false });
        });
      });
    });
  });
});
